// ===============================================
// APLICAÇÃO PRINCIPAL - FRAUD DETECTION SERVICE
// ===============================================

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

import { fraudConfig, validateConfig } from './config';
import { FraudController } from './controllers/fraud.controller';

export class FraudDetectionApp {
  private fastify: FastifyInstance;
  private prisma: PrismaClient;
  private redis: Redis;
  private fraudController: FraudController;

  constructor() {
    this.fastify = Fastify({
      logger: {
        level: fraudConfig.logging.level,
        transport: fraudConfig.logging.prettyPrint ? {
          target: 'pino-pretty',
          options: {
            colorize: true
          }
        } : undefined
      }
    });

    this.prisma = new PrismaClient();
    this.redis = new Redis(fraudConfig.redis.url);
    this.fraudController = new FraudController(this.prisma, this.redis);
  }

  /**
   * Configura plugins do Fastify
   */
  private async registerPlugins(): Promise<void> {
    // CORS
    await this.fastify.register(cors, {
      origin: true,
      credentials: true
    });

    // Helmet para segurança
    await this.fastify.register(helmet);

    // Rate limiting
    await this.fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    });

    // Swagger para documentação
    await this.fastify.register(swagger, {
      swagger: {
        info: {
          title: 'Fraud Detection Service API',
          description: 'API para detecção de fraudes no sistema Fature100x',
          version: '1.0.0'
        },
        host: `${fraudConfig.server.host}:${fraudConfig.server.port}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json']
      }
    });

    await this.fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      }
    });
  }

  /**
   * Registra rotas da aplicação
   */
  private async registerRoutes(): Promise<void> {
    // Health check
    this.fastify.get('/health', async (request, reply) => {
      return {
        status: 'healthy',
        timestamp: new Date(),
        service: 'fraud-detection-service',
        version: '1.0.0'
      };
    });

    // Rotas de detecção de fraude
    this.fastify.post('/fraud/analyze/:affiliateId', {
      schema: {
        params: {
          type: 'object',
          properties: {
            affiliateId: { type: 'string' }
          },
          required: ['affiliateId']
        }
      }
    }, this.fraudController.analyzeAffiliate.bind(this.fraudController));

    this.fastify.get('/fraud/alerts', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            severity: { type: 'string' },
            affiliateId: { type: 'string' },
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 }
          }
        }
      }
    }, this.fraudController.getAlerts.bind(this.fraudController));

    this.fastify.get('/fraud/alerts/:alertId', {
      schema: {
        params: {
          type: 'object',
          properties: {
            alertId: { type: 'string' }
          },
          required: ['alertId']
        }
      }
    }, this.fraudController.getAlert.bind(this.fraudController));

    this.fastify.put('/fraud/alerts/:alertId/status', {
      schema: {
        params: {
          type: 'object',
          properties: {
            alertId: { type: 'string' }
          },
          required: ['alertId']
        },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            notes: { type: 'string' }
          },
          required: ['status']
        }
      }
    }, this.fraudController.updateAlertStatus.bind(this.fraudController));

    this.fastify.post('/fraud/investigations', {
      schema: {
        body: {
          type: 'object',
          properties: {
            alertId: { type: 'string' },
            investigatorId: { type: 'string' },
            priority: { type: 'string' },
            notes: { type: 'string' }
          },
          required: ['alertId', 'investigatorId', 'priority']
        }
      }
    }, this.fraudController.createInvestigation.bind(this.fraudController));

    this.fastify.get('/fraud/investigations', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            priority: { type: 'string' },
            investigatorId: { type: 'string' },
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 }
          }
        }
      }
    }, this.fraudController.getInvestigations.bind(this.fraudController));

    this.fastify.get('/fraud/behavior/:affiliateId', {
      schema: {
        params: {
          type: 'object',
          properties: {
            affiliateId: { type: 'string' }
          },
          required: ['affiliateId']
        }
      }
    }, this.fraudController.getBehaviorProfile.bind(this.fraudController));

    this.fastify.post('/fraud/batch-analyze', {
      schema: {
        body: {
          type: 'object',
          properties: {
            affiliateIds: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['affiliateIds']
        }
      }
    }, this.fraudController.batchAnalyze.bind(this.fraudController));
  }

  /**
   * Configura handlers de erro
   */
  private setupErrorHandlers(): void {
    this.fastify.setErrorHandler(async (error, request, reply) => {
      this.fastify.log.error(error);

      const statusCode = error.statusCode || 500;
      const message = error.message || 'Erro interno do servidor';

      return reply.status(statusCode).send({
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message,
          details: fraudConfig.server.isDevelopment ? error.stack : undefined
        },
        meta: {
          timestamp: new Date(),
          requestId: request.id
        }
      });
    });

    this.fastify.setNotFoundHandler(async (request, reply) => {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint não encontrado'
        },
        meta: {
          timestamp: new Date(),
          requestId: request.id
        }
      });
    });
  }

  /**
   * Inicializa a aplicação
   */
  async initialize(): Promise<void> {
    try {
      // Validar configurações
      validateConfig();

      // Registrar plugins
      await this.registerPlugins();

      // Registrar rotas
      await this.registerRoutes();

      // Configurar handlers de erro
      this.setupErrorHandlers();

      // Conectar ao banco de dados
      await this.prisma.$connect();
      this.fastify.log.info('Conectado ao banco de dados');

      // Testar conexão Redis
      await this.redis.ping();
      this.fastify.log.info('Conectado ao Redis');

      this.fastify.log.info('Fraud Detection Service inicializado com sucesso');

    } catch (error) {
      this.fastify.log.error('Erro ao inicializar aplicação:', error);
      throw error;
    }
  }

  /**
   * Inicia o servidor
   */
  async start(): Promise<void> {
    try {
      await this.initialize();

      await this.fastify.listen({
        port: fraudConfig.server.port,
        host: fraudConfig.server.host
      });

      this.fastify.log.info(
        `Fraud Detection Service rodando em http://${fraudConfig.server.host}:${fraudConfig.server.port}`
      );
      this.fastify.log.info(
        `Documentação disponível em http://${fraudConfig.server.host}:${fraudConfig.server.port}/docs`
      );

    } catch (error) {
      this.fastify.log.error('Erro ao iniciar servidor:', error);
      process.exit(1);
    }
  }

  /**
   * Para o servidor graciosamente
   */
  async stop(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      await this.redis.quit();
      await this.fastify.close();
      this.fastify.log.info('Fraud Detection Service parado graciosamente');
    } catch (error) {
      this.fastify.log.error('Erro ao parar servidor:', error);
      throw error;
    }
  }
}

// Inicializar aplicação se executado diretamente
if (require.main === module) {
  const app = new FraudDetectionApp();
  
  // Handlers para shutdown gracioso
  process.on('SIGTERM', async () => {
    console.log('Recebido SIGTERM, parando servidor...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Recebido SIGINT, parando servidor...');
    await app.stop();
    process.exit(0);
  });

  // Iniciar servidor
  app.start().catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

