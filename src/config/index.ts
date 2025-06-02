import dotenv from 'dotenv';
import { z } from 'zod';

// Carregar variáveis de ambiente
dotenv.config();

// Schema de validação das variáveis de ambiente
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  
  // Banco de dados
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Criptografia
  ENCRYPTION_KEY: z.string().min(32),
  
  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // SMS
  SMS_API_KEY: z.string().optional(),
  SMS_API_URL: z.string().url().optional(),
  
  // Plataforma externa
  PLATFORM_API_URL: z.string().url().optional(),
  PLATFORM_API_KEY: z.string().optional(),
  PLATFORM_WEBHOOK_SECRET: z.string().optional(),
  
  // Pagamento
  PAYMENT_API_URL: z.string().url().optional(),
  PAYMENT_API_KEY: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  
  // Rate limiting
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  RATE_LIMIT_WINDOW: z.string().default('15m'),
  
  // Logs
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),
  
  // Backup
  BACKUP_ENABLED: z.string().transform(val => val === 'true').default('true'),
  BACKUP_SCHEDULE: z.string().default('0 2 * * *'),
  BACKUP_RETENTION_DAYS: z.string().transform(Number).default('30'),
});

// Validar e exportar configurações
const env = envSchema.parse(process.env);

export const config = {
  // Servidor
  server: {
    env: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },
  
  // Banco de dados
  database: {
    url: env.DATABASE_URL,
  },
  
  // Redis
  redis: {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
  },
  
  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  
  // Criptografia
  encryption: {
    key: env.ENCRYPTION_KEY,
  },
  
  // Email
  email: {
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    from: env.EMAIL_FROM,
  },
  
  // SMS
  sms: {
    apiKey: env.SMS_API_KEY,
    apiUrl: env.SMS_API_URL,
  },
  
  // Plataforma externa
  platform: {
    apiUrl: env.PLATFORM_API_URL,
    apiKey: env.PLATFORM_API_KEY,
    webhookSecret: env.PLATFORM_WEBHOOK_SECRET,
  },
  
  // Pagamento
  payment: {
    apiUrl: env.PAYMENT_API_URL,
    apiKey: env.PAYMENT_API_KEY,
    webhookSecret: env.PAYMENT_WEBHOOK_SECRET,
  },
  
  // Rate limiting
  rateLimit: {
    max: env.RATE_LIMIT_MAX,
    window: env.RATE_LIMIT_WINDOW,
  },
  
  // Logs
  logging: {
    level: env.LOG_LEVEL,
    filePath: env.LOG_FILE_PATH,
  },
  
  // Backup
  backup: {
    enabled: env.BACKUP_ENABLED,
    schedule: env.BACKUP_SCHEDULE,
    retentionDays: env.BACKUP_RETENTION_DAYS,
  },
} as const;

export type Config = typeof config;

