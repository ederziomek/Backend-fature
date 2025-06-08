// ===============================================
// CONFIGURAÇÃO - DATA SERVICE
// ===============================================

import dotenv from 'dotenv';
import { DataServiceConfig } from '../types';

dotenv.config();

export const config: DataServiceConfig = {
  port: parseInt(process.env.PORT || '3002'),
  host: process.env.HOST || '0.0.0.0',
  
  database: {
    host: process.env.PLATFORM_DB_HOST || 'localhost',
    port: parseInt(process.env.PLATFORM_DB_PORT || '5432'),
    database: process.env.PLATFORM_DB_NAME || 'fature_platform_db',
    username: process.env.PLATFORM_DB_USER || 'fature_user',
    password: process.env.PLATFORM_DB_PASSWORD || 'fature_password',
    ssl: process.env.PLATFORM_DB_SSL === 'true',
    pool_size: parseInt(process.env.PLATFORM_DB_POOL_SIZE || '10'),
    connection_timeout_ms: parseInt(process.env.PLATFORM_DB_TIMEOUT || '30000'),
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB || '4'),
    ttl_seconds: parseInt(process.env.REDIS_TTL || '3600'),
  },
  
  webhook: {
    affiliate_service_url: process.env.AFFILIATE_SERVICE_URL || 'http://localhost:3001',
    timeout_ms: parseInt(process.env.WEBHOOK_TIMEOUT || '10000'),
    max_retries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3'),
    retry_delay_ms: parseInt(process.env.WEBHOOK_RETRY_DELAY || '1000'),
    secret_key: process.env.WEBHOOK_SECRET_KEY || 'default_secret_key',
  },
  
  monitor: {
    polling_interval_ms: parseInt(process.env.MONITOR_POLLING_INTERVAL || '5000'), // 5 segundos
    batch_size: parseInt(process.env.MONITOR_BATCH_SIZE || '100'),
    max_retries: parseInt(process.env.MONITOR_MAX_RETRIES || '3'),
    retry_delay_ms: parseInt(process.env.MONITOR_RETRY_DELAY || '2000'),
    webhook_timeout_ms: parseInt(process.env.MONITOR_WEBHOOK_TIMEOUT || '15000'),
  },
  
  cpa_models: {
    model_1_1: {
      enabled: process.env.CPA_MODEL_1_1_ENABLED !== 'false',
      min_deposit_amount: parseFloat(process.env.CPA_MODEL_1_1_MIN_DEPOSIT || '30.00'),
    },
    model_1_2: {
      enabled: process.env.CPA_MODEL_1_2_ENABLED !== 'false',
      min_deposit_amount: parseFloat(process.env.CPA_MODEL_1_2_MIN_DEPOSIT || '30.00'),
      min_bet_count: parseInt(process.env.CPA_MODEL_1_2_MIN_BETS || '10'),
      min_ggr_amount: parseFloat(process.env.CPA_MODEL_1_2_MIN_GGR || '20.00'),
    },
  },
};

// Validação da configuração
export function validateConfig(): void {
  const required = [
    'PLATFORM_DB_HOST',
    'PLATFORM_DB_NAME',
    'PLATFORM_DB_USER',
    'PLATFORM_DB_PASSWORD',
    'AFFILIATE_SERVICE_URL',
    'WEBHOOK_SECRET_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias não encontradas: ${missing.join(', ')}`);
  }
  
  // Validações adicionais
  if (config.port < 1 || config.port > 65535) {
    throw new Error('PORT deve estar entre 1 e 65535');
  }
  
  if (config.database.pool_size < 1 || config.database.pool_size > 100) {
    throw new Error('PLATFORM_DB_POOL_SIZE deve estar entre 1 e 100');
  }
  
  if (config.monitor.polling_interval_ms < 1000) {
    throw new Error('MONITOR_POLLING_INTERVAL deve ser pelo menos 1000ms');
  }
  
  if (config.cpa_models.model_1_1.min_deposit_amount <= 0) {
    throw new Error('CPA_MODEL_1_1_MIN_DEPOSIT deve ser maior que 0');
  }
  
  if (config.cpa_models.model_1_2.min_deposit_amount <= 0) {
    throw new Error('CPA_MODEL_1_2_MIN_DEPOSIT deve ser maior que 0');
  }
  
  if (config.cpa_models.model_1_2.min_bet_count <= 0) {
    throw new Error('CPA_MODEL_1_2_MIN_BETS deve ser maior que 0');
  }
  
  if (config.cpa_models.model_1_2.min_ggr_amount <= 0) {
    throw new Error('CPA_MODEL_1_2_MIN_GGR deve ser maior que 0');
  }
}

export default config;

