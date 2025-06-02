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
          type: {
            type: 'string',
            enum: ['cpa', 'revshare'],
            description: 'Filtrar por tipo de comissão'
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
      }
    }
  }, CommissionsController.getById);

  // Calcular comissões RevShare para uma transação
  fastify.post('/calculate-revshare', {
    schema: {
      description: 'Calcula comissões RevShare para uma transação específica',
      tags: ['Comissões'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['transactionId'],
        properties: {
          transactionId: {
            type: 'string',
            format: 'uuid',
            description: 'ID da transação para calcular comissões RevShare'
          }
        }
      }
    }
  }, CommissionsController.calculateRevShare);

  // Processar CPA para uma indicação
  fastify.post('/process-cpa', {
    schema: {
      description: 'Processa CPA para uma indicação validada',
      tags: ['Comissões'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['referralId'],
        properties: {
          referralId: {
            type: 'string',
            format: 'uuid',
            description: 'ID da indicação para processar CPA'
          }
        }
      }
    }
  }, CommissionsController.processCpa);

  // Obter configuração CPA
  fastify.get('/cpa/configuration', {
    schema: {
      description: 'Obtém a configuração CPA ativa',
      tags: ['Comissões'],
      security: [{ bearerAuth: [] }]
    }
  }, CommissionsController.getCpaConfiguration);

  // Atualizar modelo de validação CPA (apenas admin)
  fastify.put('/cpa/validation-model', {
    schema: {
      description: 'Atualiza o modelo de validação CPA ativo (apenas admin)',
      tags: ['Comissões'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['model'],
        properties: {
          model: {
            type: 'string',
            enum: ['model_1_1', 'model_1_2'],
            description: 'Modelo de validação CPA'
          }
        }
      }
    }
  }, CommissionsController.updateCpaValidationModel);

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
      }
    }
  }, CommissionsController.pay);
}

