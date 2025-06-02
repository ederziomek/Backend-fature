// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { AffiliatesController } from '@/controllers/affiliates';
import { authMiddleware } from '@/middleware/auth';

export async function affiliatesRoutes(fastify: FastifyInstance) {
  // Aplicar middleware de autenticação em todas as rotas
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/affiliates/me - Dados do afiliado autenticado
  fastify.get('/me', {
    schema: {
      description: 'Retorna dados completos do afiliado autenticado incluindo categoria e level',
      tags: ['Afiliados'],
      security: [{ bearerAuth: [] }]
    }
  }, AffiliatesController.getMe);

  // GET /api/affiliates/categories - Informações das categorias
  fastify.get('/categories', {
    schema: {
      description: 'Retorna informações resumidas das categorias de afiliados',
      tags: ['Afiliados'],
      security: [{ bearerAuth: [] }]
    }
  }, AffiliatesController.getCategories);

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
            maximum: 5, 
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
      }
    }
  }, AffiliatesController.getNetwork);

  // GET /api/affiliates/referrals - Indicações do afiliado
  fastify.get('/referrals', {
    schema: {
      description: 'Retorna lista de indicações do afiliado com status de validação',
      tags: ['Afiliados'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['validated', 'pending', 'all'],
            default: 'all',
            description: 'Filtrar por status de validação'
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
            default: 20,
            description: 'Itens por página'
          }
        }
      }
    }
  }, AffiliatesController.getReferrals);
}

