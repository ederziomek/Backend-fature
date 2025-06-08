import { config } from 'dotenv';

config();

export const externalDataConfig = {
  port: parseInt(process.env.EXTERNAL_DATA_PORT || '3006'),
  host: process.env.EXTERNAL_DATA_HOST || '0.0.0.0',
  
  // URL da base de dados externa
  externalApiUrl: process.env.EXTERNAL_DATA_API_URL || 'https://fature-database-production.up.railway.app',
  
  // Configurações de cache Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.CACHE_TTL || '300'), // 5 minutos
  },
  
  // Configurações de validação CPA
  cpaValidation: {
    minimumDepositAmount: parseFloat(process.env.MIN_DEPOSIT_AMOUNT || '50.00'),
    minimumBetsCount: parseInt(process.env.MIN_BETS_COUNT || '5'),
    validationPeriodDays: parseInt(process.env.VALIDATION_PERIOD_DAYS || '30'),
  },
  
  // Configurações de timeout para APIs externas
  apiTimeout: parseInt(process.env.API_TIMEOUT || '10000'), // 10 segundos
  
  // Configurações de retry
  retryConfig: {
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.RETRY_DELAY || '1000'), // 1 segundo
  },
  
  // Configurações de rate limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  },
  
  // Configurações de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
  },
};

