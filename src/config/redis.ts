import Redis from 'ioredis';
import { config } from '@/config';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Criar instância do Redis
export const redis = globalForRedis.redis ?? new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
});

if (config.server.isDevelopment) globalForRedis.redis = redis;

// Função para testar conexão
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    console.log('✅ Redis conectado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com Redis:', error);
    return false;
  }
}

// Função para desconectar
export async function disconnectRedis(): Promise<void> {
  await redis.disconnect();
}

// Utilitários para cache
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Erro ao buscar cache:', error);
      return null;
    }
  },

  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
      return false;
    }
  },

  async del(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Erro ao deletar cache:', error);
      return false;
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Erro ao verificar cache:', error);
      return false;
    }
  }
};

