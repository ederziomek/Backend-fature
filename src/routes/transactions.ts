// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { TransactionsController } from '@/controllers/transactions';
import { authMiddleware } from '@/middleware/auth';

// Schemas para documentação Swagger
const transactionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    externalId: { type: 'string' },
    type: { type: 'string', enum: ['sale', 'deposit', 'bet', 'bonus', 'adjustment'] },
    amount: { type: 'number' },
    currency: { type: 'string' },
    status: { type: 'string', enum: ['pending', 'processed', 'failed', 'cancelled'] },
    description: { type: 'string' },
    metadata: { type: 'object' },
    processedAt: { type: 'string', format: 'date-time' },
    affiliate: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        referralCode: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' }
      }
    },
    commissions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          level: { type: 'number' },
          amount: { type: 'number' },
          status: { type: 'string' },
          affiliate: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              referralCode: { type: 'string' },
              name: { type: 'string' }
            }
          },
          calculatedAt: { type: 'string', format: 'date-time' },
          paidAt: { type: 'string', format: 'date-time' }
        }
      }
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

const errorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
};

const successResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: transactionResponseSchema
  }
};

export async function transactionsRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/transactions - Criar nova transação
  fastify.post('/', {
    schema: {
      description: 'Cria uma nova transação',
      tags: ['Transações'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['type', 'amount'],
        properties: {
          externalId: { type: 'string', maxLength: 255 },
          customerId: { type: 'string' },
          type: { 
            type: 'string', 
            enum: ['sale', 'deposit', 'bet', 'bonus', 'adjustment'],
            description: 'Tipo da transação'
          },
          amount: { 
            type: 'number', 
            minimum: 0.01,
            description: 'Valor da transação (deve ser positivo)'
          },
          currency: { 
            type: 'string', 
            default: 'BRL',
            enum: ['BRL', 'USD', 'EUR'],
            description: 'Moeda da transação'
          },
          description: { type: 'string', maxLength: 1000 },
          metadata: { 
            type: 'object',
            description: 'Dados adicionais em formato JSON'
          }
        }
      },
      response: {
        201: successResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        409: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: authMiddleware,
    handler: TransactionsController.create
  });

  // GET /api/transactions - Listar transações
  fastify.get('/', {
    schema: {
      description: 'Lista transações do afiliado com filtros e paginação',
      tags: ['Transações'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: { 
            type: 'string', 
            enum: ['sale', 'deposit', 'bet', 'bonus', 'adjustment'],
            description: 'Filtrar por tipo de transação'
          },
          status: { 
            type: 'string', 
            enum: ['pending', 'processed', 'failed', 'cancelled'],
            description: 'Filtrar por status da transação'
          },
          dateFrom: { 
            type: 'string', 
            format: 'date',
            description: 'Data inicial (YYYY-MM-DD)'
          },
          dateTo: { 
            type: 'string', 
            format: 'date',
            description: 'Data final (YYYY-MM-DD)'
          },
          page: { 
            type: 'integer', 
            minimum: 1, 
            default: 1,
            description: 'Página da listagem'
          },
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 100, 
            default: 20,
            description: 'Itens por página'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                transactions: {
                  type: 'array',
                  items: transactionResponseSchema
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    total: { type: 'number' },
                    pages: { type: 'number' },
                    hasNext: { type: 'boolean' },
                    hasPrev: { type: 'boolean' }
                  }
                },
                summary: {
                  type: 'object',
                  properties: {
                    totalAmount: { type: 'number' },
                    totalCount: { type: 'number' },
                    averageAmount: { type: 'number' }
                  }
                }
              }
            }
          }
        },
        401: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: authMiddleware,
    handler: TransactionsController.list
  });

  // GET /api/transactions/reports - Relatórios de transações
  fastify.get('/reports', {
    schema: {
      description: 'Gera relatórios e estatísticas de transações',
      tags: ['Transações'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          period: { 
            type: 'string', 
            enum: ['week', 'month', 'quarter', 'year'],
            default: 'month',
            description: 'Período do relatório'
          },
          type: { 
            type: 'string', 
            enum: ['sale', 'deposit', 'bet', 'bonus', 'adjustment'],
            description: 'Filtrar por tipo de transação'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                period: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', format: 'date-time' },
                    end: { type: 'string', format: 'date-time' },
                    type: { type: 'string' }
                  }
                },
                summary: {
                  type: 'object',
                  properties: {
                    totalAmount: { type: 'number' },
                    totalCount: { type: 'number' },
                    averageAmount: { type: 'number' }
                  }
                },
                byStatus: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      count: { type: 'number' },
                      amount: { type: 'number' }
                    }
                  }
                },
                byType: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      count: { type: 'number' },
                      amount: { type: 'number' }
                    }
                  }
                },
                dailyTrend: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string', format: 'date' },
                      count: { type: 'number' },
                      amount: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        401: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: authMiddleware,
    handler: TransactionsController.getReports
  });

  // GET /api/transactions/:id - Buscar transação específica
  fastify.get('/:id', {
    schema: {
      description: 'Busca uma transação específica por ID',
      tags: ['Transações'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { 
            type: 'string',
            description: 'ID da transação'
          }
        }
      },
      response: {
        200: successResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: authMiddleware,
    handler: TransactionsController.getById
  });

  // PUT /api/transactions/:id - Atualizar transação
  fastify.put('/:id', {
    schema: {
      description: 'Atualiza uma transação existente',
      tags: ['Transações'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { 
            type: 'string',
            description: 'ID da transação'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          status: { 
            type: 'string', 
            enum: ['pending', 'processed', 'failed', 'cancelled'],
            description: 'Novo status da transação'
          },
          description: { 
            type: 'string', 
            maxLength: 1000,
            description: 'Nova descrição da transação'
          },
          metadata: { 
            type: 'object',
            description: 'Novos dados adicionais em formato JSON'
          }
        }
      },
      response: {
        200: successResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: authMiddleware,
    handler: TransactionsController.update
  });

  // DELETE /api/transactions/:id/cancel - Cancelar transação
  fastify.delete('/:id/cancel', {
    schema: {
      description: 'Cancela uma transação (apenas se ainda não foi processada)',
      tags: ['Transações'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { 
            type: 'string',
            description: 'ID da transação'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                status: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        },
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: authMiddleware,
    handler: TransactionsController.cancel
  });
}

