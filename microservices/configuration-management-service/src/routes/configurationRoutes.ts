import { FastifyInstance } from 'fastify';
import { ConfigurationController } from '../controllers/configurationController';

export async function configurationRoutes(fastify: FastifyInstance) {
  const controller = new ConfigurationController();

  // Registrar rotas
  fastify.get('/configurations/:section', {
    schema: {
      description: 'Get configuration by section',
      tags: ['Configuration'],
      params: {
        type: 'object',
        properties: {
          section: { type: 'string' }
        },
        required: ['section']
      }
    }
  }, controller.getConfiguration.bind(controller));

  fastify.put('/configurations/:section', {
    schema: {
      description: 'Update configuration section',
      tags: ['Configuration'],
      params: {
        type: 'object',
        properties: {
          section: { type: 'string' }
        },
        required: ['section']
      },
      body: {
        type: 'object',
        properties: {
          data: { type: 'object' },
          reason: { type: 'string' },
          userId: { type: 'string' }
        },
        required: ['data', 'reason']
      }
    }
  }, controller.updateConfiguration.bind(controller));

  fastify.post('/configurations/:section/validate', {
    schema: {
      description: 'Validate configuration data',
      tags: ['Configuration'],
      params: {
        type: 'object',
        properties: {
          section: { type: 'string' }
        },
        required: ['section']
      },
      body: {
        type: 'object',
        properties: {
          data: { type: 'object' }
        },
        required: ['data']
      }
    }
  }, controller.validateConfiguration.bind(controller));

  fastify.get('/configurations/:section/history', {
    schema: {
      description: 'Get configuration history',
      tags: ['Configuration'],
      params: {
        type: 'object',
        properties: {
          section: { type: 'string' }
        },
        required: ['section']
      }
    }
  }, controller.getConfigurationHistory.bind(controller));

  fastify.post('/configurations/:section/rollback', {
    schema: {
      description: 'Rollback to previous version',
      tags: ['Configuration'],
      params: {
        type: 'object',
        properties: {
          section: { type: 'string' }
        },
        required: ['section']
      },
      body: {
        type: 'object',
        properties: {
          version: { type: 'string' }
        },
        required: ['version']
      }
    }
  }, controller.rollbackConfiguration.bind(controller));

  fastify.get('/configurations/export', {
    schema: {
      description: 'Export all configurations',
      tags: ['Configuration']
    }
  }, controller.exportAllConfigurations.bind(controller));

  fastify.post('/configurations/import', {
    schema: {
      description: 'Import configurations',
      tags: ['Configuration'],
      body: {
        type: 'object',
        properties: {
          data: { type: 'object' }
        },
        required: ['data']
      }
    }
  }, controller.importConfigurations.bind(controller));

  // Rota de health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', service: 'configuration-management-service' };
  });
}

