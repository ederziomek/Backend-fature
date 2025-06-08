import { config } from 'dotenv';

config();

export const notificationConfig = {
  port: parseInt(process.env.NOTIFICATION_PORT || '3003', 10),
  host: process.env.NOTIFICATION_HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:senha123@localhost:5432/fature_notifications',
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    db: parseInt(process.env.REDIS_NOTIFICATION_DB || '3', 10),
  },
  
  // JWT para validação de tokens
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  // Email Configuration (SendGrid)
  email: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || 'noreply@fature100x.com',
    fromName: process.env.FROM_NAME || 'Fature 100x',
    replyTo: process.env.REPLY_TO_EMAIL || 'support@fature100x.com',
  },
  
  // SMS Configuration (Twilio)
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },
  
  // Push Notifications Configuration
  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@fature100x.com',
  },
  
  // Notification Settings
  notification: {
    retryAttempts: parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.NOTIFICATION_RETRY_DELAY || '5000', 10), // ms
    batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '100', 10),
    maxQueueSize: parseInt(process.env.NOTIFICATION_MAX_QUEUE_SIZE || '10000', 10),
    processingInterval: parseInt(process.env.NOTIFICATION_PROCESSING_INTERVAL || '5000', 10), // ms
  },
  
  // Rate Limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV === 'development',
  },
  
  // Health Check
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10), // ms
  },
  
  // External Services
  services: {
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    affiliateService: process.env.AFFILIATE_SERVICE_URL || 'http://localhost:3002',
    dataService: process.env.DATA_SERVICE_URL || 'http://localhost:3004',
  },
  
  // Webhook Configuration
  webhook: {
    secret: process.env.WEBHOOK_SECRET || 'notification-webhook-secret',
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '10000', 10), // ms
  },
  
  // Template Configuration
  templates: {
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'pt-BR',
    cacheTimeout: parseInt(process.env.TEMPLATE_CACHE_TIMEOUT || '3600000', 10), // ms (1 hour)
  },
};

