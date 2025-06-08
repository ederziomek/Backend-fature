// ===============================================
// APLICAÇÃO PRINCIPAL - ADMIN SERVICE
// ===============================================

import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';

import { adminConfig, validateConfig } from '@/config';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from '@/config/database';
import { connectRedis, disconnectRedis, checkRedisHealth } from '@/config/redis';

// Importar rotas
import { dashboardRoutes } from '@/routes/dashboard.routes';
import { userManagementRoutes } from '@/routes/user-management.routes';

// Estender interface do FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

export class AdminServiceApp {
  private fastify: FastifyInstance;

  constructor() {
    this.fastify = Fastify({
      logger: {
        level: adminConfig.logging.level,
        transport: adminConfig.logging.prettyPrint ? {
          target: 'pino-pretty',
          options: {
            colorize: true
          }
        } : undefined
      }
    });
  }

  /**
   * Configura plugins do Fastify
   */
  private async registerPlugins(): Promise<void> {
    // CORS
    await this.fastify.register(cors, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
    });

    // Helmet para segurança
    await this.fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    });

    // Rate limiting
    await this.fastify.register(rateLimit, {
      max: adminConfig.rateLimit.global,
      timeWindow: '1 minute',
      errorResponseBuilder: (request, context) => {
        return {
          success: false,
          error: 'Muitas requisições. Tente novamente em alguns minutos.',
          statusCode: 429,
          retryAfter: Math.round(context.ttl / 1000)
        };
      }
    });

    // Multipart para upload de arquivos
    await this.fastify.register(multipart, {
      limits: {
        fileSize: adminConfig.upload.maxFileSize
      }
    });

    // Arquivos estáticos
    await this.fastify.register(staticFiles, {
      root: adminConfig.upload.dir,
      prefix: '/uploads/'
    });

    // Swagger para documentação
    await this.fastify.register(swagger, {
      swagger: {
        info: {
          title: 'Admin Service API',
          description: 'API do Microsserviço Administrativo do Sistema Fature 100x',
          version: '1.0.0',
          contact: {
            name: 'Fature 100x Team',
            email: adminConfig.system.supportEmail
          }
        },
        host: `${adminConfig.server.host}:${adminConfig.server.port}`,
        schemes: ['http', 'https'],
        consumes: ['application/json', 'multipart/form-data'],
        produces: ['application/json'],
        tags: [
          { name: 'Dashboard', description: 'Métricas e dashboard executivo' },
          { name: 'Usuários', description: 'Gestão de usuários e administradores' },
          { name: 'Afiliados', description: 'Gestão de afiliados e comissões' },
          { name: 'Sistema', description: 'Configurações e monitoramento do sistema' },
          { name: 'Relatórios', description: 'Geração e download de relatórios' },
          { name: 'Health', description: 'Verificação de saúde do serviço' }
        ],
        securityDefinitions: {
          Bearer: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
            description: 'Token JWT no formato: Bearer <token>'
          }
        },
        security: [{ Bearer: [] }]
      }
    });

    // Swagger UI
    await this.fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      transformSpecification: (swaggerObject) => {
        return swaggerObject;
      },
      transformSpecificationClone: true
    });
  }

  /**
   * Registra rotas da aplicação
   */
  private async registerRoutes(): Promise<void> {
    // Prefixo da API
    await this.fastify.register(async function (fastify) {
      // Dashboard
      await fastify.register(dashboardRoutes, { prefix: '/api/v1' });
      
      // Gestão de usuários
      await fastify.register(userManagementRoutes, { prefix: '/api/v1' });
    });

    // Health check
    this.fastify.get('/health', async (request, reply) => {
      const dbHealth = await checkDatabaseHealth();
      const redisHealth = await checkRedisHealth();
      
      const isHealthy = dbHealth && redisHealth;
      
      return reply.status(isHealthy ? 200 : 503).send({
        status: isHealthy ? 'healthy' : 'unhealthy',
        service: 'admin-service',
        version: adminConfig.system.version,
        timestamp: new Date().toISOString(),
        checks: {
          database: dbHealth ? 'up' : 'down',
          redis: redisHealth ? 'up' : 'down'
        }
      });
    });

    // Rota raiz
    this.fastify.get('/', async (request, reply) => {
      return reply.send({
        service: 'Admin Service',
        version: adminConfig.system.version,
        status: 'running',
        docs: '/docs',
        health: '/health'
      });
    });
  }

  /**
   * Configura handlers de erro
   */
  private setupErrorHandlers(): void {
    // Handler de erro global
    this.fastify.setErrorHandler(async (error, request, reply) => {
      this.fastify.log.error(error);

      // Erro de validação
      if (error.validation) {
        return reply.status(400).send({
          success: false,
          error: 'Dados inválidos',
          details: error.validation,
          statusCode: 400
        });
      }

      // Erro de rate limit
      if (error.statusCode === 429) {
        return reply.status(429).send({
          success: false,
          error: 'Muitas requisições',
          statusCode: 429
        });
      }

      // Erro interno do servidor
      return reply.status(500).send({
        success: false,
        error: adminConfig.server.nodeEnv === 'production' 
          ? 'Erro interno do servidor' 
          : error.message,
        statusCode: 500
      });
    });

    // Handler de rota não encontrada
    this.fastify.setNotFoundHandler(async (request, reply) => {
      return reply.status(404).send({
        success: false,
        error: 'Rota não encontrada',
        statusCode: 404
      });
    });
  }

  /**
   * Configura hooks do ciclo de vida
   */
  private setupHooks(): void {
    // Hook antes de cada requisição
    this.fastify.addHook('preHandler', async (request, reply) => {
      request.startTime = Date.now();
    });

    // Hook após cada resposta
    this.fastify.addHook('onResponse', async (request, reply) => {
      const duration = Date.now() - (request.startTime || 0);
      this.fastify.log.info({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration: `${duration}ms`
      });
    });

    // Hook de shutdown graceful
    this.fastify.addHook('onClose', async () => {
      await disconnectDatabase();
      await disconnectRedis();
    });
  }

  /**
   * Inicia o servidor
   */
  async start(): Promise<void> {
    try {
      // Validar configurações
      validateConfig();

      // Conectar ao banco e Redis
      await connectDatabase();
      await connectRedis();

      // Configurar aplicação
      await this.registerPlugins();
      await this.registerRoutes();
      this.setupErrorHandlers();
      this.setupHooks();

      // Iniciar servidor
      await this.fastify.listen({
        port: adminConfig.server.port,
        host: adminConfig.server.host
      });

      console.log(`
🚀 Admin Service iniciado com sucesso!
📍 Servidor: http://${adminConfig.server.host}:${adminConfig.server.port}
📚 Documentação: http://${adminConfig.server.host}:${adminConfig.server.port}/docs
🏥 Health Check: http://${adminConfig.server.host}:${adminConfig.server.port}/health
🌍 Ambiente: ${adminConfig.server.nodeEnv}
      `);

    } catch (error) {
      console.error('❌ Erro ao iniciar Admin Service:', error);
      process.exit(1);
    }
  }

  /**
   * Para o servidor
   */
  async stop(): Promise<void> {
    try {
      await this.fastify.close();
      console.log('✅ Admin Service parado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao parar Admin Service:', error);
      throw error;
    }
  }
}

// Inicializar aplicação se executado diretamente
if (require.main === module) {
  const app = new AdminServiceApp();
  
  // Handlers de sinal para shutdown graceful
  process.on('SIGTERM', async () => {
    console.log('📡 Recebido SIGTERM, parando servidor...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('📡 Recebido SIGINT, parando servidor...');
    await app.stop();
    process.exit(0);
  });

  // Iniciar servidor
  app.start().catch((error) => {
    console.error('❌ Falha ao iniciar Admin Service:', error);
    process.exit(1);
  });
}

export default AdminServiceApp;

