// @ts-nocheck
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@/config/database';
import { CommissionStatus, CommissionType, CpaValidationModel } from '@prisma/client';
import { CommissionService } from '@/services/commission';

interface CreateCommissionBody {
  transactionId?: string;
  affiliateId: string;
  type: CommissionType;
  level: number;
  percentage?: number;
  amount: number;
  metadata?: any;
}

interface UpdateCommissionBody {
  status?: CommissionStatus;
  metadata?: any;
}

interface CommissionFilters {
  status?: CommissionStatus;
  type?: CommissionType;
  level?: number;
  dateFrom?: string;
  dateTo?: string;
  affiliateId?: string;
  page?: number;
  limit?: number;
}

interface CreateCommissionRequest extends FastifyRequest {
  Body: CreateCommissionBody;
}

interface UpdateCommissionRequest extends FastifyRequest {
  Params: { id: string };
  Body: UpdateCommissionBody;
}

interface GetCommissionRequest extends FastifyRequest {
  Params: { id: string };
}

interface ListCommissionsRequest extends FastifyRequest {
  Querystring: CommissionFilters;
}

interface CalculateRevShareRequest extends FastifyRequest {
  Body: { transactionId: string };
}

interface ProcessCpaRequest extends FastifyRequest {
  Body: { referralId: string };
}

interface UpdateCpaModelRequest extends FastifyRequest {
  Body: { model: CpaValidationModel };
}

export class CommissionsController {
  /**
   * Lista comissões com filtros e paginação
   */
  static async list(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      // Buscar afiliado do usuário
      const affiliate = await prisma.affiliate.findFirst({
        where: { userId }
      });

      if (!affiliate) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'AFFILIATE_NOT_FOUND',
            message: 'Afiliado não encontrado'
          }
        });
      }

      const { 
        status, 
        type,
        level, 
        dateFrom, 
        dateTo, 
        affiliateId,
        page = 1, 
        limit = 20 
      } = request.query;

      // Construir filtros
      const where: any = {
        affiliateId: affiliateId || affiliate.id
      };

      if (status) {
        where.status = status;
      }

      if (type) {
        where.type = type;
      }

      if (level) {
        where.level = parseInt(level);
      }

      if (dateFrom || dateTo) {
        where.calculatedAt = {};
        if (dateFrom) {
          where.calculatedAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.calculatedAt.lte = new Date(dateTo);
        }
      }

      // Calcular offset
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Buscar comissões
      const [commissions, total] = await Promise.all([
        prisma.commission.findMany({
          where,
          include: {
            transaction: {
              select: {
                id: true,
                externalId: true,
                type: true,
                amount: true,
                currency: true,
                description: true,
                createdAt: true
              }
            },
            affiliate: {
              select: {
                id: true,
                referralCode: true,
                validatedReferrals: true,
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: { calculatedAt: 'desc' },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.commission.count({ where })
      ]);

      // Calcular estatísticas
      const stats = await prisma.commission.aggregate({
        where,
        _sum: {
          amount: true
        },
        _count: {
          _all: true
        }
      });

      // Calcular categoria e level atual do afiliado
      const categoryInfo = CommissionService.calculateCategoryAndLevel(affiliate.validatedReferrals);

      return reply.send({
        success: true,
        data: {
          commissions: commissions.map(commission => ({
            id: commission.id,
            transactionId: commission.transactionId,
            type: commission.type,
            level: commission.level,
            percentage: commission.percentage ? Number(commission.percentage) : null,
            amount: Number(commission.amount),
            status: commission.status,
            calculatedAt: commission.calculatedAt,
            approvedAt: commission.approvedAt,
            paidAt: commission.paidAt,
            metadata: commission.metadata,
            transaction: commission.transaction ? {
              ...commission.transaction,
              amount: Number(commission.transaction.amount)
            } : null,
            affiliate: {
              ...commission.affiliate,
              category: CommissionService.calculateCategoryAndLevel(commission.affiliate.validatedReferrals).category,
              level: CommissionService.calculateCategoryAndLevel(commission.affiliate.validatedReferrals).level
            }
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          },
          stats: {
            totalAmount: Number(stats._sum.amount || 0),
            totalCommissions: stats._count._all
          },
          affiliateInfo: {
            id: affiliate.id,
            validatedReferrals: affiliate.validatedReferrals,
            category: categoryInfo.category,
            level: categoryInfo.level,
            revLevel1: categoryInfo.revLevel1,
            revLevels2to5: categoryInfo.revLevels2to5,
            negativeCarryover: Number(affiliate.negativeCarryover)
          }
        }
      });

    } catch (error) {
      console.error('Erro ao listar comissões:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  }

  /**
   * Busca uma comissão específica
   */
  static async getById(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      const { id } = request.params;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      // Buscar comissão
      const commission = await prisma.commission.findUnique({
        where: { id },
        include: {
          transaction: {
            select: {
              id: true,
              externalId: true,
              type: true,
              amount: true,
              currency: true,
              description: true,
              createdAt: true
            }
          },
          affiliate: {
            select: {
              id: true,
              referralCode: true,
              validatedReferrals: true,
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!commission) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'COMMISSION_NOT_FOUND',
            message: 'Comissão não encontrada'
          }
        });
      }

      // Verificar se o usuário tem acesso à comissão
      const affiliate = await prisma.affiliate.findFirst({
        where: { userId }
      });

      if (!affiliate || commission.affiliateId !== affiliate.id) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Acesso negado a esta comissão'
          }
        });
      }

      const categoryInfo = CommissionService.calculateCategoryAndLevel(commission.affiliate.validatedReferrals);

      return reply.send({
        success: true,
        data: {
          id: commission.id,
          transactionId: commission.transactionId,
          type: commission.type,
          level: commission.level,
          percentage: commission.percentage ? Number(commission.percentage) : null,
          amount: Number(commission.amount),
          status: commission.status,
          calculatedAt: commission.calculatedAt,
          approvedAt: commission.approvedAt,
          paidAt: commission.paidAt,
          metadata: commission.metadata,
          transaction: commission.transaction ? {
            ...commission.transaction,
            amount: Number(commission.transaction.amount)
          } : null,
          affiliate: {
            ...commission.affiliate,
            category: categoryInfo.category,
            level: categoryInfo.level
          }
        }
      });

    } catch (error) {
      console.error('Erro ao buscar comissão:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  }

  /**
   * Calcula comissões RevShare para uma transação
   */
  static async calculateRevShare(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      const { transactionId } = request.body;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      if (!transactionId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_DATA',
            message: 'ID da transação é obrigatório'
          }
        });
      }

      // Verificar se já existem comissões RevShare para esta transação
      const existingCommissions = await prisma.commission.findMany({
        where: { 
          transactionId,
          type: 'revshare'
        }
      });

      if (existingCommissions.length > 0) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'COMMISSIONS_ALREADY_CALCULATED',
            message: 'Comissões RevShare já foram calculadas para esta transação'
          }
        });
      }

      const commissions = await CommissionService.calculateRevShare(transactionId);

      return reply.status(201).send({
        success: true,
        data: {
          transactionId,
          commissionsCalculated: commissions.length,
          totalCommissionAmount: commissions.reduce((sum, c) => sum + Number(c.amount), 0),
          commissions: commissions.map(c => ({
            id: c.id,
            affiliateId: c.affiliateId,
            type: c.type,
            level: c.level,
            percentage: c.percentage ? Number(c.percentage) : null,
            amount: Number(c.amount),
            status: c.status
          }))
        }
      });

    } catch (error) {
      console.error('Erro ao calcular comissões RevShare:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Erro interno do servidor'
        }
      });
    }
  }

  /**
   * Processa CPA para uma indicação validada
   */
  static async processCpa(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      const { referralId } = request.body;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      if (!referralId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_DATA',
            message: 'ID da indicação é obrigatório'
          }
        });
      }

      // Validar indicação para CPA
      const isValid = await CommissionService.validateReferralForCpa(referralId);
      
      if (!isValid) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'REFERRAL_NOT_VALID',
            message: 'Indicação não atende aos critérios de validação CPA'
          }
        });
      }

      const commissions = await CommissionService.processCpa(referralId);

      return reply.status(201).send({
        success: true,
        data: {
          referralId,
          commissionsCalculated: commissions.length,
          totalCpaAmount: commissions.reduce((sum, c) => sum + Number(c.amount), 0),
          commissions: commissions.map(c => ({
            id: c.id,
            affiliateId: c.affiliateId,
            type: c.type,
            level: c.level,
            amount: Number(c.amount),
            status: c.status
          }))
        }
      });

    } catch (error) {
      console.error('Erro ao processar CPA:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Erro interno do servidor'
        }
      });
    }
  }

  /**
   * Obtém configuração CPA ativa
   */
  static async getCpaConfiguration(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      const config = await CommissionService.getCpaConfiguration();

      return reply.send({
        success: true,
        data: {
          id: config.id,
          activeModel: config.activeModel,
          totalAmount: Number(config.totalAmount),
          distribution: {
            level1: Number(config.level1Amount),
            level2: Number(config.level2Amount),
            level3: Number(config.level3Amount),
            level4: Number(config.level4Amount),
            level5: Number(config.level5Amount)
          },
          validationCriteria: {
            minDeposit: Number(config.minDeposit),
            minBets: config.minBets,
            minGgr: Number(config.minGgr)
          },
          isActive: config.isActive,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        }
      });

    } catch (error) {
      console.error('Erro ao buscar configuração CPA:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  }

  /**
   * Atualiza modelo de validação CPA (apenas admin)
   */
  static async updateCpaValidationModel(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      const { model } = request.body;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      // TODO: Verificar se usuário é admin
      // Por enquanto, permitir para qualquer usuário autenticado

      if (!model || !['model_1_1', 'model_1_2'].includes(model)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_MODEL',
            message: 'Modelo de validação inválido. Use model_1_1 ou model_1_2'
          }
        });
      }

      const config = await CommissionService.updateCpaValidationModel(model);

      return reply.send({
        success: true,
        data: {
          id: config.id,
          activeModel: config.activeModel,
          totalAmount: Number(config.totalAmount),
          distribution: {
            level1: Number(config.level1Amount),
            level2: Number(config.level2Amount),
            level3: Number(config.level3Amount),
            level4: Number(config.level4Amount),
            level5: Number(config.level5Amount)
          },
          validationCriteria: {
            minDeposit: Number(config.minDeposit),
            minBets: config.minBets,
            minGgr: Number(config.minGgr)
          },
          isActive: config.isActive,
          createdAt: config.createdAt
        }
      });

    } catch (error) {
      console.error('Erro ao atualizar modelo CPA:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  }

  /**
   * Aprova uma comissão
   */
  static async approve(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      const { id } = request.params;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      // Buscar comissão
      const commission = await prisma.commission.findUnique({
        where: { id }
      });

      if (!commission) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'COMMISSION_NOT_FOUND',
            message: 'Comissão não encontrada'
          }
        });
      }

      if (commission.status !== 'calculated') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Apenas comissões calculadas podem ser aprovadas'
          }
        });
      }

      // Atualizar status para aprovado
      const updatedCommission = await prisma.commission.update({
        where: { id },
        data: {
          status: 'approved',
          approvedAt: new Date()
        },
        include: {
          affiliate: {
            select: {
              id: true,
              referralCode: true,
              validatedReferrals: true,
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      const categoryInfo = CommissionService.calculateCategoryAndLevel(updatedCommission.affiliate.validatedReferrals);

      return reply.send({
        success: true,
        data: {
          id: updatedCommission.id,
          type: updatedCommission.type,
          status: updatedCommission.status,
          approvedAt: updatedCommission.approvedAt,
          amount: Number(updatedCommission.amount),
          affiliate: {
            ...updatedCommission.affiliate,
            category: categoryInfo.category,
            level: categoryInfo.level
          }
        }
      });

    } catch (error) {
      console.error('Erro ao aprovar comissão:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  }

  /**
   * Marca uma comissão como paga
   */
  static async pay(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      const { id } = request.params;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      // Buscar comissão
      const commission = await prisma.commission.findUnique({
        where: { id }
      });

      if (!commission) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'COMMISSION_NOT_FOUND',
            message: 'Comissão não encontrada'
          }
        });
      }

      if (commission.status !== 'approved') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Apenas comissões aprovadas podem ser pagas'
          }
        });
      }

      // Atualizar status para pago
      const updatedCommission = await prisma.commission.update({
        where: { id },
        data: {
          status: 'paid',
          paidAt: new Date()
        },
        include: {
          affiliate: {
            select: {
              id: true,
              referralCode: true,
              validatedReferrals: true,
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      const categoryInfo = CommissionService.calculateCategoryAndLevel(updatedCommission.affiliate.validatedReferrals);

      return reply.send({
        success: true,
        data: {
          id: updatedCommission.id,
          type: updatedCommission.type,
          status: updatedCommission.status,
          paidAt: updatedCommission.paidAt,
          amount: Number(updatedCommission.amount),
          affiliate: {
            ...updatedCommission.affiliate,
            category: categoryInfo.category,
            level: categoryInfo.level
          }
        }
      });

    } catch (error) {
      console.error('Erro ao marcar comissão como paga:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  }
}

