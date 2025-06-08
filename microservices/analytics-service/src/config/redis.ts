import Redis from 'ioredis';
import { analyticsConfig } from './index';

let redis: Redis;

// Create Redis connection
function createRedisConnection(): Redis {
  const redisInstance = new Redis(analyticsConfig.redis.url, {
    db: analyticsConfig.redis.db,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000,
  });

  redisInstance.on('connect', () => {
    console.log('✅ Analytics Redis connected successfully');
  });

  redisInstance.on('error', (error) => {
    console.error('❌ Analytics Redis connection error:', error);
  });

  redisInstance.on('close', () => {
    console.log('🔴 Analytics Redis connection closed');
  });

  return redisInstance;
}

// Get Redis instance (singleton)
export function getRedis(): Redis {
  if (!redis) {
    redis = createRedisConnection();
  }
  return redis;
}

// Redis health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redisInstance = getRedis();
    const result = await redisInstance.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
  }
}

// Analytics Cache Helper Class
export class AnalyticsCache {
  private redis: Redis;
  private defaultTTL: number;

  constructor() {
    this.redis = getRedis();
    this.defaultTTL = analyticsConfig.analytics.cacheTimeout / 1000; // Convert to seconds
  }

  /**
   * Cache analytics data
   */
  async setAnalyticsData(key: string, data: any, ttl?: number): Promise<void> {
    const cacheKey = `analytics:${key}`;
    const serializedData = JSON.stringify(data);
    const cacheTTL = ttl || this.defaultTTL;
    
    await this.redis.setex(cacheKey, cacheTTL, serializedData);
  }

  /**
   * Get cached analytics data
   */
  async getAnalyticsData<T>(key: string): Promise<T | null> {
    const cacheKey = `analytics:${key}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (!cachedData) {
      return null;
    }
    
    try {
      return JSON.parse(cachedData) as T;
    } catch (error) {
      console.error('Error parsing cached analytics data:', error);
      return null;
    }
  }

  /**
   * Delete cached analytics data
   */
  async deleteAnalyticsData(key: string): Promise<void> {
    const cacheKey = `analytics:${key}`;
    await this.redis.del(cacheKey);
  }

  /**
   * Cache report data
   */
  async setReportData(reportId: string, data: any, ttl?: number): Promise<void> {
    const cacheKey = `report:${reportId}`;
    const serializedData = JSON.stringify(data);
    const cacheTTL = ttl || (analyticsConfig.analytics.reportCacheTimeout / 1000);
    
    await this.redis.setex(cacheKey, cacheTTL, serializedData);
  }

  /**
   * Get cached report data
   */
  async getReportData<T>(reportId: string): Promise<T | null> {
    const cacheKey = `report:${reportId}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (!cachedData) {
      return null;
    }
    
    try {
      return JSON.parse(cachedData) as T;
    } catch (error) {
      console.error('Error parsing cached report data:', error);
      return null;
    }
  }

  /**
   * Cache dashboard data
   */
  async setDashboardData(dashboardId: string, data: any, ttl?: number): Promise<void> {
    const cacheKey = `dashboard:${dashboardId}`;
    const serializedData = JSON.stringify(data);
    const cacheTTL = ttl || this.defaultTTL;
    
    await this.redis.setex(cacheKey, cacheTTL, serializedData);
  }

  /**
   * Get cached dashboard data
   */
  async getDashboardData<T>(dashboardId: string): Promise<T | null> {
    const cacheKey = `dashboard:${dashboardId}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (!cachedData) {
      return null;
    }
    
    try {
      return JSON.parse(cachedData) as T;
    } catch (error) {
      console.error('Error parsing cached dashboard data:', error);
      return null;
    }
  }

  /**
   * Cache metrics data
   */
  async setMetricsData(key: string, data: any, ttl?: number): Promise<void> {
    const cacheKey = `metrics:${key}`;
    const serializedData = JSON.stringify(data);
    const cacheTTL = ttl || this.defaultTTL;
    
    await this.redis.setex(cacheKey, cacheTTL, serializedData);
  }

  /**
   * Get cached metrics data
   */
  async getMetricsData<T>(key: string): Promise<T | null> {
    const cacheKey = `metrics:${key}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (!cachedData) {
      return null;
    }
    
    try {
      return JSON.parse(cachedData) as T;
    } catch (error) {
      console.error('Error parsing cached metrics data:', error);
      return null;
    }
  }

  /**
   * Increment counter (for real-time metrics)
   */
  async incrementCounter(key: string, value: number = 1): Promise<number> {
    const cacheKey = `counter:${key}`;
    return await this.redis.incrby(cacheKey, value);
  }

  /**
   * Get counter value
   */
  async getCounter(key: string): Promise<number> {
    const cacheKey = `counter:${key}`;
    const value = await this.redis.get(cacheKey);
    return value ? parseInt(value, 10) : 0;
  }

  /**
   * Set counter with expiration
   */
  async setCounterWithExpiry(key: string, value: number, ttl: number): Promise<void> {
    const cacheKey = `counter:${key}`;
    await this.redis.setex(cacheKey, ttl, value.toString());
  }

  /**
   * Clear all analytics cache
   */
  async clearAnalyticsCache(): Promise<void> {
    const keys = await this.redis.keys('analytics:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Clear all report cache
   */
  async clearReportCache(): Promise<void> {
    const keys = await this.redis.keys('report:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    analyticsKeys: number;
    reportKeys: number;
    dashboardKeys: number;
    metricsKeys: number;
    counterKeys: number;
    totalKeys: number;
  }> {
    const [analyticsKeys, reportKeys, dashboardKeys, metricsKeys, counterKeys] = await Promise.all([
      this.redis.keys('analytics:*'),
      this.redis.keys('report:*'),
      this.redis.keys('dashboard:*'),
      this.redis.keys('metrics:*'),
      this.redis.keys('counter:*'),
    ]);

    return {
      analyticsKeys: analyticsKeys.length,
      reportKeys: reportKeys.length,
      dashboardKeys: dashboardKeys.length,
      metricsKeys: metricsKeys.length,
      counterKeys: counterKeys.length,
      totalKeys: analyticsKeys.length + reportKeys.length + dashboardKeys.length + metricsKeys.length + counterKeys.length,
    };
  }
}

export { redis };
export default getRedis;

