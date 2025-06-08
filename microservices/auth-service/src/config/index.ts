// Configurações do ambiente
export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:senha123@localhost:5432/fature_auth_db',
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'auth:',
    sessionTtl: parseInt(process.env.REDIS_SESSION_TTL || '86400'), // 24 horas
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  messaging: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE || 'fature.events',
    deadLetterExchange: process.env.RABBITMQ_DEAD_LETTER_EXCHANGE || 'fature.dead-letter',
    retryCount: parseInt(process.env.RABBITMQ_RETRY_COUNT || '3'),
    initialRetryDelay: parseInt(process.env.RABBITMQ_INITIAL_RETRY_DELAY || '1000'),
    retryBackoffFactor: parseInt(process.env.RABBITMQ_RETRY_BACKOFF_FACTOR || '2'),
  },
  
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    window: process.env.RATE_LIMIT_WINDOW || '1 minute',
  },
  
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  },
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000'), // 15 minutos
  },
  
  service: {
    name: 'auth-service',
    version: '1.0.0',
  }
};

