// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { CommissionsController } from '@/controllers/commissions';
import { authMiddleware } from '@/middleware/auth';

export async function commissionsRoutes(fastify: FastifyInstance) {
  // Aplicar middleware de autenticação em todas as rotas
  fastify.addHook('preHandler', authMiddleware);

  // Listar comissões
  fastify.get('/', {
    schema: {
      description: 'Lista comissões do afiliado com filtros e paginação',
      tags: ['Comissões'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['calculated', 'approved', 'paid', 'cancelled', 'disputed'],
            description: 'Filtrar por status da comissão'
          },
          level: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            description: 'Filtrar por nível da comissão'
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
          affiliateId: {
            type: 'string',
            format: 'uuid',
            description: 'ID do afiliado (apenas para admins)'
          },
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Página atual'
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
                commissions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      transactionId: { type: 'string', format: 'uuid' },
                      level: { type: 'integer' },
                      percentage: { type: 'number' },
                      amount: { type: 'number' },
                      status: { type: 'string' },
                      calculatedAt: { type: 'string', format: 'date-time' },
                      approvedAt: { type: 'string', format: 'date-time', nullable: true },
                      paidAt: { type: 'string', format: 'date-time', nullable: true },
                      metadata: { type: 'object', nullable: true },
                      transaction: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          externalId: { type: 'string', nullable: true },
                          type: { type: 'string' },
                          amount: { type: 'number' },
                          currency: { type: 'string' },
                          description: { type: 'string', nullable: true },
                          createdAt: { type: 'string', format: 'date-time' }
                        }
                      },
                      affiliate: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          referralCode: { type: 'string' },
                          category: { type: 'string' },
                          user: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              email: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    pages: { type: 'integer' }
                  }
                },
                stats: {
                  type: 'object',
                  properties: {
                    totalAmount: { type: 'number' },
                    totalCommissions: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, CommissionsController.list);

  // Buscar comissão específica
  fastify.get('/:id', {
    schema: {
      description: 'Busca uma comissão específica por ID',
      tags: ['Comissões'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID da comissão'
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
                id: { type: 'string', format: 'uuid' },
                transactionId: { type: 'string', format: 'uuid' },
                level: { type: 'integer' },
                percentage: { type: 'number' },
                amount: { type: 'number' },
                status: { type: 'string' },
                calculatedAt: { type: 'string', format: 'date-time' },
                approvedAt: { type: 'string', format: 'date-time', nullable: true },
                paidAt: { type: 'string', format: 'date-time', nullable: true },
                metadata: { type: 'object', nullable: true },
                transaction: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    externalId: { type: 'string', nullable: true },
                    type: { type: 'string' },
                    amount: { type: 'number' },
                    currency: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' }
                  }
                },
                affiliate: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    referralCode: { type: 'string' },
                    category: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        email: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        404: {
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
        }
      }
    }
  }, CommissionsController.getById);

  // Calcular comissões para uma transação
  fastify.post('/calculate', {
    schema: {
      description: 'Calcula comissões MLM para uma transação específica',
      tags: ['Comissões'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['transactionId'],
        properties: {
          transactionId: {
            type: 'string',
            format: 'uuid',
            description: 'ID da transação para calcular comissões'
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                transactionId: { type: 'string', format: 'uuid' },
                transactionAmount: { type: 'number' },
                commissionsCalculated: { type: 'integer' },
                totalCommissionAmount: { type: 'number' },
                commissions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      level: { type: 'integer' },
                      percentage: { type: 'number' },
                      amount: { type: 'number' },
                      affiliate: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          referralCode: { type: 'string' },
                          category: { type: 'string' },
                          user: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              email: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        409: {
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
        }
      }
    }
  }, CommissionsController.calculateCommissions);

  // Aprovar comissão
  fastify.put('/:id/approve', {
    schema: {
      description: 'Aprova uma comissão calculada',
      tags: ['Comissões'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID da comissão'
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
                id: { type: 'string', format: 'uuid' },
                status: { type: 'string' },
                approvedAt: { type: 'string', format: 'date-time' },
                amount: { type: 'number' },
                affiliate: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    referralCode: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        email: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, CommissionsController.approve);

  // Marcar comissão como paga
  fastify.put('/:id/pay', {
    schema: {
      description: 'Marca uma comissão aprovada como paga',
      tags: ['Comissões'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID da comissão'
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
                id: { type: 'string', format: 'uuid' },
                status: { type: 'string' },
                paidAt: { type: 'string', format: 'date-time' },
                amount: { type: 'number' },
                affiliate: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    referralCode: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        email: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, CommissionsController.pay);

  // Relatórios de comissões
  fastify.get('/reports', {
    schema: {
      description: 'Gera relatórios de comissões com estatísticas e tendências',
      tags: ['Comissões'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['week', 'month', 'quarter', 'year'],
            default: 'month',
            description: 'Período do relatório'
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
                period: { type: 'string' },
                startDate: { type: 'string', format: 'date-time' },
                endDate: { type: 'string', format: 'date-time' },
                summary: {
                  type: 'object',
                  properties: {
                    totalCommissions: { type: 'integer' },
                    totalAmount: { type: 'number' }
                  }
                },
                byStatus: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      count: { type: 'integer' },
                      amount: { type: 'number' }
                    }
                  }
                },
                byLevel: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      level: { type: 'integer' },
                      count: { type: 'integer' },
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
                      count: { type: 'integer' },
                      amount: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, CommissionsController.getReports);
}

