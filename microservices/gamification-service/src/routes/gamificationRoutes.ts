import { FastifyInstance } from 'fastify';
import { GamificationController } from '../controllers/gamificationController';

export async function gamificationRoutes(fastify: FastifyInstance) {
  const controller = new GamificationController();

  // Daily Indication routes
  fastify.post('/daily-indication/:affiliateId/track', {
    schema: {
      description: 'Track daily indication for affiliate',
      tags: ['Daily Indication'],
      params: {
        type: 'object',
        properties: {
          affiliateId: { type: 'string' }
        },
        required: ['affiliateId']
      }
    }
  }, controller.trackDailyIndication.bind(controller));

  fastify.get('/daily-indication/:affiliateId/progress', {
    schema: {
      description: 'Get daily indication progress',
      tags: ['Daily Indication'],
      params: {
        type: 'object',
        properties: {
          affiliateId: { type: 'string' }
        },
        required: ['affiliateId']
      }
    }
  }, controller.getDailyProgress.bind(controller));

  // Chest routes
  fastify.post('/chests/:affiliateId/generate-goals', {
    schema: {
      description: 'Generate weekly goals for affiliate',
      tags: ['Chests'],
      params: {
        type: 'object',
        properties: {
          affiliateId: { type: 'string' }
        },
        required: ['affiliateId']
      }
    }
  }, controller.generateWeeklyGoals.bind(controller));

  fastify.get('/chests/:affiliateId/goals', {
    schema: {
      description: 'Get weekly goals for affiliate',
      tags: ['Chests'],
      params: {
        type: 'object',
        properties: {
          affiliateId: { type: 'string' }
        },
        required: ['affiliateId']
      }
    }
  }, controller.getWeeklyGoals.bind(controller));

  fastify.post('/chests/:affiliateId/open/:chestType', {
    schema: {
      description: 'Open chest and claim reward',
      tags: ['Chests'],
      params: {
        type: 'object',
        properties: {
          affiliateId: { type: 'string' },
          chestType: { type: 'string', enum: ['silver', 'gold', 'sapphire', 'diamond'] }
        },
        required: ['affiliateId', 'chestType']
      }
    }
  }, controller.openChest.bind(controller));

  fastify.put('/chests/:affiliateId/progress', {
    schema: {
      description: 'Update chest progress for affiliate',
      tags: ['Chests'],
      params: {
        type: 'object',
        properties: {
          affiliateId: { type: 'string' }
        },
        required: ['affiliateId']
      },
      body: {
        type: 'object',
        properties: {
          indicationsCount: { type: 'number' }
        },
        required: ['indicationsCount']
      }
    }
  }, controller.updateProgress.bind(controller));

  fastify.get('/chests/:affiliateId/history', {
    schema: {
      description: 'Get chest history for affiliate',
      tags: ['Chests'],
      params: {
        type: 'object',
        properties: {
          affiliateId: { type: 'string' }
        },
        required: ['affiliateId']
      },
      querystring: {
        type: 'object',
        properties: {
          weeks: { type: 'string' }
        }
      }
    }
  }, controller.getChestHistory.bind(controller));

  // Potential Analysis routes
  fastify.get('/analysis/:affiliateId/potential', {
    schema: {
      description: 'Analyze affiliate potential',
      tags: ['Analysis'],
      params: {
        type: 'object',
        properties: {
          affiliateId: { type: 'string' }
        },
        required: ['affiliateId']
      }
    }
  }, controller.analyzePotential.bind(controller));

  fastify.post('/analysis/:affiliateId/historical-data', {
    schema: {
      description: 'Update historical data for affiliate',
      tags: ['Analysis'],
      params: {
        type: 'object',
        properties: {
          affiliateId: { type: 'string' }
        },
        required: ['affiliateId']
      },
      body: {
        type: 'object',
        properties: {
          weekStartDate: { type: 'string' },
          totalIndications: { type: 'number' },
          validIndications: { type: 'number' },
          revenue: { type: 'number' },
          conversionRate: { type: 'number' }
        },
        required: ['weekStartDate', 'totalIndications', 'validIndications', 'revenue', 'conversionRate']
      }
    }
  }, controller.updateHistoricalData.bind(controller));

  // Admin routes
  fastify.post('/admin/reset-weekly-goals', {
    schema: {
      description: 'Reset expired weekly goals',
      tags: ['Admin']
    }
  }, controller.resetWeeklyGoals.bind(controller));

  fastify.get('/admin/stats', {
    schema: {
      description: 'Get system statistics',
      tags: ['Admin']
    }
  }, controller.getSystemStats.bind(controller));

  // Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', service: 'gamification-service' };
  });
}

