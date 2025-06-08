import Redis from 'ioredis';
import { config } from './index';

// Instância global do Redis
export const redis = new Redis(config.redis.url, {
  keyPrefix: config.redis.keyPrefix,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

/**
 * Conecta ao Redis
 */
export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    console.log('✅ Conectado ao Redis');
  } catch (error) {
    console.error('❌ Erro ao conectar ao Redis:', error);
    throw error;
  }
}

/**
 * Desconecta do Redis
 */
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.disconnect();
    console.log('✅ Desconectado do Redis');
  } catch (error) {
    console.error('❌ Erro ao desconectar do Redis:', error);
    throw error;
  }
}

/**
 * Testa a conexão com o Redis
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Teste de conexão com Redis falhou:', error);
    return false;
  }
}

/**
 * Utilitários para sessões
 */
export const sessionUtils = {
  /**
   * Salva uma sessão no Redis
   */
  async saveSession(sessionId: string, data: any, ttl: number = config.redis.sessionTtl): Promise<void> {
    await redis.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
  },

  /**
   * Recupera uma sessão do Redis
   */
  async getSession(sessionId: string): Promise<any | null> {
    const data = await redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Remove uma sessão do Redis
   */
  async deleteSession(sessionId: string): Promise<void> {
    await redis.del(`session:${sessionId}`);
  },

  /**
   * Atualiza TTL de uma sessão
   */
  async refreshSession(sessionId: string, ttl: number = config.redis.sessionTtl): Promise<void> {
    await redis.expire(`session:${sessionId}`, ttl);
  }
};

