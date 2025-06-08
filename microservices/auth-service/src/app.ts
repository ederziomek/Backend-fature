// ===============================================
// APLICAÇÃO PRINCIPAL - AUTH SERVICE
// ===============================================

import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import jwt from '@fastify/jwt';

import { config } from '@/config';
import { connectDatabase, disconnectDatabase, testDatabaseConnection } from '@/config/database';
import { connectRedis, disconnectRedis, testRedisConnection } from '@/config/redis';

// Importar rotas
import { authRoutes } from '@/routes/auth.routes';

// Estender interface do FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

export class AuthServiceApp {
  private fastify: FastifyInstance;

  constructor() {
    this.fastify = Fastify({
      logger: process.env.NODE_ENV === 'development' ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true
          }
        }
      } : true
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
      contentSecurityPolicy: false
    });

    // Rate limiting
    await this.fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    });

    // JWT
    await this.fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'your-secret-key'
    });

    // Swagger para documentação
    await this.fastify.register(swagger, {
      swagger: {
        info: {
          title: 'Auth Service API',
          description: 'Microsserviço de Autenticação do Sistema Fature 100x',
          version: '1.0.0'
        },
        host: 'localhost:3001',
        schemes: ['http'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
          { name: 'auth', description: 'Endpoints de autenticação' },
          { name: 'users', description: 'Endpoints de usuários' }
        ]
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
      const dbHealth = await testDatabaseConnection();
      const redisHealth = await testRedisConnection();
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: dbHealth ? 'healthy' : 'unhealthy',
          redis: redisHealth ? 'healthy' : 'unhealthy'
        }
      };
    });

    // Registrar rotas de autenticação
    await this.fastify.register(authRoutes, { prefix: '/api/auth' });
  }

  /**
   * Configura middlewares globais
   */
  private async registerMiddlewares(): Promise<void> {
    // Middleware de logging de requisições
    this.fastify.addHook('onRequest', async (request, reply) => {
      request.startTime = Date.now();
    });

    this.fastify.addHook('onResponse', async (request, reply) => {
      const duration = Date.now() - (request.startTime || 0);
      this.fastify.log.info({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration: `${duration}ms`,
        userAgent: request.headers['user-agent']
      }, 'Request completed');
    });

    // Middleware de tratamento de erros
    this.fastify.setErrorHandler(async (error, request, reply) => {
      this.fastify.log.error(error);

      // Erro de validação
      if (error.validation) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Dados inválidos fornecidos',
          details: error.validation
        });
      }

      // Erro de autenticação
      if (error.statusCode === 401) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Token de acesso é obrigatório'
        });
      }

      // Erro interno do servidor
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro interno do servidor'
      });
    });
  }

  /**
   * Inicializa a aplicação
   */
  public async start(): Promise<void> {
    try {
      // Conectar ao banco de dados
      await connectDatabase();
      this.fastify.log.info('✅ Conectado ao banco de dados PostgreSQL');

      // Conectar ao Redis
      await connectRedis();
      this.fastify.log.info('✅ Conectado ao Redis');

      // Registrar plugins
      await this.registerPlugins();
      this.fastify.log.info('✅ Plugins registrados');

      // Registrar middlewares
      await this.registerMiddlewares();
      this.fastify.log.info('✅ Middlewares configurados');

      // Registrar rotas
      await this.registerRoutes();
      this.fastify.log.info('✅ Rotas registradas');

      // Iniciar servidor
      const port = parseInt(process.env.AUTH_SERVICE_PORT || '3001');
      const host = process.env.HOST || '0.0.0.0';

      await this.fastify.listen({ port, host });
      this.fastify.log.info(`🚀 Auth Service iniciado em http://${host}:${port}`);
      this.fastify.log.info(`📚 Documentação disponível em http://${host}:${port}/docs`);

    } catch (error) {
      this.fastify.log.error('❌ Erro ao iniciar Auth Service:', error);
      process.exit(1);
    }
  }

  /**
   * Para a aplicação graciosamente
   */
  public async stop(): Promise<void> {
    try {
      await disconnectRedis();
      await disconnectDatabase();
      await this.fastify.close();
      this.fastify.log.info('✅ Auth Service parado graciosamente');
    } catch (error) {
      this.fastify.log.error('❌ Erro ao parar Auth Service:', error);
      process.exit(1);
    }
  }
}

// Inicializar aplicação se executado diretamente
if (require.main === module) {
  const app = new AuthServiceApp();

  // Tratamento de sinais para parada graciosa
  process.on('SIGTERM', async () => {
    console.log('Recebido SIGTERM, parando aplicação...');
    await app.stop();
  });

  process.on('SIGINT', async () => {
    console.log('Recebido SIGINT, parando aplicação...');
    await app.stop();
  });

  // Iniciar aplicação
  app.start().catch((error) => {
    console.error('Erro fatal ao iniciar aplicação:', error);
    process.exit(1);
  });
}

export default AuthServiceApp;

