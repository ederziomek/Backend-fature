import Redis from 'ioredis';
import { notificationConfig } from './index';

let redis: Redis;

// Create Redis connection
function createRedisConnection(): Redis {
  const redisInstance = new Redis(notificationConfig.redis.url, {
    db: notificationConfig.redis.db,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000,
  });

  redisInstance.on('connect', () => {
    console.log('Redis connected successfully');
  });

  redisInstance.on('ready', () => {
    console.log('Redis is ready to receive commands');
  });

  redisInstance.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  redisInstance.on('close', () => {
    console.log('Redis connection closed');
  });

  redisInstance.on('reconnecting', () => {
    console.log('Redis reconnecting...');
  });

  return redisInstance;
}

// Initialize Redis connection
redis = createRedisConnection();

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Cache helper functions
export class NotificationCache {
  private static readonly TEMPLATE_PREFIX = 'template:';
  private static readonly PREFERENCE_PREFIX = 'preference:';
  private static readonly STATS_PREFIX = 'stats:';
  private static readonly QUEUE_PREFIX = 'queue:';
  
  // Template caching
  static async getTemplate(templateId: string): Promise<string | null> {
    return await redis.get(`${this.TEMPLATE_PREFIX}${templateId}`);
  }
  
  static async setTemplate(templateId: string, template: string, ttl: number = 3600): Promise<void> {
    await redis.setex(`${this.TEMPLATE_PREFIX}${templateId}`, ttl, template);
  }
  
  static async deleteTemplate(templateId: string): Promise<void> {
    await redis.del(`${this.TEMPLATE_PREFIX}${templateId}`);
  }
  
  // User preferences caching
  static async getPreferences(userId: string): Promise<string | null> {
    return await redis.get(`${this.PREFERENCE_PREFIX}${userId}`);
  }
  
  static async setPreferences(userId: string, preferences: string, ttl: number = 1800): Promise<void> {
    await redis.setex(`${this.PREFERENCE_PREFIX}${userId}`, ttl, preferences);
  }
  
  static async deletePreferences(userId: string): Promise<void> {
    await redis.del(`${this.PREFERENCE_PREFIX}${userId}`);
  }
  
  // Statistics caching
  static async getStats(key: string): Promise<string | null> {
    return await redis.get(`${this.STATS_PREFIX}${key}`);
  }
  
  static async setStats(key: string, stats: string, ttl: number = 300): Promise<void> {
    await redis.setex(`${this.STATS_PREFIX}${key}`, ttl, stats);
  }
  
  // Queue management
  static async addToQueue(queueName: string, item: string): Promise<number> {
    return await redis.lpush(`${this.QUEUE_PREFIX}${queueName}`, item);
  }
  
  static async getFromQueue(queueName: string): Promise<string | null> {
    return await redis.rpop(`${this.QUEUE_PREFIX}${queueName}`);
  }
  
  static async getQueueLength(queueName: string): Promise<number> {
    return await redis.llen(`${this.QUEUE_PREFIX}${queueName}`);
  }
  
  static async clearQueue(queueName: string): Promise<void> {
    await redis.del(`${this.QUEUE_PREFIX}${queueName}`);
  }
  
  // Rate limiting
  static async checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await redis.incr(`ratelimit:${key}`);
    if (current === 1) {
      await redis.expire(`ratelimit:${key}`, window);
    }
    return current <= limit;
  }
  
  // Distributed locking
  static async acquireLock(lockKey: string, ttl: number = 30): Promise<boolean> {
    const result = await redis.set(`lock:${lockKey}`, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }
  
  static async releaseLock(lockKey: string): Promise<void> {
    await redis.del(`lock:${lockKey}`);
  }
}

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}

export { redis };
export default redis;

