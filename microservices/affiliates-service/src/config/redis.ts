import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis = globalForRedis.redis ?? new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
});

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// Event listeners para Redis
redis.on('connect', () => {
  console.log('✅ Conectado ao Redis');
});

redis.on('error', (error) => {
  console.error('❌ Erro no Redis:', error);
});

redis.on('close', () => {
  console.log('🔌 Conexão com Redis fechada');
});

redis.on('reconnecting', () => {
  console.log('🔄 Reconectando ao Redis...');
});

// Conectar ao Redis
redis.connect().catch((error) => {
  console.error('❌ Erro ao conectar ao Redis:', error);
});

// Utilitários para sessões
export const sessionUtils = {
  createSessionKey: (sessionId: string): string => `session:${sessionId}`,
  createUserSessionsKey: (userId: string): string => `user_sessions:${userId}`,
  createRateLimitKey: (userId: string): string => `rate_limit:${userId}`,
};

// Graceful shutdown
process.on('beforeExit', async () => {
  await redis.quit();
});

process.on('SIGINT', async () => {
  await redis.quit();
});

process.on('SIGTERM', async () => {
  await redis.quit();
});

