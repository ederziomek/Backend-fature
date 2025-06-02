import Fastify, { FastifyInstance } from 'fastify';
import { config } from '@/config';
import { connectDatabase } from '@/config/database';
import { testRedisConnection } from '@/config/redis';

// Plugins do Fastify
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

// Rotas
import { authRoutes } from '@/routes/auth';
import { usersRoutes } from '@/routes/users';
import { affiliatesRoutes } from '@/routes/affiliates';
import { testRoutes } from '@/routes/test';
import { transactionsRoutes } from '@/routes/transactions';

// Tipos
import '@/types/fastify';

/**
 * Cria e configura a instância do Fastify
 */
async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.server.isDevelopment
      ? {
          level: config.logging.level,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        }
      : {
          level: config.logging.level,
        },
    trustProxy: true,
  });

  // Conectar ao banco de dados e Redis
  await connectDatabase();
  await testRedisConnection();

  // Registrar plugins de segurança
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: config.server.isDevelopment ? true : ['https://app.fature.com', 'https://admin.fature.com'],
    credentials: true,
  });

  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.window,
    errorResponseBuilder: (request, context) => ({
      code: 'RATE_LIMIT_EXCEEDED',
      error: 'Rate limit exceeded',
      message: `Too many requests, please try again later. Limit: ${context.max} requests per window`,
      statusCode: 429,
    }),
  });

  // Registrar JWT
  await app.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      expiresIn: config.jwt.expiresIn,
    },
  });

  // Registrar Swagger para documentação da API
  await app.register(swagger, {
    swagger: {
      info: {
        title: 'Fature Backend API',
        description: 'API REST do Sistema de Afiliados Fature',
        version: '1.0.0',
      },
      host: config.server.isDevelopment ? `localhost:${config.server.port}` : 'api.fature.com',
      schemes: config.server.isDevelopment ? ['http'] : ['https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        Bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'JWT token. Format: Bearer {token}',
        },
      },
      security: [{ Bearer: [] }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Registrar rotas
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(affiliatesRoutes, { prefix: '/api/affiliates' });
  await app.register(testRoutes, { prefix: '/api/test' });
  await app.register(transactionsRoutes, { prefix: '/api/transactions' });

  // Health check endpoint
  app.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            environment: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.server.env,
    };
  });

  // Endpoint de informações da API
  app.get('/api/info', {
    schema: {
      description: 'API information endpoint',
      tags: ['Info'],
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            description: { type: 'string' },
            environment: { type: 'string' },
            documentation: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      name: 'Fature Backend API',
      version: '1.0.0',
      description: 'API REST do Sistema de Afiliados Fature',
      environment: config.server.env,
      documentation: '/docs',
    };
  });

  // Handler de erro global
  app.setErrorHandler(async (error, request, reply) => {
    app.log.error(error);

    // Erro de validação do Fastify
    if (error.validation) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        error: 'Validation failed',
        message: 'The request data is invalid',
        details: error.validation,
        statusCode: 400,
      });
    }

    // Erro de JWT
    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        error: 'Unauthorized',
        message: 'Missing or invalid authorization token',
        statusCode: 401,
      });
    }

    // Erro interno do servidor
    const statusCode = error.statusCode || 500;
    const response = {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      error: error.name || 'Internal Server Error',
      message: config.server.isDevelopment ? error.message : 'An internal server error occurred',
      statusCode,
    };

    if (config.server.isDevelopment) {
      (response as any).stack = error.stack;
    }

    return reply.status(statusCode).send(response);
  });

  // Handler para rotas não encontradas
  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      code: 'NOT_FOUND',
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
    });
  });

  return app;
}

/**
 * Inicia o servidor
 */
async function start(): Promise<void> {
  try {
    const app = await createApp();

    // Iniciar o servidor
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    app.log.info(`🚀 Servidor iniciado em http://${config.server.host}:${config.server.port}`);
    app.log.info(`📚 Documentação disponível em http://${config.server.host}:${config.server.port}/docs`);
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// Iniciar o servidor se este arquivo for executado diretamente
if (require.main === module) {
  start();
}

export { createApp, start };

