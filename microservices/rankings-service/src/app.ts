// ===============================================
// APLICAÇÃO PRINCIPAL - RANKINGS SERVICE
// ===============================================

import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import config from './config';
import { RankingsController } from './controllers/rankings.controller';

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

  // Rate limiting
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
        { name: 'competitions', description: 'Operações de competições' },
        { name: 'rankings', description: 'Operações de rankings' },
        { name: 'leaderboards', description: 'Operações de leaderboards' },
        { name: 'prizes', description: 'Operações de prêmios' },
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
  const rankingsController = new RankingsController(prisma, redis);

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
            version: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'rankings-service',
      version: '1.0.0'
    };
  });

  // Rotas de competições
  fastify.post('/rankings/competitions', {
    schema: {
      tags: ['competitions'],
      summary: 'Criar nova competição',
      body: {
        type: 'object',
        required: ['name', 'description', 'type', 'startDate', 'endDate', 'rules', 'prizes'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['weekly', 'monthly', 'quarterly', 'annual', 'custom'] },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          rules: { type: 'object' },
          prizes: { type: 'array' }
        }
      }
    }
  }, rankingsController.createCompetition.bind(rankingsController));

  fastify.get('/rankings/competitions', {
    schema: {
      tags: ['competitions'],
      summary: 'Listar competições',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          type: { type: 'string' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    }
  }, rankingsController.getCompetitions.bind(rankingsController));

  fastify.get('/rankings/competitions/:competitionId', {
    schema: {
      tags: ['competitions'],
      summary: 'Buscar competição específica',
      params: {
        type: 'object',
        properties: {
          competitionId: { type: 'string' }
        }
      }
    }
  }, rankingsController.getCompetition.bind(rankingsController));

  // Rotas de leaderboards
  fastify.get('/rankings/competitions/:competitionId/leaderboard', {
    schema: {
      tags: ['leaderboards'],
      summary: 'Buscar leaderboard de uma competição',
      params: {
        type: 'object',
        properties: {
          competitionId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 1000, default: 50 },
          affiliateId: { type: 'string' }
        }
      }
    }
  }, rankingsController.getLeaderboard.bind(rankingsController));

  // Rotas de pontuação
  fastify.put('/rankings/competitions/:competitionId/scores/:affiliateId', {
    schema: {
      tags: ['rankings'],
      summary: 'Atualizar pontuação de um afiliado',
      params: {
        type: 'object',
        properties: {
          competitionId: { type: 'string' },
          affiliateId: { type: 'string' }
        }
      }
    }
  }, rankingsController.updateScore.bind(rankingsController));

  fastify.post('/rankings/competitions/:competitionId/recalculate', {
    schema: {
      tags: ['rankings'],
      summary: 'Recalcular rankings de uma competição',
      params: {
        type: 'object',
        properties: {
          competitionId: { type: 'string' }
        }
      }
    }
  }, rankingsController.recalculateRankings.bind(rankingsController));

  // Rotas de finalização
  fastify.post('/rankings/competitions/:competitionId/finalize', {
    schema: {
      tags: ['competitions'],
      summary: 'Finalizar competição e distribuir prêmios',
      params: {
        type: 'object',
        properties: {
          competitionId: { type: 'string' }
        }
      }
    }
  }, rankingsController.finalizeCompetition.bind(rankingsController));

  // Rotas de prêmios
  fastify.post('/rankings/competitions/:competitionId/distribute-prizes', {
    schema: {
      tags: ['prizes'],
      summary: 'Distribuir prêmios manualmente',
      params: {
        type: 'object',
        properties: {
          competitionId: { type: 'string' }
        }
      }
    }
  }, rankingsController.distributePrizes.bind(rankingsController));

  fastify.get('/rankings/competitions/:competitionId/distributions', {
    schema: {
      tags: ['prizes'],
      summary: 'Listar distribuições de prêmios',
      params: {
        type: 'object',
        properties: {
          competitionId: { type: 'string' }
        }
      }
    }
  }, rankingsController.getDistributions.bind(rankingsController));

  // Rotas de estatísticas
  fastify.get('/rankings/competitions/:competitionId/stats', {
    schema: {
      tags: ['competitions'],
      summary: 'Buscar estatísticas de uma competição',
      params: {
        type: 'object',
        properties: {
          competitionId: { type: 'string' }
        }
      }
    }
  }, rankingsController.getCompetitionStats.bind(rankingsController));

  // Rotas de afiliados
  fastify.get('/rankings/affiliates/:affiliateId/position', {
    schema: {
      tags: ['rankings'],
      summary: 'Buscar posição de um afiliado',
      params: {
        type: 'object',
        properties: {
          affiliateId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          competitionId: { type: 'string' }
        }
      }
    }
  }, rankingsController.getAffiliatePosition.bind(rankingsController));
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
    console.log('Rankings service shut down successfully');
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

    console.log(`🚀 Rankings Service running on http://${config.server.host}:${config.server.port}`);
    console.log(`📚 API Documentation available at http://${config.server.host}:${config.server.port}/docs`);
    
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

