// @ts-nocheck
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@/config/database';
import { TransactionType, TransactionStatus } from '@prisma/client';

interface CreateTransactionBody {
  externalId?: string;
  customerId?: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: any;
}

interface UpdateTransactionBody {
  status?: TransactionStatus;
  description?: string;
  metadata?: any;
}

interface TransactionFilters {
  type?: TransactionType;
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

interface CreateTransactionRequest extends FastifyRequest {
  Body: CreateTransactionBody;
}

interface UpdateTransactionRequest extends FastifyRequest {
  Params: { id: string };
  Body: UpdateTransactionBody;
}

interface GetTransactionRequest extends FastifyRequest {
  Params: { id: string };
}

interface ListTransactionsRequest extends FastifyRequest {
  Querystring: TransactionFilters;
}

interface ReportsRequest extends FastifyRequest {
  Querystring: { period?: string, type?: string };
}

export class TransactionsController {
  /**
   * Cria uma nova transação
   */
  static async create(request: any, reply: FastifyReply) {
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

      const { externalId, customerId, type, amount, currency = 'BRL', description, metadata } = request.body;

      // Validar dados obrigatórios
      if (!type || !amount || amount <= 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_DATA',
            message: 'Tipo e valor da transação são obrigatórios e o valor deve ser positivo'
          }
        });
      }

      // Verificar se externalId já existe
      if (externalId) {
        const existingTransaction = await prisma.transaction.findUnique({
          where: { externalId }
        });

        if (existingTransaction) {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'DUPLICATE_EXTERNAL_ID',
              message: 'ID externo já existe'
            }
          });
        }
      }

      // Criar transação
      const transaction = await prisma.transaction.create({
        data: {
          externalId,
          affiliateId: affiliate.id,
          customerId,
          type,
          amount,
          currency,
          description,
          metadata,
          status: 'pending'
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

      return reply.status(201).send({
        success: true,
        data: {
          id: transaction.id,
          externalId: transaction.externalId,
          type: transaction.type,
          amount: Number(transaction.amount),
          currency: transaction.currency,
          status: transaction.status,
          description: transaction.description,
          metadata: transaction.metadata,
          affiliate: {
            id: transaction.affiliate.id,
            referralCode: transaction.affiliate.referralCode,
            name: transaction.affiliate.user.name
          },
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        }
      });

    } catch (error) {
      console.error('Erro ao criar transação:', error);
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
   * Lista transações com filtros e paginação
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

      const { type, status, dateFrom, dateTo, page = 1, limit = 20 } = request.query;

      // Construir filtros
      const where: any = {
        affiliateId: affiliate.id
      };

      if (type) {
        where.type = type;
      }

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      // Calcular offset
      const offset = (page - 1) * limit;

      // Buscar transações
      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: {
            affiliate: {
              select: {
                id: true,
                referralCode: true,
                user: {
                  select: {
                    name: true
                  }
                }
              }
            },
            commissions: {
              select: {
                id: true,
                finalAmount: true,
                status: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip: offset,
          take: limit
        }),
        prisma.transaction.count({ where })
      ]);

      // Calcular estatísticas
      const stats = await prisma.transaction.aggregate({
        where,
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      return reply.send({
        success: true,
        data: {
          transactions: transactions.map(transaction => ({
            id: transaction.id,
            externalId: transaction.externalId,
            type: transaction.type,
            amount: Number(transaction.amount),
            currency: transaction.currency,
            status: transaction.status,
            description: transaction.description,
            processedAt: transaction.processedAt,
            affiliate: {
              id: transaction.affiliate.id,
              referralCode: transaction.affiliate.referralCode,
              name: transaction.affiliate.user.name
            },
            commissionsCount: transaction.commissions.length,
            totalCommissions: transaction.commissions.reduce((sum, c) => sum + Number(c.finalAmount), 0),
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
          },
          summary: {
            totalAmount: Number(stats._sum.amount || 0),
            totalCount: stats._count.id,
            averageAmount: stats._count.id > 0 ? Number(stats._sum.amount || 0) / stats._count.id : 0
          }
        }
      });

    } catch (error) {
      console.error('Erro ao listar transações:', error);
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
   * Busca uma transação específica
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

      // Buscar transação
      const transaction = await prisma.transaction.findFirst({
        where: {
          id,
          affiliateId: affiliate.id
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
          },
          commissions: {
            include: {
              affiliate: {
                select: {
                  id: true,
                  referralCode: true,
                  user: {
                    select: {
                      name: true
                    }
                  }
                }
              }
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

      return reply.send({
        success: true,
        data: {
          id: transaction.id,
          externalId: transaction.externalId,
          type: transaction.type,
          amount: Number(transaction.amount),
          currency: transaction.currency,
          status: transaction.status,
          description: transaction.description,
          metadata: transaction.metadata,
          processedAt: transaction.processedAt,
          affiliate: {
            id: transaction.affiliate.id,
            referralCode: transaction.affiliate.referralCode,
            name: transaction.affiliate.user.name,
            email: transaction.affiliate.user.email
          },
          commissions: transaction.commissions.map(commission => ({
            id: commission.id,
            level: commission.level,
            amount: Number(commission.finalAmount),
            status: commission.status,
            affiliate: {
              id: commission.affiliate.id,
              referralCode: commission.affiliate.referralCode,
              name: commission.affiliate.user.name
            },
            calculatedAt: commission.createdAt,
            paidAt: commission.paidAt
          })),
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        }
      });

    } catch (error) {
      console.error('Erro ao buscar transação:', error);
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
   * Atualiza uma transação
   */
  static async update(request: any, reply: FastifyReply) {
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

      // Verificar se transação existe e pertence ao afiliado
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          id,
          affiliateId: affiliate.id
        }
      });

      if (!existingTransaction) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transação não encontrada'
          }
        });
      }

      const { status, description, metadata } = request.body;

      // Preparar dados para atualização
      const updateData: any = {};

      if (status) {
        updateData.status = status;
        if (status === 'processed') {
          updateData.processedAt = new Date();
        }
      }

      if (description !== undefined) {
        updateData.description = description;
      }

      if (metadata !== undefined) {
        updateData.metadata = metadata;
      }

      // Atualizar transação
      const transaction = await prisma.transaction.update({
        where: { id },
        data: updateData,
        include: {
          affiliate: {
            select: {
              id: true,
              referralCode: true,
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      return reply.send({
        success: true,
        data: {
          id: transaction.id,
          externalId: transaction.externalId,
          type: transaction.type,
          amount: Number(transaction.amount),
          currency: transaction.currency,
          status: transaction.status,
          description: transaction.description,
          metadata: transaction.metadata,
          processedAt: transaction.processedAt,
          affiliate: {
            id: transaction.affiliate.id,
            referralCode: transaction.affiliate.referralCode,
            name: transaction.affiliate.user.name
          },
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        }
      });

    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
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
   * Cancela uma transação
   */
  static async cancel(request: any, reply: FastifyReply) {
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

      // Verificar se transação existe e pode ser cancelada
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          id,
          affiliateId: affiliate.id
        }
      });

      if (!existingTransaction) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transação não encontrada'
          }
        });
      }

      if (existingTransaction.status === 'processed') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'CANNOT_CANCEL_PROCESSED',
            message: 'Não é possível cancelar uma transação já processada'
          }
        });
      }

      if (existingTransaction.status === 'cancelled') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'ALREADY_CANCELLED',
            message: 'Transação já foi cancelada'
          }
        });
      }

      // Cancelar transação
      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          status: 'cancelled'
        },
        include: {
          affiliate: {
            select: {
              id: true,
              referralCode: true,
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      return reply.send({
        success: true,
        data: {
          id: transaction.id,
          status: transaction.status,
          message: 'Transação cancelada com sucesso'
        }
      });

    } catch (error) {
      console.error('Erro ao cancelar transação:', error);
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
   * Gera relatório de transações
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

      const { period = 'month', type } = request.query;

      // Calcular período
      const now = new Date();
      let startDate: Date;
      let endDate = now;

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

      // Construir filtros
      const where: any = {
        affiliateId: affiliate.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };

      if (type) {
        where.type = type;
      }

      // Buscar dados agregados
      const [totalStats, statusStats, typeStats, dailyStats] = await Promise.all([
        // Estatísticas totais
        prisma.transaction.aggregate({
          where,
          _sum: {
            amount: true
          },
          _count: {
            id: true
          },
          _avg: {
            amount: true
          }
        }),

        // Estatísticas por status
        prisma.transaction.groupBy({
          by: ['status'],
          where,
          _sum: {
            amount: true
          },
          _count: {
            id: true
          }
        }),

        // Estatísticas por tipo
        prisma.transaction.groupBy({
          by: ['type'],
          where,
          _sum: {
            amount: true
          },
          _count: {
            id: true
          }
        }),

        // Estatísticas diárias (últimos 30 dias)
        prisma.$queryRaw`
          SELECT 
            DATE(created_at) as date,
            COUNT(*)::int as count,
            SUM(amount)::decimal as total_amount
          FROM transactions 
          WHERE affiliate_id = ${affiliate.id}
            AND created_at >= ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `
      ]);

      return reply.send({
        success: true,
        data: {
          period: {
            start: startDate,
            end: endDate,
            type: period
          },
          summary: {
            totalAmount: Number(totalStats._sum.amount || 0),
            totalCount: totalStats._count.id,
            averageAmount: Number(totalStats._avg.amount || 0)
          },
          byStatus: statusStats.map(stat => ({
            status: stat.status,
            count: stat._count.id,
            amount: Number(stat._sum.amount || 0)
          })),
          byType: typeStats.map(stat => ({
            type: stat.type,
            count: stat._count.id,
            amount: Number(stat._sum.amount || 0)
          })),
          dailyTrend: (dailyStats as any[]).map(stat => ({
            date: stat.date,
            count: stat.count,
            amount: Number(stat.total_amount || 0)
          }))
        }
      });

    } catch (error) {
      console.error('Erro ao gerar relatório de transações:', error);
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

