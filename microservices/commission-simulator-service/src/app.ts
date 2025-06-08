// ===============================================
// APLICAÇÃO PRINCIPAL - COMMISSION SIMULATOR SERVICE
// ===============================================

import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import config from './config';
import { SimulatorController } from './controllers/simulator.controller';

// Inicializar dependências
const prisma = new PrismaClient();
const redis = new Redis(config.redis.url);

// Criar instância do Fastify
const fastify: FastifyInstance = Fastify({
  logger: {
    level: config.logging.level
  }
});

// Registrar plugins
async function registerPlugins() {
  // CORS
  await fastify.register(require('@fastify/cors'), {
    origin: true,
    credentials: true
  });

  // Helmet para segurança
  await fastify.register(require('@fastify/helmet'));

  // Rate limiting (mais restritivo devido à complexidade dos cálculos)
  await fastify.register(require('@fastify/rate-limit'), {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow
  });

  // JWT
  await fastify.register(require('@fastify/jwt'), {
    secret: config.jwt.secret
  });

  // Swagger
  await fastify.register(require('@fastify/swagger'), {
    swagger: {
      info: {
        title: config.swagger.title,
        description: config.swagger.description,
        version: config.swagger.version
      },
      host: `${config.server.host}:${config.server.port}`,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'simulations', description: 'Operações de simulação' },
        { name: 'analysis', description: 'Análises avançadas' },
        { name: 'optimization', description: 'Sugestões de otimização' },
        { name: 'validation', description: 'Validação de parâmetros' },
        { name: 'health', description: 'Health checks' }
      ]
    }
  });

  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });
}

// Registrar rotas
async function registerRoutes() {
  const simulatorController = new SimulatorController(prisma, redis);

  // Health check
  fastify.get('/health', {
    schema: {
      tags: ['health'],
      summary: 'Health check do serviço',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            service: { type: 'string' },
            version: { type: 'string' },
            calculations: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'commission-simulator-service',
      version: '1.0.0',
      calculations: {
        engine: 'active',
        cache: 'connected',
        database: 'connected'
      }
    };
  });

  // Rotas de simulação
  fastify.post('/simulator/run', {
    schema: {
      tags: ['simulations'],
      summary: 'Executar nova simulação completa',
      body: {
        type: 'object',
        required: ['affiliateId', 'simulationType', 'timeframe', 'parameters'],
        properties: {
          affiliateId: { type: 'string' },
          simulationType: { type: 'string', enum: ['cpa', 'revshare', 'hybrid', 'progression'] },
          timeframe: { type: 'string', enum: ['weekly', 'monthly', 'quarterly', 'annual', 'custom'] },
          parameters: { type: 'object' },
          scenarios: { type: 'array' }
        }
      }
    }
  }, simulatorController.runSimulation.bind(simulatorController));

  fastify.post('/simulator/quick-simulation', {
    schema: {
      tags: ['simulations'],
      summary: 'Executar simulação rápida com parâmetros básicos',
      body: {
        type: 'object',
        required: ['affiliateId', 'expectedIndications'],
        properties: {
          affiliateId: { type: 'string' },
          expectedIndications: { type: 'number', minimum: 0 },
          cpaRate: { type: 'number', minimum: 0 },
          revsharePercentage: { type: 'number', minimum: 0, maximum: 100 },
          timeframe: { type: 'string', enum: ['monthly', 'quarterly', 'annual'], default: 'monthly' }
        }
      }
    }
  }, simulatorController.quickSimulation.bind(simulatorController));

  fastify.get('/simulator/simulations/:simulationId', {
    schema: {
      tags: ['simulations'],
      summary: 'Buscar simulação específica',
      params: {
        type: 'object',
        properties: {
          simulationId: { type: 'string' }
        }
      }
    }
  }, simulatorController.getSimulation.bind(simulatorController));

  fastify.get('/simulator/affiliates/:affiliateId/simulations', {
    schema: {
      tags: ['simulations'],
      summary: 'Listar simulações de um afiliado',
      params: {
        type: 'object',
        properties: {
          affiliateId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
        }
      }
    }
  }, simulatorController.getAffiliateSimulations.bind(simulatorController));

  // Rotas de análise
  fastify.post('/simulator/progression-analysis', {
    schema: {
      tags: ['analysis'],
      summary: 'Analisar progressão de nível',
      body: {
        type: 'object',
        required: ['affiliateId', 'currentLevel', 'targetLevel'],
        properties: {
          affiliateId: { type: 'string' },
          currentLevel: { type: 'integer', minimum: 1 },
          targetLevel: { type: 'integer', minimum: 1 }
        }
      }
    }
  }, simulatorController.analyzeProgression.bind(simulatorController));

  fastify.post('/simulator/compare-strategies', {
    schema: {
      tags: ['analysis'],
      summary: 'Comparar múltiplas estratégias',
      body: {
        type: 'object',
        required: ['affiliateId', 'strategies'],
        properties: {
          affiliateId: { type: 'string' },
          strategies: { 
            type: 'array', 
            items: { type: 'string' },
            minItems: 2,
            maxItems: 5
          }
        }
      }
    }
  }, simulatorController.compareStrategies.bind(simulatorController));

  // Rotas de otimização
  fastify.get('/simulator/affiliates/:affiliateId/optimization-suggestions', {
    schema: {
      tags: ['optimization'],
      summary: 'Obter sugestões de otimização',
      params: {
        type: 'object',
        properties: {
          affiliateId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          simulationId: { type: 'string' }
        }
      }
    }
  }, simulatorController.getOptimizationSuggestions.bind(simulatorController));

  // Rotas de validação
  fastify.post('/simulator/validate-parameters', {
    schema: {
      tags: ['validation'],
      summary: 'Validar parâmetros de simulação',
      body: {
        type: 'object',
        properties: {
          expectedIndications: { type: 'number' },
          cpaRate: { type: 'number' },
          revsharePercentage: { type: 'number' },
          conversionRate: { type: 'number' },
          playerRetentionRate: { type: 'number' },
          averagePlayerValue: { type: 'number' },
          growthRate: { type: 'number' }
        }
      }
    }
  }, simulatorController.validateParameters.bind(simulatorController));
}

// Middleware de autenticação (opcional)
fastify.addHook('preHandler', async (request, reply) => {
  // Pular autenticação para health check e docs
  if (request.url === '/health' || request.url.startsWith('/docs')) {
    return;
  }

  // Em produção, validar JWT aqui
  // try {
  //   await request.jwtVerify();
  // } catch (err) {
  //   reply.send(err);
  // }
});

// Middleware de logging
fastify.addHook('onRequest', async (request, reply) => {
  request.log.info({
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent']
  }, 'Incoming request');
});

fastify.addHook('onResponse', async (request, reply) => {
  request.log.info({
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    responseTime: reply.getResponseTime()
  }, 'Request completed');
});

// Tratamento de erros
fastify.setErrorHandler(async (error, request, reply) => {
  request.log.error(error);

  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados de entrada inválidos',
        details: error.validation
      },
      meta: {
        timestamp: new Date()
      }
    });
  }

  // Erros específicos de simulação
  if (error.message.includes('calculation')) {
    return reply.status(422).send({
      success: false,
      error: {
        code: 'CALCULATION_ERROR',
        message: 'Erro nos cálculos da simulação',
        details: config.server.env === 'development' ? error.message : undefined
      },
      meta: {
        timestamp: new Date()
      }
    });
  }

  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor',
      details: config.server.env === 'development' ? error.message : undefined
    },
    meta: {
      timestamp: new Date()
    }
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  
  try {
    await fastify.close();
    await prisma.$disconnect();
    redis.disconnect();
    console.log('Commission Simulator service shut down successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Inicializar servidor
const start = async () => {
  try {
    await registerPlugins();
    await registerRoutes();

    await fastify.listen({
      port: config.server.port,
      host: config.server.host
    });

    console.log(`🚀 Commission Simulator Service running on http://${config.server.host}:${config.server.port}`);
    console.log(`📚 API Documentation available at http://${config.server.host}:${config.server.port}/docs`);
    console.log(`🧮 Calculation Engine: Active`);
    
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

// Iniciar apenas se executado diretamente
if (require.main === module) {
  start();
}

export default fastify;

