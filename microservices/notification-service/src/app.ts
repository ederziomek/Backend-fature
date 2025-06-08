import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { notificationConfig } from '@/config';
import { notificationRoutes } from '@/routes/notification.routes';
import { checkDatabaseHealth, disconnectDatabase } from '@/config/database';
import { checkRedisHealth, disconnectRedis } from '@/config/redis';

// Criar instância do Fastify
const fastify = Fastify({
  logger: {
    level: notificationConfig.logging.level,
    transport: notificationConfig.logging.prettyPrint ? {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    } : undefined,
  },
});

// Configurar CORS
fastify.register(cors, {
  origin: true, // Permitir todas as origens em desenvolvimento
  credentials: true,
});

// Configurar Helmet para segurança
fastify.register(helmet, {
  contentSecurityPolicy: false, // Desabilitar CSP para Swagger UI
});

// Configurar Rate Limiting
fastify.register(rateLimit, {
  max: notificationConfig.rateLimit.max,
  timeWindow: notificationConfig.rateLimit.timeWindow,
});

// Configurar Swagger para documentação
fastify.register(swagger, {
  swagger: {
    info: {
      title: 'Notification Service API',
      description: 'API do Microsserviço de Notificações do Sistema Fature 100x',
      version: '1.0.0',
    },
    host: `${notificationConfig.host}:${notificationConfig.port}`,
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'Notifications', description: 'Operações de notificação' },
      { name: 'Templates', description: 'Gerenciamento de templates' },
      { name: 'Preferences', description: 'Preferências de usuário' },
      { name: 'Health', description: 'Verificação de saúde' },
    ],
  },
});

// Configurar Swagger UI
fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
});

// Registrar rotas
fastify.register(notificationRoutes, { prefix: '/api/v1' });

// Rota raiz
fastify.get('/', async (request, reply) => {
  return {
    service: 'notification-service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    docs: '/docs',
    health: '/api/v1/health',
  };
});

// Hook para verificar saúde na inicialização
fastify.addHook('onReady', async () => {
  console.log('🚀 Notification Service iniciado');
  console.log(`📡 Servidor rodando em http://${notificationConfig.host}:${notificationConfig.port}`);
  console.log(`📚 Documentação disponível em http://${notificationConfig.host}:${notificationConfig.port}/docs`);
  
  // Verificar conexões essenciais
  const dbHealth = await checkDatabaseHealth();
  const redisHealth = await checkRedisHealth();
  
  console.log(`🗄️  Database: ${dbHealth ? '✅ Conectado' : '❌ Falha na conexão'}`);
  console.log(`🔴 Redis: ${redisHealth ? '✅ Conectado' : '❌ Falha na conexão'}`);
  
  if (!dbHealth || !redisHealth) {
    console.warn('⚠️  Algumas dependências não estão disponíveis');
  }
});

// Hook para limpeza na finalização
fastify.addHook('onClose', async () => {
  console.log('🛑 Finalizando Notification Service...');
  
  try {
    await disconnectDatabase();
    console.log('🗄️  Database desconectado');
  } catch (error) {
    console.error('❌ Erro ao desconectar database:', error);
  }
  
  try {
    await disconnectRedis();
    console.log('🔴 Redis desconectado');
  } catch (error) {
    console.error('❌ Erro ao desconectar Redis:', error);
  }
  
  console.log('✅ Notification Service finalizado');
});

// Tratamento de erros globais
fastify.setErrorHandler((error, request, reply) => {
  console.error('❌ Erro não tratado:', error);
  
  // Erro de validação
  if (error.validation) {
    return reply.status(400).send({
      error: 'Dados inválidos',
      message: error.message,
      details: error.validation,
    });
  }
  
  // Erro de rate limit
  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: 'Muitas requisições',
      message: 'Limite de requisições excedido. Tente novamente em alguns minutos.',
    });
  }
  
  // Erro interno
  return reply.status(500).send({
    error: 'Erro interno do servidor',
    message: notificationConfig.nodeEnv === 'development' ? error.message : 'Algo deu errado',
  });
});

// Tratamento de rotas não encontradas
fastify.setNotFoundHandler((request, reply) => {
  return reply.status(404).send({
    error: 'Rota não encontrada',
    message: `Rota ${request.method} ${request.url} não existe`,
    availableRoutes: {
      docs: '/docs',
      health: '/api/v1/health',
      notifications: '/api/v1/notifications/*',
      templates: '/api/v1/templates/*',
      preferences: '/api/v1/preferences/*',
    },
  });
});

// Função para iniciar o servidor
async function start() {
  try {
    await fastify.listen({
      port: notificationConfig.port,
      host: notificationConfig.host,
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Tratamento de sinais do sistema
process.on('SIGINT', async () => {
  console.log('\n🛑 Recebido SIGINT, finalizando servidor...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recebido SIGTERM, finalizando servidor...');
  await fastify.close();
  process.exit(0);
});

// Tratamento de exceções não capturadas
process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

// Iniciar servidor se este arquivo for executado diretamente
if (require.main === module) {
  start();
}

export { fastify };
export default fastify;

