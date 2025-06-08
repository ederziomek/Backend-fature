import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { externalDataConfig } from './config/config';
import { ExternalDataController } from './controllers/external-data.controller';

class ExternalDataApp {
  private app: FastifyInstance;
  private controller: ExternalDataController;

  constructor() {
    this.app = Fastify({
      logger: {
        level: externalDataConfig.logging.level,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
    });

    this.controller = new ExternalDataController();
    this.setupPlugins();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private async setupPlugins(): Promise<void> {
    // CORS
    await this.app.register(cors, {
      origin: true,
      credentials: true,
    });

    // Security headers
    await this.app.register(helmet, {
      contentSecurityPolicy: false,
    });

    // Rate limiting
    await this.app.register(rateLimit, {
      max: externalDataConfig.rateLimit.max,
      timeWindow: externalDataConfig.rateLimit.timeWindow,
    });

    // Swagger documentation
    await this.app.register(swagger, {
      swagger: {
        info: {
          title: 'External Data Service API',
          description: 'Microsserviço para integração com base de dados externa de depósitos e apostas',
          version: '1.0.0',
        },
        host: `${externalDataConfig.host}:${externalDataConfig.port}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
          { name: 'External Data', description: 'Endpoints para dados externos' },
          { name: 'Health', description: 'Health check endpoints' },
        ],
      },
    });

    await this.app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', {
      schema: {
        tags: ['Health'],
        summary: 'Health check do serviço',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  service: { type: 'string' },
                  version: { type: 'string' },
                  status: { type: 'string' },
                  timestamp: { type: 'string' },
                },
              },
            },
          },
        },
      },
    }, this.controller.healthCheck.bind(this.controller));

    // Rotas de dados externos
    this.app.get('/api/external-data/deposits', {
      schema: {
        tags: ['External Data'],
        summary: 'Buscar depósitos de um jogador',
        querystring: {
          type: 'object',
          required: ['playerId'],
          properties: {
            playerId: { type: 'string', format: 'uuid' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'array' },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, this.controller.getPlayerDeposits.bind(this.controller));

    this.app.get('/api/external-data/bets', {
      schema: {
        tags: ['External Data'],
        summary: 'Buscar apostas de um jogador',
        querystring: {
          type: 'object',
          required: ['playerId'],
          properties: {
            playerId: { type: 'string', format: 'uuid' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'array' },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, this.controller.getPlayerBets.bind(this.controller));

    this.app.get('/api/external-data/ggr', {
      schema: {
        tags: ['External Data'],
        summary: 'Calcular GGR de um jogador',
        querystring: {
          type: 'object',
          required: ['playerId', 'startDate', 'endDate'],
          properties: {
            playerId: { type: 'string', format: 'uuid' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, this.controller.getPlayerGGR.bind(this.controller));

    this.app.get('/api/external-data/activity/:playerId', {
      schema: {
        tags: ['External Data'],
        summary: 'Buscar atividade de um jogador',
        params: {
          type: 'object',
          required: ['playerId'],
          properties: {
            playerId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, this.controller.getPlayerActivity.bind(this.controller));

    this.app.post('/api/external-data/validate-cpa', {
      schema: {
        tags: ['External Data'],
        summary: 'Validar jogador para CPA',
        body: {
          type: 'object',
          required: ['playerId'],
          properties: {
            playerId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, this.controller.validatePlayerForCPA.bind(this.controller));

    this.app.delete('/api/external-data/cache/:playerId', {
      schema: {
        tags: ['External Data'],
        summary: 'Limpar cache de um jogador',
        params: {
          type: 'object',
          required: ['playerId'],
          properties: {
            playerId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
              meta: { type: 'object' },
            },
          },
        },
      },
    }, this.controller.clearPlayerCache.bind(this.controller));
  }

  private setupErrorHandlers(): void {
    // Global error handler
    this.app.setErrorHandler((error, request, reply) => {
      this.app.log.error(error);

      // Validation errors
      if (error.validation) {
        reply.status(400).send({
          success: false,
          message: 'Erro de validação',
          errors: error.validation,
        });
        return;
      }

      // Rate limit errors
      if (error.statusCode === 429) {
        reply.status(429).send({
          success: false,
          message: 'Muitas requisições. Tente novamente mais tarde.',
        });
        return;
      }

      // Generic server error
      reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    });

    // 404 handler
    this.app.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        success: false,
        message: 'Endpoint não encontrado',
        path: request.url,
      });
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize controller
      await this.controller.initialize();

      // Start server
      await this.app.listen({
        port: externalDataConfig.port,
        host: externalDataConfig.host,
      });

      console.log(`🚀 External Data Service running on http://${externalDataConfig.host}:${externalDataConfig.port}`);
      console.log(`📚 API Documentation available at http://${externalDataConfig.host}:${externalDataConfig.port}/docs`);
    } catch (error) {
      console.error('❌ Failed to start External Data Service:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      await this.controller.close();
      await this.app.close();
      console.log('✅ External Data Service stopped gracefully');
    } catch (error) {
      console.error('❌ Error stopping External Data Service:', error);
    }
  }
}

// Start the service
const service = new ExternalDataApp();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📡 SIGTERM received, shutting down gracefully...');
  await service.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📡 SIGINT received, shutting down gracefully...');
  await service.stop();
  process.exit(0);
});

// Start the service
service.start().catch((error) => {
  console.error('❌ Failed to start service:', error);
  process.exit(1);
});

export default service;

