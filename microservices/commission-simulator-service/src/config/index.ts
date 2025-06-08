// ===============================================
// CONFIGURAÇÕES - COMMISSION SIMULATOR SERVICE
// ===============================================

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Servidor
  server: {
    port: parseInt(process.env.SIMULATOR_SERVICE_PORT || '3007'),
    host: process.env.SIMULATOR_SERVICE_HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // Banco de dados
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:senha123@localhost:5432/fature_db'
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'simulator:',
    defaultTTL: 604800 // 7 dias
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'commission-simulator-secret-key',
    expiresIn: '24h'
  },

  // Rate Limiting
  rateLimit: {
    max: 50, // Menor limite devido à complexidade dos cálculos
    timeWindow: '1 minute'
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  // Simulador específicos
  simulator: {
    // Configurações de cache
    cache: {
      simulationTTL: 604800, // 7 dias
      historicalDataTTL: 3600, // 1 hora
      marketDataTTL: 1800, // 30 minutos
      optimizationTTL: 3600 // 1 hora
    },

    // Limites de simulação
    limits: {
      maxSimulationsPerAffiliate: 100,
      maxProjectionPeriods: 24, // 2 anos mensais
      maxScenariosPerSimulation: 10,
      maxStrategiesComparison: 5
    },

    // Parâmetros padrão
    defaults: {
      conversionRate: 0.3,
      playerRetentionRate: 0.7,
      averagePlayerValue: 500,
      growthRate: 0.05, // 5% ao mês
      seasonalityFactor: 1.0,
      marketTrends: 1.0
    },

    // Configurações de cálculo
    calculation: {
      confidenceDecayRate: 0.1, // 10% por período
      minimumConfidence: 0.3,
      volatilityThreshold: 0.4,
      riskThresholds: {
        low: 0.2,
        medium: 0.4,
        high: 0.6
      }
    },

    // Configurações de progressão
    progression: {
      baseCpaRate: 50, // R$ 50 base
      baseRevshareRate: 25, // 25% base
      levelMultiplier: 1.2, // 20% por nível
      maxLevel: 10
    },

    // Configurações de otimização
    optimization: {
      indicationCostPerUnit: 20, // R$ 20 por indicação
      conversionImpactMultiplier: 10000,
      retentionImpactMultiplier: 5000,
      levelProgressionMultiplier: 1000
    }
  },

  // Integração com APIs externas
  external: {
    marketDataAPI: {
      url: process.env.MARKET_DATA_API_URL || 'https://api.marketdata.com',
      apiKey: process.env.MARKET_DATA_API_KEY || '',
      timeout: 10000
    },
    economicIndicatorsAPI: {
      url: process.env.ECONOMIC_API_URL || 'https://api.economic.com',
      apiKey: process.env.ECONOMIC_API_KEY || '',
      timeout: 10000
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
    analyticsService: {
      url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3004',
      timeout: 5000
    },
    notificationService: {
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
      timeout: 5000
    }
  },

  // Swagger
  swagger: {
    title: 'Commission Simulator Service API',
    description: 'API do Microsserviço Simulador de Comissões do Sistema Fature 100x',
    version: '1.0.0'
  }
};

export default config;

