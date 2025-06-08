// ===============================================
// CONFIGURAÇÃO DO REDIS - ADMIN SERVICE
// ===============================================

import Redis from 'ioredis';
import { adminConfig } from './index';

// Instância global do Redis
export const redis = new Redis({
  host: adminConfig.redis.host,
  port: adminConfig.redis.port,
  password: adminConfig.redis.password || undefined,
  db: adminConfig.redis.db,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  keyPrefix: 'admin:',
});

/**
 * Conecta ao Redis
 */
export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    console.log('✅ Admin Service: Conectado ao Redis');
  } catch (error) {
    console.error('❌ Admin Service: Erro ao conectar ao Redis:', error);
    throw error;
  }
}

/**
 * Desconecta do Redis
 */
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.disconnect();
    console.log('✅ Admin Service: Desconectado do Redis');
  } catch (error) {
    console.error('❌ Admin Service: Erro ao desconectar do Redis:', error);
    throw error;
  }
}

/**
 * Verifica saúde do Redis
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Admin Service: Redis não está saudável:', error);
    return false;
  }
}

/**
 * Limpa cache específico
 */
export async function clearCache(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(`admin:${pattern}`);
    if (keys.length === 0) return 0;
    
    const result = await redis.del(...keys);
    console.log(`🧹 Admin Service: ${result} chaves removidas do cache`);
    return result;
  } catch (error) {
    console.error('❌ Admin Service: Erro ao limpar cache:', error);
    return 0;
  }
}

/**
 * Obtém estatísticas do Redis
 */
export async function getRedisStats(): Promise<any> {
  try {
    const info = await redis.info('memory');
    const keyspace = await redis.info('keyspace');
    
    return {
      memory: info,
      keyspace: keyspace,
      connected: redis.status === 'ready'
    };
  } catch (error) {
    console.error('❌ Admin Service: Erro ao obter estatísticas do Redis:', error);
    return null;
  }
}

// Eventos do Redis
redis.on('connect', () => {
  console.log('🔄 Admin Service: Conectando ao Redis...');
});

redis.on('ready', () => {
  console.log('✅ Admin Service: Redis pronto para uso');
});

redis.on('error', (error) => {
  console.error('❌ Admin Service: Erro no Redis:', error);
});

redis.on('close', () => {
  console.log('🔌 Admin Service: Conexão com Redis fechada');
});

redis.on('reconnecting', () => {
  console.log('🔄 Admin Service: Reconectando ao Redis...');
});

export default redis;

