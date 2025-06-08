import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { affiliateRoutes } from '@/routes/affiliate.routes';
import { affiliateRateLimit } from '@/middleware/auth.middleware';

const app: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    } : undefined
  }
});

async function buildApp(): Promise<FastifyInstance> {
  // Configurar CORS
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://app.fature100x.com']
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // Configurar segurança
  await app.register(helmet, {
    contentSecurityPolicy: false
  });

  // Configurar rate limiting global
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    errorResponseBuilder: function (request, context) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        statusCode: 429,
        retryAfter: context.ttl
      };
    }
  });

  // Configurar Swagger
  await app.register(swagger, {
    swagger: {
      info: {
        title: 'Fature 100x - Microsserviço de Afiliados',
        description: 'API para gestão de afiliados, comissões CPA e hierarquia MLM',
        version: '1.0.0',
        contact: {
          name: 'Manus AI',
          email: 'manus@ai.com'
        }
      },
      host: process.env.API_HOST || 'localhost:3002',
      schemes: process.env.NODE_ENV === 'production' ? ['https'] : ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        {
          name: 'Afiliados',
          description: 'Operações de gestão de afiliados'
        },
        {
          name: 'MLM',
          description: 'Operações de hierarquia e estrutura MLM'
        },
        {
          name: 'Comissões',
          description: 'Operações de cálculo e gestão de comissões'
        },
        {
          name: 'Relatórios',
          description: 'Geração de relatórios e métricas'
        }
      ],
      securityDefinitions: {
        Bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'Token JWT no formato: Bearer <token>'
        }
      },
      security: [
        {
          Bearer: []
        }
      ]
    }
  });

  // Configurar Swagger UI
  await app.register(swaggerUi, {
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

  // Health check
  app.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Verifica se o serviço está funcionando',
      response: {
        200: {
          description: 'Serviço funcionando',
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            service: { type: 'string', example: 'affiliates-service' },
            version: { type: 'string', example: '1.0.0' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      status: 'ok',
      service: 'affiliates-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  });

  // Registrar rotas de afiliados
  await app.register(affiliateRoutes, { prefix: '/api/v1' });

  // Handler de erro global
  app.setErrorHandler(async (error, request, reply) => {
    app.log.error(error);

    // Erro de validação
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: 'Dados de entrada inválidos',
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

    // Erro interno
    return reply.status(500).send({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Erro interno do servidor' 
        : error.message,
      statusCode: 500
    });
  });

  // Handler para rotas não encontradas
  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      success: false,
      error: 'Rota não encontrada',
      statusCode: 404
    });
  });

  return app;
}

// Inicializar servidor
async function start() {
  try {
    const server = await buildApp();
    
    const port = parseInt(process.env.PORT || '3002');
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    
    server.log.info(`🚀 Microsserviço de Afiliados rodando em http://${host}:${port}`);
    server.log.info(`📚 Documentação disponível em http://${host}:${port}/docs`);
    server.log.info(`🏥 Health check disponível em http://${host}:${port}/health`);
    
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Recebido SIGINT, encerrando servidor...');
  await app.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Recebido SIGTERM, encerrando servidor...');
  await app.close();
  process.exit(0);
});

if (require.main === module) {
  start();
}

export { buildApp };
export default app;

