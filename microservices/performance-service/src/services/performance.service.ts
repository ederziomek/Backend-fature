import { createClient, RedisClientType } from 'redis';
import { performanceConfig } from '../config/config';

export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

export interface PerformanceMetrics {
  cacheHitRate: number;
  cacheMissRate: number;
  averageResponseTime: number;
  totalRequests: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

export class PerformanceService {
  private redisClient: RedisClientType;
  private cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };
  private requestMetrics: Array<{
    timestamp: Date;
    responseTime: number;
    success: boolean;
  }> = [];

  constructor() {
    this.redisClient = createClient({
      url: performanceConfig.redis.url,
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.redisClient.connect();
      console.log('✅ Performance Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Performance Service:', error);
      throw error;
    }
  }

  // Cache inteligente com TTL dinâmico
  async smartCache<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
      priority?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<T> {
    const cacheKey = `smart:${key}`;
    
    try {
      // Tentar buscar do cache
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        this.cacheStats.hits++;
        
        // Atualizar estatísticas de acesso
        const accessKey = `access:${cacheKey}`;
        await this.redisClient.incr(accessKey);
        
        return JSON.parse(cached);
      }

      // Cache miss - buscar dados
      this.cacheStats.misses++;
      const data = await fetchFunction();

      // Calcular TTL dinâmico baseado na prioridade
      const ttl = this.calculateDynamicTTL(options.priority || 'medium', options.ttl);

      // Armazenar no cache
      await this.redisClient.setEx(cacheKey, ttl, JSON.stringify(data));
      this.cacheStats.sets++;

      // Armazenar tags para invalidação
      if (options.tags) {
        for (const tag of options.tags) {
          await this.redisClient.sAdd(`tag:${tag}`, cacheKey);
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Smart cache error:', error);
      // Em caso de erro no cache, executar função diretamente
      return await fetchFunction();
    }
  }

  // Cache para queries de hierarquia MLM
  async cacheMLMHierarchy(
    affiliateId: string,
    levels: number = 5
  ): Promise<any> {
    return this.smartCache(
      `mlm:hierarchy:${affiliateId}:${levels}`,
      async () => {
        // Simular busca de hierarquia MLM
        return {
          affiliateId,
          levels,
          totalDownline: Math.floor(Math.random() * 1000),
          directReferrals: Math.floor(Math.random() * 50),
          indirectReferrals: Math.floor(Math.random() * 950),
          timestamp: new Date(),
        };
      },
      {
        ttl: 300, // 5 minutos
        tags: ['mlm', 'hierarchy', `affiliate:${affiliateId}`],
        priority: 'high',
      }
    );
  }

  // Cache para rankings
  async cacheRankings(
    competitionId: string,
    period: string
  ): Promise<any> {
    return this.smartCache(
      `rankings:${competitionId}:${period}`,
      async () => {
        // Simular busca de rankings
        return {
          competitionId,
          period,
          rankings: Array.from({ length: 100 }, (_, i) => ({
            position: i + 1,
            affiliateId: `affiliate_${i + 1}`,
            points: Math.floor(Math.random() * 10000),
            commissions: Math.floor(Math.random() * 5000),
          })),
          lastUpdated: new Date(),
        };
      },
      {
        ttl: 60, // 1 minuto para rankings (dados dinâmicos)
        tags: ['rankings', `competition:${competitionId}`],
        priority: 'high',
      }
    );
  }

  // Cache para dados financeiros
  async cacheFinancialData(
    userId: string,
    period: string
  ): Promise<any> {
    return this.smartCache(
      `financial:${userId}:${period}`,
      async () => {
        // Simular busca de dados financeiros
        return {
          userId,
          period,
          totalCommissions: Math.floor(Math.random() * 10000),
          cpaCommissions: Math.floor(Math.random() * 5000),
          revshareCommissions: Math.floor(Math.random() * 3000),
          bonuses: Math.floor(Math.random() * 2000),
          withdrawals: Math.floor(Math.random() * 8000),
          balance: Math.floor(Math.random() * 2000),
          lastUpdated: new Date(),
        };
      },
      {
        ttl: 600, // 10 minutos
        tags: ['financial', `user:${userId}`],
        priority: 'medium',
      }
    );
  }

  // Invalidar cache por tags
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await this.redisClient.sMembers(`tag:${tag}`);
      
      if (keys.length > 0) {
        await this.redisClient.del(keys);
        await this.redisClient.del(`tag:${tag}`);
        this.cacheStats.deletes += keys.length;
        
        console.log(`🗑️ Invalidated ${keys.length} cache entries for tag: ${tag}`);
      }
    } catch (error) {
      console.error('❌ Error invalidating cache by tag:', error);
    }
  }

  // Invalidar cache de usuário
  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidateByTag(`user:${userId}`);
  }

  // Invalidar cache de afiliado
  async invalidateAffiliateCache(affiliateId: string): Promise<void> {
    await this.invalidateByTag(`affiliate:${affiliateId}`);
  }

  // Pré-aquecer cache
  async warmupCache(): Promise<void> {
    try {
      console.log('🔥 Starting cache warmup...');

      // Pré-carregar dados mais acessados
      const popularAffiliates = ['affiliate_1', 'affiliate_2', 'affiliate_3'];
      const popularCompetitions = ['comp_1', 'comp_2'];

      for (const affiliateId of popularAffiliates) {
        await this.cacheMLMHierarchy(affiliateId);
        await this.cacheFinancialData(affiliateId, 'current_month');
      }

      for (const competitionId of popularCompetitions) {
        await this.cacheRankings(competitionId, 'weekly');
        await this.cacheRankings(competitionId, 'monthly');
      }

      console.log('✅ Cache warmup completed');
    } catch (error) {
      console.error('❌ Cache warmup failed:', error);
    }
  }

  // Registrar métrica de request
  recordRequestMetric(responseTime: number, success: boolean): void {
    this.requestMetrics.push({
      timestamp: new Date(),
      responseTime,
      success,
    });

    // Manter apenas as últimas 1000 métricas
    if (this.requestMetrics.length > 1000) {
      this.requestMetrics = this.requestMetrics.slice(-1000);
    }
  }

  // Obter métricas de performance
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const totalCacheOperations = this.cacheStats.hits + this.cacheStats.misses;
    const cacheHitRate = totalCacheOperations > 0 
      ? (this.cacheStats.hits / totalCacheOperations) * 100 
      : 0;

    const recentMetrics = this.requestMetrics.filter(
      metric => Date.now() - metric.timestamp.getTime() < 300000 // Últimos 5 minutos
    );

    const averageResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, metric) => sum + metric.responseTime, 0) / recentMetrics.length
      : 0;

    const errorRate = recentMetrics.length > 0
      ? (recentMetrics.filter(metric => !metric.success).length / recentMetrics.length) * 100
      : 0;

    return {
      cacheHitRate,
      cacheMissRate: 100 - cacheHitRate,
      averageResponseTime,
      totalRequests: this.requestMetrics.length,
      errorRate,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: process.cpuUsage().user / 1000000, // segundos
    };
  }

  // Otimizar queries de banco
  async optimizeQuery<T>(
    queryKey: string,
    queryFunction: () => Promise<T>,
    options: {
      useIndex?: boolean;
      batchSize?: number;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Aplicar timeout se especificado
      if (options.timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), options.timeout);
        });

        const result = await Promise.race([queryFunction(), timeoutPromise]);
        
        const responseTime = Date.now() - startTime;
        this.recordRequestMetric(responseTime, true);
        
        return result;
      } else {
        const result = await queryFunction();
        
        const responseTime = Date.now() - startTime;
        this.recordRequestMetric(responseTime, true);
        
        return result;
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordRequestMetric(responseTime, false);
      
      console.error(`❌ Query optimization failed for ${queryKey}:`, error);
      throw error;
    }
  }

  // Monitoramento de memória
  async monitorMemoryUsage(): Promise<void> {
    const usage = process.memoryUsage();
    const memoryMB = {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
    };

    // Alertar se uso de memória estiver alto
    if (memoryMB.heapUsed > performanceConfig.monitoring.memoryThreshold) {
      console.warn(`⚠️ High memory usage detected: ${memoryMB.heapUsed}MB`);
      
      // Forçar garbage collection se disponível
      if (global.gc) {
        global.gc();
        console.log('🗑️ Garbage collection triggered');
      }
    }

    // Armazenar métricas no Redis
    await this.redisClient.setEx(
      'metrics:memory',
      60,
      JSON.stringify({
        ...memoryMB,
        timestamp: new Date(),
      })
    );
  }

  // Limpeza automática de cache
  async cleanupCache(): Promise<void> {
    try {
      console.log('🧹 Starting cache cleanup...');

      // Remover entradas expiradas
      const keys = await this.redisClient.keys('smart:*');
      let cleanedCount = 0;

      for (const key of keys) {
        const ttl = await this.redisClient.ttl(key);
        if (ttl === -1) { // Sem TTL definido
          await this.redisClient.del(key);
          cleanedCount++;
        }
      }

      console.log(`🧹 Cache cleanup completed. Removed ${cleanedCount} entries`);
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error);
    }
  }

  // Iniciar monitoramento automático
  startMonitoring(): void {
    // Monitoramento de memória a cada 30 segundos
    setInterval(() => {
      this.monitorMemoryUsage();
    }, 30000);

    // Limpeza de cache a cada 5 minutos
    setInterval(() => {
      this.cleanupCache();
    }, 300000);

    // Warmup de cache a cada hora
    setInterval(() => {
      this.warmupCache();
    }, 3600000);

    console.log('📊 Performance monitoring started');
  }

  private calculateDynamicTTL(priority: 'low' | 'medium' | 'high', baseTTL?: number): number {
    const base = baseTTL || performanceConfig.cache.defaultTTL;
    
    switch (priority) {
      case 'high': return base * 2; // Cache mais tempo para dados importantes
      case 'medium': return base;
      case 'low': return Math.floor(base / 2); // Cache menos tempo para dados menos importantes
      default: return base;
    }
  }

  async close(): Promise<void> {
    try {
      await this.redisClient.quit();
      console.log('✅ Performance Service connections closed');
    } catch (error) {
      console.error('❌ Error closing Performance Service connections:', error);
    }
  }
}

