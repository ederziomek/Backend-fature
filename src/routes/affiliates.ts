import { FastifyInstance } from 'fastify';
import { AffiliatesController } from '@/controllers/affiliates';
import { authMiddleware } from '@/middleware/auth';

// Schemas para documentação Swagger
const affiliateResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        referralCode: { type: 'string' },
        category: { 
          type: 'string', 
          enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'] 
        },
        level: { type: 'integer' },
        status: { 
          type: 'string', 
          enum: ['active', 'inactive', 'suspended'] 
        },
        joinedAt: { type: 'string', format: 'date-time' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            lastLoginAt: { type: 'string', format: 'date-time' }
          }
        },
        metrics: {
          type: 'object',
          properties: {
            totalReferrals: { type: 'integer' },
            activeReferrals: { type: 'integer' },
            monthlyVolume: { type: 'number' },
            totalCommissions: { type: 'number' },
            currentStreak: { type: 'integer' }
          }
        },
        parent: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            referralCode: { type: 'string' }
          }
        }
      }
    }
  }
};

const networkResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        network: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              level: { type: 'integer' },
              status: { type: 'string' },
              joinedAt: { type: 'string', format: 'date-time' },
              metrics: {
                type: 'object',
                properties: {
                  directReferrals: { type: 'integer' },
                  monthlyVolume: { type: 'number' },
                  commissions: { type: 'number' }
                }
              },
              children: { type: 'array' }
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            totalAffiliates: { type: 'integer' },
            activeAffiliates: { type: 'integer' },
            totalVolume: { type: 'number' },
            totalCommissions: { type: 'number' }
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
    }
  }
};

const commissionsResponseSchema = {
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
              amount: { type: 'number' },
              currency: { type: 'string' },
              type: { type: 'string' },
              level: { type: 'integer' },
              status: { type: 'string' },
              sourceAffiliate: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' }
                }
              },
              transaction: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  amount: { type: 'number' },
                  type: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              },
              calculatedAt: { type: 'string', format: 'date-time' },
              paidAt: { type: 'string', format: 'date-time', nullable: true }
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            totalAmount: { type: 'number' },
            count: { type: 'integer' }
          }
        }
      }
    }
  }
};

const updateAffiliateSchema = {
  type: 'object',
  properties: {
    category: { 
      type: 'string', 
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'] 
    },
    status: { 
      type: 'string', 
      enum: ['active', 'inactive', 'suspended'] 
    }
  }
};

const errorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', enum: [false] },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'array', items: { type: 'object' } }
      }
    }
  }
};

export async function affiliatesRoutes(fastify: FastifyInstance) {
  // GET /api/affiliates/me - Dados do afiliado autenticado
  fastify.get('/me', {
    schema: {
      description: 'Retorna dados do afiliado autenticado',
      tags: ['Afiliados'],
      security: [{ bearerAuth: [] }],
      response: {
        200: affiliateResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: authMiddleware
  }, AffiliatesController.getMe);

  // GET /api/affiliates/network - Rede de afiliados
  fastify.get('/network', {
    schema: {
      description: 'Retorna rede de afiliados do usuário com estrutura MLM',
      tags: ['Afiliados'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          levels: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 10, 
            default: 3,
            description: 'Número de níveis para retornar'
          },
          status: { 
            type: 'string', 
            enum: ['active', 'inactive', 'all'], 
            default: 'all',
            description: 'Filtrar por status dos afiliados'
          },
          page: { 
            type: 'integer', 
            minimum: 1, 
            default: 1,
            description: 'Página para paginação'
          },
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 100, 
            default: 50,
            description: 'Itens por página'
          }
        }
      },
      response: {
        200: networkResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: authMiddleware
  }, AffiliatesController.getNetwork);

  // PUT /api/affiliates/:id - Atualizar dados do afiliado
  fastify.put('/:id', {
    schema: {
      description: 'Atualiza dados do afiliado (próprio perfil ou admin)',
      tags: ['Afiliados'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { 
            type: 'string', 
            format: 'uuid',
            description: 'ID do afiliado'
          }
        }
      },
      body: updateAffiliateSchema,
      response: {
        200: affiliateResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: authMiddleware
  }, AffiliatesController.updateAffiliate);

  // GET /api/affiliates/:id/commissions - Comissões do afiliado
  fastify.get('/:id/commissions', {
    schema: {
      description: 'Retorna histórico de comissões do afiliado',
      tags: ['Afiliados'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { 
            type: 'string', 
            format: 'uuid',
            description: 'ID do afiliado'
          }
        }
      },
      response: {
        200: commissionsResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: authMiddleware
  }, AffiliatesController.getCommissions);
}

