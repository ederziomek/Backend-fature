import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { createClient, RedisClientType } from 'redis';
import { externalDataConfig } from '../config/config';
import {
  PlayerDeposit,
  PlayerBet,
  PlayerGGR,
  PlayerActivity,
  ExternalDataApiResponse,
  DateRange,
  PlayerValidationResult
} from '../types/external-data.types';

export class ExternalDataService {
  private apiClient: AxiosInstance;
  private redisClient: RedisClientType;

  constructor() {
    // Configurar cliente HTTP para API externa
    this.apiClient = axios.create({
      baseURL: externalDataConfig.externalApiUrl,
      timeout: externalDataConfig.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fature-Backend-ExternalDataService/1.0',
      },
    });

    // Configurar cliente Redis para cache
    this.redisClient = createClient({
      url: externalDataConfig.redis.url,
    });

    this.setupInterceptors();
  }

  async initialize(): Promise<void> {
    try {
      await this.redisClient.connect();
      console.log('✅ External Data Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize External Data Service:', error);
      throw error;
    }
  }

  private setupInterceptors(): void {
    // Request interceptor para logging
    this.apiClient.interceptors.request.use(
      (config) => {
        if (externalDataConfig.logging.enableRequestLogging) {
          console.log(`🔄 External API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor para tratamento de erros
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { config, response } = error;
        
        // Implementar retry logic
        if (!config._retry && config._retryCount < externalDataConfig.retryConfig.maxRetries) {
          config._retry = true;
          config._retryCount = (config._retryCount || 0) + 1;
          
          console.log(`🔄 Retrying request (${config._retryCount}/${externalDataConfig.retryConfig.maxRetries})`);
          
          await new Promise(resolve => 
            setTimeout(resolve, externalDataConfig.retryConfig.retryDelay)
          );
          
          return this.apiClient(config);
        }
        
        console.error('❌ External API Error:', {
          url: config?.url,
          status: response?.status,
          message: error.message,
        });
        
        return Promise.reject(error);
      }
    );
  }

  // Buscar depósitos de um jogador
  async getPlayerDeposits(
    playerId: string, 
    dateRange?: DateRange
  ): Promise<PlayerDeposit[]> {
    const cacheKey = `deposits:${playerId}:${dateRange?.start || 'all'}:${dateRange?.end || 'all'}`;
    
    try {
      // Verificar cache primeiro
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Buscar da API externa
      const params: any = { playerId };
      if (dateRange) {
        params.startDate = dateRange.start.toISOString();
        params.endDate = dateRange.end.toISOString();
      }

      const response: AxiosResponse<ExternalDataApiResponse<PlayerDeposit[]>> = 
        await this.apiClient.get('/api/deposits', { params });

      const deposits = response.data.data;

      // Cachear resultado
      await this.redisClient.setEx(
        cacheKey, 
        externalDataConfig.redis.ttl, 
        JSON.stringify(deposits)
      );

      return deposits;
    } catch (error) {
      console.error('❌ Error fetching player deposits:', error);
      throw new Error(`Failed to fetch deposits for player ${playerId}`);
    }
  }

  // Buscar apostas de um jogador
  async getPlayerBets(
    playerId: string, 
    dateRange?: DateRange
  ): Promise<PlayerBet[]> {
    const cacheKey = `bets:${playerId}:${dateRange?.start || 'all'}:${dateRange?.end || 'all'}`;
    
    try {
      // Verificar cache primeiro
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Buscar da API externa
      const params: any = { playerId };
      if (dateRange) {
        params.startDate = dateRange.start.toISOString();
        params.endDate = dateRange.end.toISOString();
      }

      const response: AxiosResponse<ExternalDataApiResponse<PlayerBet[]>> = 
        await this.apiClient.get('/api/bets', { params });

      const bets = response.data.data;

      // Cachear resultado
      await this.redisClient.setEx(
        cacheKey, 
        externalDataConfig.redis.ttl, 
        JSON.stringify(bets)
      );

      return bets;
    } catch (error) {
      console.error('❌ Error fetching player bets:', error);
      throw new Error(`Failed to fetch bets for player ${playerId}`);
    }
  }

  // Calcular GGR de um jogador
  async getPlayerGGR(
    playerId: string, 
    dateRange: DateRange
  ): Promise<PlayerGGR> {
    const cacheKey = `ggr:${playerId}:${dateRange.start}:${dateRange.end}`;
    
    try {
      // Verificar cache primeiro
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Buscar dados necessários
      const [deposits, bets] = await Promise.all([
        this.getPlayerDeposits(playerId, dateRange),
        this.getPlayerBets(playerId, dateRange)
      ]);

      // Calcular métricas
      const totalDeposits = deposits
        .filter(d => d.status === 'completed')
        .reduce((sum, d) => sum + d.amount, 0);

      const totalBets = bets.reduce((sum, b) => sum + b.betAmount, 0);
      const totalWins = bets.reduce((sum, b) => sum + b.winAmount, 0);

      const ggr = totalBets - totalWins; // Gross Gaming Revenue
      const ngr = ggr; // Net Gaming Revenue (sem considerar bônus por enquanto)

      const playerGGR: PlayerGGR = {
        playerId,
        period: dateRange,
        totalDeposits,
        totalWithdrawals: 0, // TODO: implementar quando dados de saque estiverem disponíveis
        totalBets,
        totalWins,
        ggr,
        ngr,
        bonusesGiven: 0, // TODO: implementar quando dados de bônus estiverem disponíveis
      };

      // Cachear resultado
      await this.redisClient.setEx(
        cacheKey, 
        externalDataConfig.redis.ttl, 
        JSON.stringify(playerGGR)
      );

      return playerGGR;
    } catch (error) {
      console.error('❌ Error calculating player GGR:', error);
      throw new Error(`Failed to calculate GGR for player ${playerId}`);
    }
  }

  // Validar jogador para CPA
  async validatePlayerForCPA(playerId: string): Promise<PlayerValidationResult> {
    try {
      const validationPeriod: DateRange = {
        start: new Date(Date.now() - externalDataConfig.cpaValidation.validationPeriodDays * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const [deposits, bets, activity] = await Promise.all([
        this.getPlayerDeposits(playerId, validationPeriod),
        this.getPlayerBets(playerId, validationPeriod),
        this.getPlayerActivity(playerId)
      ]);

      // Verificar critérios de validação
      const totalDeposits = deposits
        .filter(d => d.status === 'completed')
        .reduce((sum, d) => sum + d.amount, 0);

      const hasMinimumDeposit = totalDeposits >= externalDataConfig.cpaValidation.minimumDepositAmount;
      const hasMinimumActivity = bets.length >= externalDataConfig.cpaValidation.minimumBetsCount;
      const isActivePlayer = activity.isActive;

      const validationResult: PlayerValidationResult = {
        playerId,
        isValid: hasMinimumDeposit && hasMinimumActivity && isActivePlayer,
        validationCriteria: {
          hasMinimumDeposit,
          minimumDepositAmount: totalDeposits,
          hasMinimumActivity,
          minimumBetsCount: bets.length,
          isActivePlayer,
        },
        validationDate: new Date(),
      };

      return validationResult;
    } catch (error) {
      console.error('❌ Error validating player for CPA:', error);
      throw new Error(`Failed to validate player ${playerId} for CPA`);
    }
  }

  // Buscar atividade de um jogador
  async getPlayerActivity(playerId: string): Promise<PlayerActivity> {
    const cacheKey = `activity:${playerId}`;
    
    try {
      // Verificar cache primeiro
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Buscar da API externa
      const response: AxiosResponse<ExternalDataApiResponse<PlayerActivity>> = 
        await this.apiClient.get(`/api/players/${playerId}/activity`);

      const activity = response.data.data;

      // Cachear resultado
      await this.redisClient.setEx(
        cacheKey, 
        externalDataConfig.redis.ttl, 
        JSON.stringify(activity)
      );

      return activity;
    } catch (error) {
      console.error('❌ Error fetching player activity:', error);
      throw new Error(`Failed to fetch activity for player ${playerId}`);
    }
  }

  // Limpar cache de um jogador específico
  async clearPlayerCache(playerId: string): Promise<void> {
    try {
      const keys = await this.redisClient.keys(`*:${playerId}:*`);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
      console.log(`🧹 Cache cleared for player ${playerId}`);
    } catch (error) {
      console.error('❌ Error clearing player cache:', error);
    }
  }

  // Fechar conexões
  async close(): Promise<void> {
    try {
      await this.redisClient.quit();
      console.log('✅ External Data Service connections closed');
    } catch (error) {
      console.error('❌ Error closing External Data Service connections:', error);
    }
  }
}

