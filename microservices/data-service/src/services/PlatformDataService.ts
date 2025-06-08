// ===============================================
// PLATFORM DATA SERVICE - CONEXÃO COM DADOS REAIS
// ===============================================

import { Pool, PoolClient } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { 
  PlatformUser, 
  PlatformAffiliate, 
  PlatformTransaction, 
  CPAValidationResult,
  PaginationParams,
  PaginatedResponse 
} from '../types';
import { Logger } from '../utils/logger';

export class PlatformDataService {
  private pgPool: Pool;
  private redisClient: RedisClientType;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PlatformDataService');
    this.initializeConnections();
  }

  private initializeConnections(): void {
    // Configurar PostgreSQL
    this.pgPool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.username,
      password: config.database.password,
      ssl: config.database.ssl,
      max: config.database.pool_size,
      connectionTimeoutMillis: config.database.connection_timeout_ms,
    });

    // Configurar Redis
    this.redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.database,
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis connection error', { error: err.message });
    });

    this.redisClient.on('connect', () => {
      this.logger.info('Redis connected successfully');
    });
  }

  async connect(): Promise<void> {
    try {
      // Testar conexão PostgreSQL
      const client = await this.pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      this.logger.info('PostgreSQL connected successfully');

      // Conectar Redis
      await this.redisClient.connect();
      this.logger.info('Data service connections established');
    } catch (error) {
      this.logger.error('Failed to establish connections', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pgPool.end();
      await this.redisClient.quit();
      this.logger.info('Data service connections closed');
    } catch (error) {
      this.logger.error('Error closing connections', { error });
    }
  }

  // ===============================================
  // MÉTODOS DE CONSULTA DE USUÁRIOS
  // ===============================================

  async getUserById(userId: string): Promise<PlatformUser | null> {
    const cacheKey = `user:${userId}`;
    
    try {
      // Tentar cache primeiro
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Buscar no banco
      const query = `
        SELECT id, email, name, phone, document, status, 
               created_at, updated_at, original_id, migrated_from
        FROM users 
        WHERE id = $1 AND deleted_at IS NULL
      `;
      
      const result = await this.pgPool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0] as PlatformUser;
      
      // Cachear resultado
      await this.redisClient.setEx(cacheKey, config.redis.ttl_seconds, JSON.stringify(user));
      
      return user;
    } catch (error) {
      this.logger.error('Error fetching user', { userId, error });
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<PlatformUser | null> {
    try {
      const query = `
        SELECT id, email, name, phone, document, status, 
               created_at, updated_at, original_id, migrated_from
        FROM users 
        WHERE email = $1 AND deleted_at IS NULL
      `;
      
      const result = await this.pgPool.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as PlatformUser;
    } catch (error) {
      this.logger.error('Error fetching user by email', { email, error });
      throw error;
    }
  }

  // ===============================================
  // MÉTODOS DE CONSULTA DE AFILIADOS
  // ===============================================

  async getAffiliateById(affiliateId: string): Promise<PlatformAffiliate | null> {
    const cacheKey = `affiliate:${affiliateId}`;
    
    try {
      // Tentar cache primeiro
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Buscar no banco
      const query = `
        SELECT id, user_id, parent_id, referral_code, category, level, status,
               joined_at, last_activity_at, total_referrals, active_referrals,
               lifetime_volume, lifetime_commissions, current_month_volume,
               current_month_commissions, metadata
        FROM affiliates 
        WHERE id = $1
      `;
      
      const result = await this.pgPool.query(query, [affiliateId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const affiliate = result.rows[0] as PlatformAffiliate;
      
      // Cachear resultado
      await this.redisClient.setEx(cacheKey, config.redis.ttl_seconds, JSON.stringify(affiliate));
      
      return affiliate;
    } catch (error) {
      this.logger.error('Error fetching affiliate', { affiliateId, error });
      throw error;
    }
  }

  async getAffiliateByUserId(userId: string): Promise<PlatformAffiliate | null> {
    try {
      const query = `
        SELECT id, user_id, parent_id, referral_code, category, level, status,
               joined_at, last_activity_at, total_referrals, active_referrals,
               lifetime_volume, lifetime_commissions, current_month_volume,
               current_month_commissions, metadata
        FROM affiliates 
        WHERE user_id = $1
      `;
      
      const result = await this.pgPool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as PlatformAffiliate;
    } catch (error) {
      this.logger.error('Error fetching affiliate by user ID', { userId, error });
      throw error;
    }
  }

  // ===============================================
  // MÉTODOS DE CONSULTA DE TRANSAÇÕES
  // ===============================================

  async getTransactionsByCustomer(
    customerId: string, 
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<PlatformTransaction>> {
    try {
      const limit = pagination?.limit || 50;
      const offset = ((pagination?.page || 1) - 1) * limit;
      const sortBy = pagination?.sort_by || 'created_at';
      const sortOrder = pagination?.sort_order || 'desc';

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM transactions 
        WHERE customer_id = $1
      `;
      
      const countResult = await this.pgPool.query(countQuery, [customerId]);
      const total = parseInt(countResult.rows[0].total);

      // Query para buscar dados
      const dataQuery = `
        SELECT id, external_id, affiliate_id, customer_id, type, amount, 
               currency, status, processed_at, created_at, updated_at, metadata
        FROM transactions 
        WHERE customer_id = $1
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $2 OFFSET $3
      `;
      
      const dataResult = await this.pgPool.query(dataQuery, [customerId, limit, offset]);
      
      const totalPages = Math.ceil(total / limit);
      const currentPage = pagination?.page || 1;

      return {
        data: dataResult.rows as PlatformTransaction[],
        pagination: {
          page: currentPage,
          limit,
          total,
          total_pages: totalPages,
          has_next: currentPage < totalPages,
          has_prev: currentPage > 1,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching customer transactions', { customerId, error });
      throw error;
    }
  }

  async getFirstDepositByCustomer(customerId: string): Promise<PlatformTransaction | null> {
    try {
      const query = `
        SELECT id, external_id, affiliate_id, customer_id, type, amount, 
               currency, status, processed_at, created_at, updated_at, metadata
        FROM transactions 
        WHERE customer_id = $1 
          AND type = 'deposit' 
          AND status = 'processed'
        ORDER BY created_at ASC
        LIMIT 1
      `;
      
      const result = await this.pgPool.query(query, [customerId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as PlatformTransaction;
    } catch (error) {
      this.logger.error('Error fetching first deposit', { customerId, error });
      throw error;
    }
  }

  async getRecentTransactions(
    limit: number = 100,
    sinceTimestamp?: Date
  ): Promise<PlatformTransaction[]> {
    try {
      let query = `
        SELECT id, external_id, affiliate_id, customer_id, type, amount, 
               currency, status, processed_at, created_at, updated_at, metadata
        FROM transactions 
        WHERE status = 'processed'
      `;
      
      const params: any[] = [];
      
      if (sinceTimestamp) {
        query += ` AND created_at > $1`;
        params.push(sinceTimestamp);
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await this.pgPool.query(query, params);
      
      return result.rows as PlatformTransaction[];
    } catch (error) {
      this.logger.error('Error fetching recent transactions', { error });
      throw error;
    }
  }

  // ===============================================
  // MÉTODOS DE VALIDAÇÃO CPA
  // ===============================================

  async validateCPAModel11(customerId: string): Promise<CPAValidationResult | null> {
    try {
      const query = `
        SELECT t.id, t.affiliate_id, t.customer_id, t.amount, t.created_at
        FROM transactions t
        WHERE t.customer_id = $1 
          AND t.type = 'deposit' 
          AND t.status = 'processed' 
          AND t.amount >= $2
        ORDER BY t.created_at ASC
        LIMIT 1
      `;
      
      const result = await this.pgPool.query(query, [
        customerId, 
        config.cpa_models.model_1_1.min_deposit_amount
      ]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const transaction = result.rows[0];
      
      return {
        customer_id: customerId,
        affiliate_id: transaction.affiliate_id,
        model: '1.1',
        validation_passed: true,
        first_deposit: {
          amount: parseFloat(transaction.amount),
          date: transaction.created_at,
          transaction_id: transaction.id,
        },
        validation_date: new Date(),
        commission_eligible: true,
      };
    } catch (error) {
      this.logger.error('Error validating CPA Model 1.1', { customerId, error });
      throw error;
    }
  }

  async validateCPAModel12(customerId: string): Promise<CPAValidationResult | null> {
    try {
      // Primeiro, buscar o primeiro depósito válido
      const firstDepositQuery = `
        SELECT id, affiliate_id, amount, created_at
        FROM transactions 
        WHERE customer_id = $1 
          AND type = 'deposit' 
          AND status = 'processed' 
          AND amount >= $2
        ORDER BY created_at ASC
        LIMIT 1
      `;
      
      const depositResult = await this.pgPool.query(firstDepositQuery, [
        customerId, 
        config.cpa_models.model_1_2.min_deposit_amount
      ]);
      
      if (depositResult.rows.length === 0) {
        return null;
      }

      const firstDeposit = depositResult.rows[0];
      
      // Verificar atividade após o primeiro depósito
      const activityQuery = `
        SELECT 
          COUNT(CASE WHEN type = 'bet' THEN 1 END) as bet_count,
          COALESCE(SUM(CASE WHEN type = 'ggr' THEN amount ELSE 0 END), 0) as total_ggr
        FROM transactions 
        WHERE customer_id = $1 
          AND created_at >= $2 
          AND status = 'processed'
      `;
      
      const activityResult = await this.pgPool.query(activityQuery, [
        customerId, 
        firstDeposit.created_at
      ]);
      
      const activity = activityResult.rows[0];
      const betCount = parseInt(activity.bet_count);
      const totalGgr = parseFloat(activity.total_ggr);
      
      const validationPassed = 
        betCount >= config.cpa_models.model_1_2.min_bet_count || 
        totalGgr >= config.cpa_models.model_1_2.min_ggr_amount;
      
      return {
        customer_id: customerId,
        affiliate_id: firstDeposit.affiliate_id,
        model: '1.2',
        validation_passed: validationPassed,
        first_deposit: {
          amount: parseFloat(firstDeposit.amount),
          date: firstDeposit.created_at,
          transaction_id: firstDeposit.id,
        },
        activity_metrics: {
          bet_count: betCount,
          total_ggr: totalGgr,
          validation_date: new Date(),
        },
        validation_date: new Date(),
        commission_eligible: validationPassed,
      };
    } catch (error) {
      this.logger.error('Error validating CPA Model 1.2', { customerId, error });
      throw error;
    }
  }

  // ===============================================
  // MÉTODOS DE HEALTH CHECK
  // ===============================================

  async checkDatabaseHealth(): Promise<{ status: string; response_time_ms?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.pgPool.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'connected',
        response_time_ms: responseTime,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkRedisHealth(): Promise<{ status: string; response_time_ms?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.redisClient.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'connected',
        response_time_ms: responseTime,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

