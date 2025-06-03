import Redis from 'ioredis';
import { config } from '@/config';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Mock do Redis para fallback quando conexão falha
class RedisMock {
  private storage = new Map<string, { value: string; expiry?: number }>();

  async ping(): Promise<string> {
    return 'PONG';
  }

  async get(key: string): Promise<string | null> {
    const item = this.storage.get(key);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.storage.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: string): Promise<string> {
    this.storage.set(key, { value });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    const expiry = Date.now() + (seconds * 1000);
    this.storage.set(key, { value, expiry });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.storage.has(key);
    this.storage.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    const item = this.storage.get(key);
    if (!item) return 0;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.storage.delete(key);
      return 0;
    }
    
    return 1;
  }

  async disconnect(): Promise<void> {
    this.storage.clear();
  }

  on(): void {}
  off(): void {}
}

// Função para criar conexão Redis com fallback
async function createRedisConnection(): Promise<Redis | RedisMock> {
  try {
    console.log('🔍 Tentando conectar ao Redis...');
    
    const redisConfig = {
      connectTimeout: 10000,        // 10 segundos
      commandTimeout: 5000,         // 5 segundos
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 2,      // Reduz tentativas para falhar mais rápido
      lazyConnect: true,            // Conecta sob demanda
      enableReadyCheck: false,
      enableOfflineQueue: false,    // Não mantém queue offline
      family: 4,
      keepAlive: 30000,
      
      // Retry mais agressivo para falhar rápido
      retryConnect: (times: number) => {
        if (times > 3) return null; // Para após 3 tentativas
        return Math.min(times * 100, 1000);
      },
    };

    const redis = new Redis(config.redis.url, redisConfig);
    
    // Testa conexão com timeout
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);
    
    console.log('✅ Redis conectado com sucesso');
    
    // Event listeners apenas para logs
    redis.on('error', (err: Error) => {
      if (err.message.includes('ENOTFOUND')) {
        console.warn('⚠️ Problema de DNS Redis detectado - usando fallback');
      }
    });
    
    return redis;
    
  } catch (error: any) {
    console.warn('⚠️ Falha ao conectar Redis:', error.message);
    console.log('🔄 Usando Redis Mock (cache em memória local)');
    return new RedisMock();
  }
}

// Inicializar Redis com fallback
let redisInstance: Redis | RedisMock;

// Função para obter instância Redis
export async function getRedis(): Promise<Redis | RedisMock> {
  if (!redisInstance) {
    redisInstance = await createRedisConnection();
  }
  return redisInstance;
}

// Instância global para compatibilidade
export const redis = globalForRedis.redis ?? await getRedis();

if (config.server.isDevelopment) globalForRedis.redis = redis as Redis;

// Função para testar conexão (sempre retorna true com fallback)
export async function testRedisConnection(): Promise<boolean> {
  try {
    const redisClient = await getRedis();
    await redisClient.ping();
    
    if (redisClient instanceof RedisMock) {
      console.log('✅ Redis Mock ativo - funcionalidade limitada mas operacional');
    } else {
      console.log('✅ Redis real conectado com sucesso');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro crítico no Redis:', error);
    return false;
  }
}

// Função para desconectar
export async function disconnectRedis(): Promise<void> {
  try {
    if (redisInstance) {
      await redisInstance.disconnect();
      console.log('✅ Redis desconectado com sucesso');
    }
  } catch (error) {
    console.error('❌ Erro ao desconectar Redis:', error);
  }
}

// Utilitários para cache com fallback automático
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const redisClient = await getRedis();
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Erro ao buscar cache:', error);
      return null;
    }
  },

  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    try {
      const redisClient = await getRedis();
      await redisClient.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar cache:', error);
      return false;
    }
  },

  async del(key: string): Promise<boolean> {
    try {
      const redisClient = await getRedis();
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar cache:', error);
      return false;
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const redisClient = await getRedis();
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Erro ao verificar cache:', error);
      return false;
    }
  }
};

// Inicialização automática silenciosa
(async () => {
  if (!config.server.isTest) {
    console.log('🚀 Inicializando sistema de cache...');
    await testRedisConnection();
  }
})();

