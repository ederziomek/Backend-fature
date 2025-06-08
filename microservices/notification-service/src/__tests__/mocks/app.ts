import Fastify, { FastifyInstance } from 'fastify';
import { notificationRoutes } from '@/routes/notification.routes';

// Mock do PrismaClient para testes
const mockPrismaClient = {
  notificationTemplate: {
    create: jest.fn().mockImplementation((data) => ({
      id: 'mock-template-id',
      ...data.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    findUnique: jest.fn().mockImplementation(({ where }) => {
      if (where.id === 'mock-template-id') {
        return {
          id: 'mock-template-id',
          name: 'Mock Template',
          type: 'EMAIL',
          subject: 'Mock Subject',
          content: 'Mock Content',
          variables: ['userName'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return null;
    }),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  notificationPreference: {
    findUnique: jest.fn().mockImplementation(({ where }) => ({
      id: 'mock-pref-id',
      userId: where.userId,
      email: true,
      sms: false,
      push: true,
      categories: ['WELCOME', 'CPA_COMMISSION'],
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    create: jest.fn().mockImplementation((data) => ({
      id: 'mock-pref-id',
      ...data.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    update: jest.fn().mockImplementation(({ where, data }) => ({
      id: 'mock-pref-id',
      userId: where.userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    upsert: jest.fn().mockImplementation(({ create, update }) => ({
      id: 'mock-pref-id',
      ...create,
      ...update,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  },
  notificationLog: {
    create: jest.fn().mockImplementation((data) => ({
      id: 'mock-log-id',
      ...data.data,
      status: 'SENT',
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    update: jest.fn().mockImplementation(({ where, data }) => ({
      id: where.id,
      ...data,
      updatedAt: new Date(),
    })),
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  notificationStats: {
    aggregate: jest.fn().mockResolvedValue({
      _sum: {
        totalSent: 100,
        totalDelivered: 85,
        totalFailed: 15,
      },
    }),
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  notificationBatch: {
    create: jest.fn().mockImplementation((data) => ({
      id: 'mock-batch-id',
      ...data.data,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    update: jest.fn(),
  },
  $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
  $disconnect: jest.fn(),
};

// Mock das configurações
jest.mock('@/config', () => ({
  notificationConfig: {
    port: 3003,
    host: '0.0.0.0',
    nodeEnv: 'test',
    database: {
      url: 'postgresql://test:test@localhost:5432/test_notifications',
    },
    redis: {
      url: 'redis://localhost:6379',
      db: 3,
    },
    email: {
      apiKey: 'test-sendgrid-key',
      fromEmail: 'test@example.com',
      fromName: 'Test',
      replyTo: 'test@example.com',
    },
    sms: {
      accountSid: 'test-twilio-sid',
      authToken: 'test-twilio-token',
      fromNumber: '+1234567890',
    },
    push: {
      vapidPublicKey: 'test-vapid-public',
      vapidPrivateKey: 'test-vapid-private',
      vapidSubject: 'mailto:test@example.com',
    },
    notification: {
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: 10,
      maxQueueSize: 100,
      processingInterval: 1000,
    },
    rateLimit: {
      max: 100,
      timeWindow: '1 minute',
    },
    logging: {
      level: 'silent',
      prettyPrint: false,
    },
    templates: {
      defaultLanguage: 'pt-BR',
      cacheTimeout: 3600000,
    },
  },
}));

// Mock do database
jest.mock('@/config/database', () => ({
  prisma: mockPrismaClient,
  checkDatabaseHealth: jest.fn().mockResolvedValue(true),
  disconnectDatabase: jest.fn(),
}));

// Mock do Redis
jest.mock('@/config/redis', () => ({
  redis: {
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
  },
  checkRedisHealth: jest.fn().mockResolvedValue(true),
  disconnectRedis: jest.fn(),
  NotificationCache: {
    getTemplate: jest.fn().mockResolvedValue(null),
    setTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    getPreferences: jest.fn().mockResolvedValue(null),
    setPreferences: jest.fn(),
    deletePreferences: jest.fn(),
  },
}));

// Mock do SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));

// Mock do Twilio
jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'mock-message-sid',
        status: 'sent',
      }),
    },
  }));
});

// Mock do Web Push
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({}),
}));

// Mock do Handlebars
jest.mock('handlebars', () => ({
  compile: jest.fn().mockImplementation((template) => {
    return jest.fn().mockImplementation((variables) => {
      let result = template;
      Object.keys(variables).forEach(key => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
      });
      return result;
    });
  }),
}));

// Função para construir a aplicação de teste
export function build(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  // Registrar rotas
  app.register(notificationRoutes, { prefix: '/api/v1' });

  // Rota raiz para testes
  app.get('/', async () => ({
    service: 'notification-service',
    version: '1.0.0',
    status: 'running',
  }));

  // Mock do PrismaClient no contexto da aplicação
  app.decorate('prisma', mockPrismaClient);

  return app;
}

// Exportar mocks para uso em outros testes
export {
  mockPrismaClient,
};

