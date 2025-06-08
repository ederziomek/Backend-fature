// ===============================================
// CONFIGURAÇÃO PRINCIPAL - ADMIN SERVICE
// ===============================================

import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

export const adminConfig = {
  // Servidor
  server: {
    port: parseInt(process.env.PORT || '3003'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  // Banco de dados
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/fature100x'
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0')
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Segurança
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900'),
    corsOrigins: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL, process.env.BACKOFFICE_URL].filter(Boolean)
      : true
  },

  // Rate Limiting
  rateLimit: {
    global: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '1000'),
    admin: parseInt(process.env.RATE_LIMIT_ADMIN_MAX || '200')
  },

  // URLs dos frontends
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    backofficeUrl: process.env.BACKOFFICE_URL || 'http://localhost:5173'
  },

  // URLs dos microsserviços
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    affiliate: process.env.AFFILIATE_SERVICE_URL || 'http://localhost:3002',
    data: process.env.DATA_SERVICE_URL || 'http://localhost:3004',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006'
  },

  // Upload de arquivos
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(',')
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || 'admin@fature100x.com',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'admin@fature100x.com'
  },

  // Logs
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/admin-service.log',
    prettyPrint: process.env.NODE_ENV === 'development'
  },

  // Backup
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30')
  },

  // Monitoramento
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000')
  },

  // Sistema
  system: {
    name: process.env.SYSTEM_NAME || 'Fature 100x',
    version: process.env.SYSTEM_VERSION || '4.0',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@fature100x.com',
    supportEmail: process.env.SUPPORT_EMAIL || 'suporte@fature100x.com'
  }
};

// Validar configurações críticas
export function validateConfig(): void {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias não encontradas: ${missing.join(', ')}`);
  }
}

export default adminConfig;

