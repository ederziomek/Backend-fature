import Redis from 'ioredis';
import { config } from '@/config';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Configuração otimizada para Redis externo
const redisConfig = {
  // Timeouts otimizados para conexão externa
  connectTimeout: 15000,        // 15 segundos para conexão externa
  commandTimeout: 8000,         // 8 segundos para comandos
  
  // Configurações de retry moderadas (não precisamos mais de fallback complexo)
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  
  // Configurações de conexão estável
  lazyConnect: false,           // Conecta imediatamente
  enableReadyCheck: true,       // Verifica se Redis está pronto
  enableOfflineQueue: true,     // Mantém comandos em queue
  
  // Configuração de reconexão simples
  retryConnect: (times: number) => {
    if (times > 5) return null; // Para após 5 tentativas
    const delay = Math.min(times * 500, 3000); // Até 3 segundos
    console.log(`🔄 Reconectando Redis externo em ${delay}ms (tentativa ${times})`);
    return delay;
  },
  
  // Configurações de rede
  family: 4,                    // IPv4
  keepAlive: 30000,            // Keep-alive de 30 segundos
  keepAliveInitialDelay: 0,
  
  // Configurações para estabilidade
  enableAutoPipelining: false,  // Desabilita auto pipelining
  maxLoadingTimeout: 10000,     // 10 segundos para loading
};

// Criar instância Redis com configuração otimizada
export const redis = globalForRedis.redis ?? new Redis(config.redis.url, redisConfig);

// Event listeners para monitoramento
redis.on('connect', () => {
  console.log('✅ Redis externo conectado com sucesso');
});

redis.on('ready', () => {
  console.log('✅ Redis externo pronto para uso');
});

redis.on('error', (err: Error) => {
  console.error('❌ Erro Redis externo:', err.message);
});

redis.on('close', () => {
  console.log('⚠️ Conexão Redis externo fechada');
});

redis.on('reconnecting', (ms: number) => {
  console.log(`🔄 Reconectando Redis externo em ${ms}ms`);
});

redis.on('end', () => {
  console.log('🔚 Conexão Redis externo encerrada');
});

if (config.server.isDevelopment) globalForRedis.redis = redis;

// Função para testar conexão
export async function testRedisConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testando conexão Redis externo...');
    const result = await redis.ping();
    
    if (result === 'PONG') {
      console.log('✅ Redis externo respondeu: PONG');
      return true;
    } else {
      console.error('❌ Redis externo resposta inesperada:', result);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Erro ao testar Redis externo:', error.message);
    return false;
  }
}

// Função para desconectar
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.disconnect();
    console.log('✅ Redis externo desconectado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao desconectar Redis externo:', error);
  }
}

// Utilitários para cache
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Erro ao buscar cache:', error);
      return null;
    }
  },

  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar cache:', error);
      return false;
    }
  },

  async del(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar cache:', error);
      return false;
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Erro ao verificar cache:', error);
      return false;
    }
  }
};

// Inicialização automática
export function initializeRedis(): void {
  if (!config.server.isTest) {
    console.log('🚀 Inicializando Redis externo...');
    testRedisConnection()
      .then(success => {
        if (success) {
          console.log('🎉 Redis externo inicializado com sucesso!');
        } else {
          console.error('💥 Falha na inicialização do Redis externo');
        }
      })
      .catch(error => {
        console.error('💥 Erro crítico na inicialização Redis:', error);
      });
  }
}

// Chama inicialização
initializeRedis();

