// @ts-nocheck
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@/config/database';
import { CommissionStatus, AffiliateCategory } from '@prisma/client';

interface CreateCommissionBody {
  transactionId: string;
  affiliateId: string;
  level: number;
  percentage: number;
  amount: number;
  metadata?: any;
}

interface UpdateCommissionBody {
  status?: CommissionStatus;
  metadata?: any;
}

interface CommissionFilters {
  status?: CommissionStatus;
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

interface CalculateCommissionsRequest extends FastifyRequest {
  Body: { transactionId: string };
}

interface PayCommissionRequest extends FastifyRequest {
  Params: { id: string };
}

// Configuração de percentuais por categoria e nível
const COMMISSION_CONFIG = {
  standard: {
    1: 0.05, // 5% nível 1
    2: 0.03, // 3% nível 2
    3: 0.02, // 2% nível 3
    4: 0.01, // 1% nível 4
    5: 0.005 // 0.5% nível 5
  },
  premium: {
    1: 0.07, // 7% nível 1
    2: 0.05, // 5% nível 2
    3: 0.03, // 3% nível 3
    4: 0.02, // 2% nível 4
    5: 0.01  // 1% nível 5
  },
  vip: {
    1: 0.10, // 10% nível 1
    2: 0.07, // 7% nível 2
    3: 0.05, // 5% nível 3
    4: 0.03, // 3% nível 4
    5: 0.02  // 2% nível 5
  },
  diamond: {
    1: 0.15, // 15% nível 1
    2: 0.10, // 10% nível 2
    3: 0.07, // 7% nível 3
    4: 0.05, // 5% nível 4
    5: 0.03  // 3% nível 5
  }
};

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
                category: true,
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

      return reply.send({
        success: true,
        data: {
          commissions: commissions.map(commission => ({
            id: commission.id,
            transactionId: commission.transactionId,
            level: commission.level,
            percentage: Number(commission.percentage),
            amount: Number(commission.amount),
            status: commission.status,
            calculatedAt: commission.calculatedAt,
            approvedAt: commission.approvedAt,
            paidAt: commission.paidAt,
            metadata: commission.metadata,
            transaction: {
              ...commission.transaction,
              amount: Number(commission.transaction.amount)
            },
            affiliate: commission.affiliate
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
              category: true,
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

      return reply.send({
        success: true,
        data: {
          id: commission.id,
          transactionId: commission.transactionId,
          level: commission.level,
          percentage: Number(commission.percentage),
          amount: Number(commission.amount),
          status: commission.status,
          calculatedAt: commission.calculatedAt,
          approvedAt: commission.approvedAt,
          paidAt: commission.paidAt,
          metadata: commission.metadata,
          transaction: {
            ...commission.transaction,
            amount: Number(commission.transaction.amount)
          },
          affiliate: commission.affiliate
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
   * Calcula comissões MLM para uma transação
   */
  static async calculateCommissions(request: any, reply: FastifyReply) {
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

      // Buscar transação
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          affiliate: {
            include: {
              user: true
            }
          }
        }
      });

      if (!transaction) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transação não encontrada'
          }
        });
      }

      // Verificar se já existem comissões para esta transação
      const existingCommissions = await prisma.commission.findMany({
        where: { transactionId }
      });

      if (existingCommissions.length > 0) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'COMMISSIONS_ALREADY_CALCULATED',
            message: 'Comissões já foram calculadas para esta transação'
          }
        });
      }

      // Buscar hierarquia de afiliados (até 5 níveis)
      const commissions = [];
      let currentAffiliate = transaction.affiliate;
      let level = 1;

      while (currentAffiliate && level <= 5) {
        // Obter percentual baseado na categoria do afiliado
        const percentage = COMMISSION_CONFIG[currentAffiliate.category]?.[level] || 0;
        
        if (percentage > 0) {
          const commissionAmount = Number(transaction.amount) * percentage;

          // Criar comissão
          const commission = await prisma.commission.create({
            data: {
              transactionId,
              affiliateId: currentAffiliate.id,
              level,
              percentage: percentage * 100, // Converter para percentual
              amount: commissionAmount,
              status: 'calculated',
              metadata: {
                transactionType: transaction.type,
                affiliateCategory: currentAffiliate.category,
                calculationDate: new Date().toISOString()
              }
            },
            include: {
              affiliate: {
                select: {
                  id: true,
                  referralCode: true,
                  category: true,
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

          commissions.push({
            id: commission.id,
            level: commission.level,
            percentage: Number(commission.percentage),
            amount: Number(commission.amount),
            affiliate: commission.affiliate
          });
        }

        // Buscar próximo nível (afiliado pai)
        if (currentAffiliate.parentId) {
          currentAffiliate = await prisma.affiliate.findUnique({
            where: { id: currentAffiliate.parentId },
            include: {
              user: true
            }
          });
        } else {
          currentAffiliate = null;
        }

        level++;
      }

      return reply.status(201).send({
        success: true,
        data: {
          transactionId,
          transactionAmount: Number(transaction.amount),
          commissionsCalculated: commissions.length,
          totalCommissionAmount: commissions.reduce((sum, c) => sum + c.amount, 0),
          commissions
        }
      });

    } catch (error) {
      console.error('Erro ao calcular comissões:', error);
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

      return reply.send({
        success: true,
        data: {
          id: updatedCommission.id,
          status: updatedCommission.status,
          approvedAt: updatedCommission.approvedAt,
          amount: Number(updatedCommission.amount),
          affiliate: updatedCommission.affiliate
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

      return reply.send({
        success: true,
        data: {
          id: updatedCommission.id,
          status: updatedCommission.status,
          paidAt: updatedCommission.paidAt,
          amount: Number(updatedCommission.amount),
          affiliate: updatedCommission.affiliate
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

  /**
   * Gera relatórios de comissões
   */
  static async getReports(request: any, reply: FastifyReply) {
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

      const { period = 'month' } = request.query;

      // Calcular período
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Relatório por status
      const statusReport = await prisma.commission.groupBy({
        by: ['status'],
        where: {
          affiliateId: affiliate.id,
          calculatedAt: {
            gte: startDate
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          _all: true
        }
      });

      // Relatório por nível
      const levelReport = await prisma.commission.groupBy({
        by: ['level'],
        where: {
          affiliateId: affiliate.id,
          calculatedAt: {
            gte: startDate
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          _all: true
        },
        orderBy: {
          level: 'asc'
        }
      });

      // Tendência diária (últimos 30 dias)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dailyTrend = await prisma.$queryRaw`
        SELECT 
          DATE(calculated_at) as date,
          COUNT(*)::int as count,
          SUM(amount)::float as total_amount
        FROM commissions 
        WHERE affiliate_id = ${affiliate.id}::uuid
          AND calculated_at >= ${thirtyDaysAgo}
        GROUP BY DATE(calculated_at)
        ORDER BY date ASC
      `;

      return reply.send({
        success: true,
        data: {
          period,
          startDate,
          endDate: now,
          summary: {
            totalCommissions: statusReport.reduce((sum, item) => sum + item._count._all, 0),
            totalAmount: statusReport.reduce((sum, item) => sum + Number(item._sum.amount || 0), 0)
          },
          byStatus: statusReport.map(item => ({
            status: item.status,
            count: item._count._all,
            amount: Number(item._sum.amount || 0)
          })),
          byLevel: levelReport.map(item => ({
            level: item.level,
            count: item._count._all,
            amount: Number(item._sum.amount || 0)
          })),
          dailyTrend: dailyTrend.map((item: any) => ({
            date: item.date,
            count: item.count,
            amount: item.total_amount
          }))
        }
      });

    } catch (error) {
      console.error('Erro ao gerar relatórios de comissões:', error);
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

