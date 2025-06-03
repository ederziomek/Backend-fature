import Redis from 'ioredis';
import { config } from '@/config';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Configuração robusta para resolver problemas de DNS e conectividade
const redisConfig = {
  // Configurações de timeout aumentadas
  connectTimeout: 30000,        // 30 segundos para conectar
  commandTimeout: 10000,        // 10 segundos para comandos
  
  // Configurações de retry robustas
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 300,
  maxRetriesPerRequest: 5,      // Aumenta tentativas de 3 para 5
  
  // Configurações de conexão
  lazyConnect: false,           // Conecta imediatamente para detectar problemas
  enableReadyCheck: true,       // Habilita ready check
  enableOfflineQueue: true,     // Mantém comandos em queue durante reconexão
  
  // Configuração de reconexão personalizada
  retryConnect: (times: number) => {
    const delay = Math.min(times * 1000, 10000); // Até 10 segundos entre tentativas
    console.log(`🔄 Tentativa de reconexão Redis ${times} em ${delay}ms`);
    return delay;
  },
  
  // Configurações de família de endereços (força IPv4)
  family: 4,
  
  // Configurações de keep-alive (corrigido para number)
  keepAlive: 30000,             // 30 segundos
  keepAliveInitialDelay: 0,
  
  // Configurações adicionais para estabilidade
  maxLoadingTimeout: 5000,
  enableAutoPipelining: false,  // Desabilita auto pipelining para evitar problemas
};

// Criar instância do Redis com configuração robusta
export const redis = globalForRedis.redis ?? new Redis(config.redis.url, redisConfig);

// Event listeners para monitoramento detalhado
redis.on('connect', () => {
  console.log('✅ Redis conectado com sucesso');
});

redis.on('ready', () => {
  console.log('✅ Redis pronto para uso');
});

redis.on('error', (err: Error) => {
  console.error('❌ Erro Redis:', err.message);
  // Log adicional para problemas de DNS
  if (err.message.includes('ENOTFOUND')) {
    console.error('🔍 Problema de DNS detectado. Verificando configuração de rede...');
  }
});

redis.on('close', () => {
  console.log('⚠️ Conexão Redis fechada');
});

redis.on('reconnecting', (ms: number) => {
  console.log(`🔄 Reconectando Redis em ${ms}ms`);
});

redis.on('end', () => {
  console.log('🔚 Conexão Redis encerrada');
});

if (config.server.isDevelopment) globalForRedis.redis = redis;

// Função para testar conexão com retry automático
export async function testRedisConnection(): Promise<boolean> {
  const maxAttempts = 5;
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    try {
      console.log(`🔍 Testando conexão Redis (tentativa ${attempt}/${maxAttempts})`);
      await redis.ping();
      console.log('✅ Redis conectado com sucesso');
      return true;
    } catch (error: any) {
      console.error(`❌ Tentativa ${attempt} falhou:`, error.message);
      
      if (attempt === maxAttempts) {
        console.error('❌ Todas as tentativas de conexão Redis falharam');
        console.error('🔧 Sugestões:');
        console.error('   1. Verificar se o serviço Redis está ativo');
        console.error('   2. Verificar variável REDIS_URL');
        console.error('   3. Verificar conectividade de rede');
        return false;
      }
      
      // Aguarda antes da próxima tentativa
      const delay = attempt * 2000; // 2s, 4s, 6s, 8s
      console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
  
  return false;
}

// Função para desconectar
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.disconnect();
    console.log('✅ Redis desconectado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao desconectar Redis:', error);
  }
}

// Utilitários para cache com fallback resiliente
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

// Inicialização automática com retry
(async () => {
  if (!config.server.isTest) {
    console.log('🚀 Inicializando conexão Redis...');
    const connected = await testRedisConnection();
    if (!connected) {
      console.warn('⚠️ Redis não conectado - aplicação continuará sem cache');
    }
  }
})();

