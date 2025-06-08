// ===============================================
// ROTAS - DATA SERVICE
// ===============================================

import { FastifyInstance } from 'fastify';
import { DataController } from '../controllers/DataController';

export async function dataRoutes(fastify: FastifyInstance, controller: DataController): Promise<void> {
  // ===============================================
  // ROTAS DE USUÁRIOS
  // ===============================================
  
  fastify.get('/users/:id', {
    schema: {
      description: 'Buscar usuário por ID',
      tags: ['Users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
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
                email: { type: 'string' },
                name: { type: 'string' },
                phone: { type: 'string' },
                document: { type: 'string' },
                status: { type: 'string' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' }
              }
            },
            timestamp: { type: 'string' },
            request_id: { type: 'string' }
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
            },
            timestamp: { type: 'string' },
            request_id: { type: 'string' }
          }
        }
      }
    }
  }, controller.getUser.bind(controller));

  // ===============================================
  // ROTAS DE AFILIADOS
  // ===============================================
  
  fastify.get('/affiliates/:id', {
    schema: {
      description: 'Buscar afiliado por ID',
      tags: ['Affiliates'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, controller.getAffiliate.bind(controller));

  // ===============================================
  // ROTAS DE TRANSAÇÕES
  // ===============================================
  
  fastify.get('/customers/:customerId/transactions', {
    schema: {
      description: 'Buscar transações de um cliente',
      tags: ['Transactions'],
      params: {
        type: 'object',
        properties: {
          customerId: { type: 'string', format: 'uuid' }
        },
        required: ['customerId']
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          sort_by: { type: 'string', enum: ['created_at', 'amount', 'type'] },
          sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      }
    }
  }, controller.getCustomerTransactions.bind(controller));

  fastify.get('/customers/:customerId/first-deposit', {
    schema: {
      description: 'Buscar primeiro depósito de um cliente',
      tags: ['Transactions'],
      params: {
        type: 'object',
        properties: {
          customerId: { type: 'string', format: 'uuid' }
        },
        required: ['customerId']
      }
    }
  }, controller.getFirstDeposit.bind(controller));

  // ===============================================
  // ROTAS DE VALIDAÇÃO CPA
  // ===============================================
  
  fastify.post('/customers/:customerId/validate-cpa', {
    schema: {
      description: 'Validar cliente para comissões CPA',
      tags: ['CPA Validation'],
      params: {
        type: 'object',
        properties: {
          customerId: { type: 'string', format: 'uuid' }
        },
        required: ['customerId']
      },
      querystring: {
        type: 'object',
        properties: {
          model: { type: 'string', enum: ['1.1', '1.2'] },
          force: { type: 'boolean', default: false }
        }
      }
    }
  }, controller.validateCustomerCPA.bind(controller));

  // ===============================================
  // ROTAS DE MONITORAMENTO
  // ===============================================
  
  fastify.get('/monitor/stats', {
    schema: {
      description: 'Obter estatísticas do monitor de transações',
      tags: ['Monitor'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                is_running: { type: 'boolean' },
                last_processed_timestamp: { type: 'string' },
                polling_interval_ms: { type: 'integer' },
                batch_size: { type: 'integer' }
              }
            },
            timestamp: { type: 'string' },
            request_id: { type: 'string' }
          }
        }
      }
    }
  }, controller.getMonitorStats.bind(controller));

  fastify.post('/monitor/start', {
    schema: {
      description: 'Iniciar monitor de transações',
      tags: ['Monitor']
    }
  }, controller.startMonitor.bind(controller));

  fastify.post('/monitor/stop', {
    schema: {
      description: 'Parar monitor de transações',
      tags: ['Monitor']
    }
  }, controller.stopMonitor.bind(controller));

  // ===============================================
  // ROTA DE HEALTH CHECK
  // ===============================================
  
  fastify.get('/health', {
    schema: {
      description: 'Verificação de saúde do serviço',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
                timestamp: { type: 'string' },
                services: {
                  type: 'object',
                  properties: {
                    database: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        response_time_ms: { type: 'integer' },
                        error: { type: 'string' }
                      }
                    },
                    redis: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        response_time_ms: { type: 'integer' },
                        error: { type: 'string' }
                      }
                    },
                    affiliate_service: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' }
                      }
                    }
                  }
                },
                uptime_seconds: { type: 'number' },
                memory_usage: {
                  type: 'object',
                  properties: {
                    used_mb: { type: 'integer' },
                    total_mb: { type: 'integer' },
                    percentage: { type: 'integer' }
                  }
                }
              }
            },
            timestamp: { type: 'string' },
            request_id: { type: 'string' }
          }
        },
        503: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            },
            timestamp: { type: 'string' },
            request_id: { type: 'string' }
          }
        }
      }
    }
  }, controller.healthCheck.bind(controller));
}

