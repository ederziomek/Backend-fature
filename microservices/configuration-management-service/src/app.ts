import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { configurationRoutes } from './routes/configurationRoutes';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

async function buildApp() {
  try {
    // Registrar plugins de segurança
    await fastify.register(helmet, {
      contentSecurityPolicy: false
    });

    await fastify.register(cors, {
      origin: true,
      credentials: true
    });

    // Registrar Swagger para documentação
    await fastify.register(swagger, {
      swagger: {
        info: {
          title: 'Configuration Management Service API',
          description: 'Microserviço de Gerenciamento de Configurações do Sistema Fature',
          version: '1.0.0'
        },
        host: process.env.HOST || 'localhost:3001',
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
          { name: 'Configuration', description: 'Configuration management endpoints' }
        ]
      }
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      }
    });

    // Registrar rotas
    await fastify.register(configurationRoutes, { prefix: '/api' });

    // Handler de erro global
    fastify.setErrorHandler((error, request, reply) => {
      fastify.log.error(error);
      
      if (error.validation) {
        reply.status(400).send({
          error: 'Validation Error',
          message: error.message,
          details: error.validation
        });
        return;
      }

      reply.status(500).send({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
      });
    });

    // Handler de rota não encontrada
    fastify.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} not found`
      });
    });

    return fastify;
  } catch (error) {
    fastify.log.error('Error building app:', error);
    throw error;
  }
}

async function start() {
  try {
    const app = await buildApp();
    
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    
    app.log.info(`Configuration Management Service running on http://${host}:${port}`);
    app.log.info(`API Documentation available at http://${host}:${port}/docs`);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await fastify.close();
    console.log('Server closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    await fastify.close();
    console.log('Server closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

if (require.main === module) {
  start();
}

export { buildApp, start };

