import Redis from 'ioredis';
import { config } from '@/config';

// Configuração global do Redis
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Criar instância do Redis
export const redis = globalForRedis.redis ?? new Redis(config.redis.url, {
  password: config.redis.password,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
});

// Em desenvolvimento, reutilizar a instância
if (config.server.isDevelopment) {
  globalForRedis.redis = redis;
}

// Event listeners para Redis
redis.on('connect', () => {
  console.log('✅ Conectado ao Redis');
});

redis.on('ready', () => {
  console.log('✅ Redis pronto para uso');
});

redis.on('error', (error) => {
  console.error('❌ Erro no Redis:', error);
});

redis.on('close', () => {
  console.log('⚠️ Conexão com Redis fechada');
});

redis.on('reconnecting', () => {
  console.log('🔄 Reconectando ao Redis...');
});

// Função para conectar ao Redis
export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    console.log('✅ Conectado ao Redis');
  } catch (error) {
    console.error('❌ Erro ao conectar ao Redis:', error);
    throw error;
  }
}

// Função para desconectar do Redis
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.disconnect();
    console.log('✅ Desconectado do Redis');
  } catch (error) {
    console.error('❌ Erro ao desconectar do Redis:', error);
    throw error;
  }
}

// Função para verificar a saúde do Redis
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Redis não está saudável:', error);
    return false;
  }
}

// Utilitários para cache
export class CacheService {
  private static readonly DEFAULT_TTL = 3600; // 1 hora em segundos

  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Erro ao buscar cache para chave ${key}:`, error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl: number = CacheService.DEFAULT_TTL): Promise<boolean> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Erro ao definir cache para chave ${key}:`, error);
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error(`Erro ao deletar cache para chave ${key}:`, error);
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Erro ao verificar existência da chave ${key}:`, error);
      return false;
    }
  }

  static async increment(key: string, value: number = 1): Promise<number> {
    try {
      return await redis.incrby(key, value);
    } catch (error) {
      console.error(`Erro ao incrementar chave ${key}:`, error);
      throw error;
    }
  }

  static async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error(`Erro ao definir TTL para chave ${key}:`, error);
      return false;
    }
  }

  // Utilitário para cache de sessões
  static async setSession(sessionId: string, data: any, ttl: number = 86400): Promise<boolean> {
    return await CacheService.set(`session:${sessionId}`, data, ttl);
  }

  static async getSession<T>(sessionId: string): Promise<T | null> {
    return await CacheService.get<T>(`session:${sessionId}`);
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    return await CacheService.del(`session:${sessionId}`);
  }

  // Utilitário para rate limiting
  static async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, window);
      }
      
      const ttl = await redis.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime,
      };
    } catch (error) {
      console.error(`Erro ao verificar rate limit para chave ${key}:`, error);
      return { allowed: true, remaining: limit, resetTime: Date.now() + (window * 1000) };
    }
  }
}

export default redis;

