// ===============================================
// ROTAS DE DASHBOARD - ADMIN SERVICE
// ===============================================

import { FastifyInstance } from 'fastify';
import { DashboardController } from '@/controllers/dashboard.controller';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // Configurar schemas para documentação
  await fastify.register(async function (fastify) {
    fastify.addSchema({
      $id: 'DashboardMetrics',
      type: 'object',
      properties: {
        overview: {
          type: 'object',
          properties: {
            totalUsers: { type: 'number' },
            totalAffiliates: { type: 'number' },
            totalCommissions: { type: 'number' },
            totalRevenue: { type: 'number' },
            activeUsers: { type: 'number' },
            pendingApprovals: { type: 'number' }
          }
        },
        growth: {
          type: 'object',
          properties: {
            usersGrowth: { type: 'number' },
            affiliatesGrowth: { type: 'number' },
            revenueGrowth: { type: 'number' },
            commissionsGrowth: { type: 'number' }
          }
        },
        charts: {
          type: 'object',
          properties: {
            userRegistrations: { type: 'array' },
            affiliatePerformance: { type: 'array' },
            revenueByMonth: { type: 'array' },
            commissionsByType: { type: 'array' }
          }
        },
        alerts: { type: 'array' }
      }
    });

    // Obter métricas do dashboard
    fastify.get('/dashboard/metrics', {
      schema: {
        tags: ['Dashboard'],
        summary: 'Métricas do dashboard',
        description: 'Obtém métricas consolidadas para o dashboard administrativo',
        security: [{ Bearer: [] }],
        response: {
          200: {
            description: 'Métricas obtidas com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: 'DashboardMetrics#' },
              message: { type: 'string', example: 'Métricas obtidas com sucesso' },
              statusCode: { type: 'number', example: 200 }
            }
          },
          500: {
            description: 'Erro interno do servidor',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Erro interno do servidor' },
              statusCode: { type: 'number', example: 500 }
            }
          }
        }
      }
    }, DashboardController.getDashboardMetrics);

    // Atualizar métricas do dashboard
    fastify.post('/dashboard/refresh', {
      schema: {
        tags: ['Dashboard'],
        summary: 'Atualizar dashboard',
        description: 'Força atualização das métricas do dashboard',
        security: [{ Bearer: [] }],
        response: {
          200: {
            description: 'Dashboard atualizado com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: 'DashboardMetrics#' },
              message: { type: 'string', example: 'Dashboard atualizado com sucesso' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      }
    }, DashboardController.refreshDashboard);

    // Limpar cache do dashboard
    fastify.delete('/dashboard/cache', {
      schema: {
        tags: ['Dashboard'],
        summary: 'Limpar cache',
        description: 'Limpa o cache das métricas do dashboard',
        security: [{ Bearer: [] }],
        response: {
          200: {
            description: 'Cache limpo com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Cache limpo com sucesso' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      }
    }, DashboardController.clearCache);
  });
}

