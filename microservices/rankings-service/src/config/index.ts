// ===============================================
// CONFIGURAÇÕES - RANKINGS SERVICE
// ===============================================

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Servidor
  server: {
    port: parseInt(process.env.RANKINGS_SERVICE_PORT || '3006'),
    host: process.env.RANKINGS_SERVICE_HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // Banco de dados
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:senha123@localhost:5432/fature_db'
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'rankings:',
    defaultTTL: 3600 // 1 hora
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'rankings-service-secret-key',
    expiresIn: '24h'
  },

  // Rate Limiting
  rateLimit: {
    max: 100,
    timeWindow: '1 minute'
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  // Rankings específicos
  rankings: {
    // Configurações de atualização
    updateFrequency: {
      realtime: 0, // Imediato
      hourly: 3600, // 1 hora
      daily: 86400 // 24 horas
    },

    // Configurações de cache
    cache: {
      leaderboardTTL: 300, // 5 minutos
      scoreTTL: 300, // 5 minutos
      competitionTTL: 3600, // 1 hora
      statsTTL: 1800 // 30 minutos
    },

    // Limites
    limits: {
      maxParticipants: 10000,
      maxCompetitionsPerAffiliate: 50,
      maxLeaderboardSize: 1000,
      maxPrizesPerCompetition: 20
    },

    // Configurações de pontuação padrão
    defaultScoring: {
      indicationsWeight: 0.4,
      revenueWeight: 0.3,
      networkGrowthWeight: 0.15,
      qualityWeight: 0.1,
      retentionWeight: 0.05
    },

    // Configurações de prêmios padrão
    defaultPrizes: {
      cashPrizePercentage: 60,
      bonusPrizePercentage: 25,
      commissionBoostPercentage: 15
    },

    // Configurações de competição
    competition: {
      minDurationDays: 7,
      maxDurationDays: 365,
      defaultDurationDays: 30,
      autoArchiveAfterDays: 90
    }
  },

  // Integração com outros serviços
  services: {
    authService: {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      timeout: 5000
    },
    affiliatesService: {
      url: process.env.AFFILIATES_SERVICE_URL || 'http://localhost:3002',
      timeout: 5000
    },
    notificationService: {
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
      timeout: 5000
    }
  },

  // Swagger
  swagger: {
    title: 'Rankings Service API',
    description: 'API do Microsserviço de Rankings Avançados do Sistema Fature 100x',
    version: '1.0.0'
  }
};

export default config;

