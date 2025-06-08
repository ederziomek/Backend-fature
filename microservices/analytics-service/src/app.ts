import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { analyticsConfig } from '@/config';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { getRedis, disconnectRedis } from '@/config/redis';
import { analyticsRoutes } from '@/routes/analytics.routes';

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: analyticsConfig.logging.level,
    transport: analyticsConfig.nodeEnv === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    } : undefined
  }
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: analyticsConfig.security.corsOrigins,
    credentials: true
  });

  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: analyticsConfig.rateLimit.max,
    timeWindow: analyticsConfig.rateLimit.timeWindow
  });

  // Swagger documentation
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'Analytics Service API',
        description: 'API para analytics e relatórios do Sistema Fature 100x',
        version: '1.0.0'
      },
      host: `${analyticsConfig.host}:${analyticsConfig.port}`,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'Analytics', description: 'Endpoints de analytics e métricas' },
        { name: 'Reports', description: 'Endpoints de relatórios' },
        { name: 'Charts', description: 'Endpoints de gráficos' },
        { name: 'Export', description: 'Endpoints de exportação' },
        { name: 'Metrics', description: 'Endpoints de métricas customizadas' },
        { name: 'Health', description: 'Endpoints de saúde do serviço' }
      ]
    }
  });

  // Swagger UI
  await fastify.register(swaggerUi, {
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

// Register routes
async function registerRoutes() {
  // API v1 routes
  await fastify.register(analyticsRoutes, { prefix: '/api/v1' });

  // Root endpoint
  fastify.get('/', async (request, reply) => {
    return {
      service: 'Analytics Service',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      docs: '/docs',
      health: '/api/v1/health'
    };
  });
}

// Error handler
fastify.setErrorHandler(async (error, request, reply) => {
  fastify.log.error(error);

  // Validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'Erro de validação',
      message: 'Dados inválidos fornecidos',
      details: error.validation
    });
  }

  // Rate limit errors
  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: 'Muitas requisições',
      message: 'Limite de taxa excedido. Tente novamente mais tarde.'
    });
  }

  // Database errors
  if (error.code === 'P2002') {
    return reply.status(409).send({
      error: 'Conflito de dados',
      message: 'Registro já existe'
    });
  }

  // Generic server error
  return reply.status(error.statusCode || 500).send({
    error: 'Erro interno do servidor',
    message: analyticsConfig.nodeEnv === 'development' ? error.message : 'Algo deu errado'
  });
});

// Not found handler
fastify.setNotFoundHandler(async (request, reply) => {
  return reply.status(404).send({
    error: 'Endpoint não encontrado',
    message: `Rota ${request.method} ${request.url} não existe`
  });
});

// Graceful shutdown
async function gracefulShutdown() {
  try {
    fastify.log.info('Iniciando shutdown graceful...');
    
    // Close server
    await fastify.close();
    
    // Disconnect from database
    await disconnectDatabase();
    
    // Disconnect from Redis
    await disconnectRedis();
    
    fastify.log.info('Shutdown graceful concluído');
    process.exit(0);
  } catch (error) {
    fastify.log.error('Erro durante shutdown graceful:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  fastify.log.fatal('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  fastify.log.fatal('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
async function start() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Initialize Redis
    getRedis();
    
    // Register plugins and routes
    await registerPlugins();
    await registerRoutes();
    
    // Start server
    await fastify.listen({
      port: analyticsConfig.port,
      host: analyticsConfig.host
    });
    
    fastify.log.info(`🚀 Analytics Service rodando em http://${analyticsConfig.host}:${analyticsConfig.port}`);
    fastify.log.info(`📚 Documentação disponível em http://${analyticsConfig.host}:${analyticsConfig.port}/docs`);
    
  } catch (error) {
    fastify.log.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Initialize application
if (require.main === module) {
  start();
}

export default fastify;
export { start };

