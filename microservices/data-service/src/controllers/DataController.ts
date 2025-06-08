// ===============================================
// CONTROLLERS - DATA SERVICE
// ===============================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { PlatformDataService } from '../services/PlatformDataService';
import { CPAValidator } from '../services/CPAValidator';
import { TransactionMonitor } from '../services/TransactionMonitor';
import { EventPublisher } from '../services/EventPublisher';
import { ApiResponse, PaginationParams } from '../types';
import { Logger } from '../utils/logger';

export class DataController {
  private dataService: PlatformDataService;
  private cpaValidator: CPAValidator;
  private transactionMonitor: TransactionMonitor;
  private eventPublisher: EventPublisher;
  private logger: Logger;

  constructor(
    dataService: PlatformDataService,
    cpaValidator: CPAValidator,
    transactionMonitor: TransactionMonitor,
    eventPublisher: EventPublisher
  ) {
    this.dataService = dataService;
    this.cpaValidator = cpaValidator;
    this.transactionMonitor = transactionMonitor;
    this.eventPublisher = eventPublisher;
    this.logger = new Logger('DataController');
  }

  // ===============================================
  // ENDPOINTS DE USUÁRIOS
  // ===============================================

  async getUser(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params;
      
      this.logger.info('Getting user', { user_id: id });
      
      const user = await this.dataService.getUserById(id);
      
      if (!user) {
        reply.status(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Usuário não encontrado',
          },
          timestamp: new Date(),
          request_id: request.id,
        } as ApiResponse);
        return;
      }

      reply.send({
        success: true,
        data: user,
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      this.logger.error('Error getting user', { user_id: request.params.id, error });
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }

  // ===============================================
  // ENDPOINTS DE AFILIADOS
  // ===============================================

  async getAffiliate(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params;
      
      this.logger.info('Getting affiliate', { affiliate_id: id });
      
      const affiliate = await this.dataService.getAffiliateById(id);
      
      if (!affiliate) {
        reply.status(404).send({
          success: false,
          error: {
            code: 'AFFILIATE_NOT_FOUND',
            message: 'Afiliado não encontrado',
          },
          timestamp: new Date(),
          request_id: request.id,
        } as ApiResponse);
        return;
      }

      reply.send({
        success: true,
        data: affiliate,
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      this.logger.error('Error getting affiliate', { affiliate_id: request.params.id, error });
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }

  // ===============================================
  // ENDPOINTS DE TRANSAÇÕES
  // ===============================================

  async getCustomerTransactions(
    request: FastifyRequest<{ 
      Params: { customerId: string };
      Querystring: { page?: number; limit?: number; sort_by?: string; sort_order?: 'asc' | 'desc' };
    }>, 
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { customerId } = request.params;
      const { page = 1, limit = 50, sort_by, sort_order } = request.query;
      
      this.logger.info('Getting customer transactions', { customer_id: customerId, page, limit });
      
      const pagination: PaginationParams = {
        page: Number(page),
        limit: Number(limit),
        sort_by,
        sort_order,
      };

      const result = await this.dataService.getTransactionsByCustomer(customerId, pagination);

      reply.send({
        success: true,
        data: result,
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      this.logger.error('Error getting customer transactions', { 
        customer_id: request.params.customerId, 
        error 
      });
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }

  async getFirstDeposit(
    request: FastifyRequest<{ Params: { customerId: string } }>, 
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { customerId } = request.params;
      
      this.logger.info('Getting first deposit', { customer_id: customerId });
      
      const deposit = await this.dataService.getFirstDepositByCustomer(customerId);
      
      if (!deposit) {
        reply.status(404).send({
          success: false,
          error: {
            code: 'DEPOSIT_NOT_FOUND',
            message: 'Primeiro depósito não encontrado',
          },
          timestamp: new Date(),
          request_id: request.id,
        } as ApiResponse);
        return;
      }

      reply.send({
        success: true,
        data: deposit,
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      this.logger.error('Error getting first deposit', { 
        customer_id: request.params.customerId, 
        error 
      });
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }

  // ===============================================
  // ENDPOINTS DE VALIDAÇÃO CPA
  // ===============================================

  async validateCustomerCPA(
    request: FastifyRequest<{ 
      Params: { customerId: string };
      Querystring: { model?: '1.1' | '1.2'; force?: boolean };
    }>, 
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { customerId } = request.params;
      const { model, force = false } = request.query;
      
      this.logger.info('Validating customer CPA', { customer_id: customerId, model, force });
      
      let results;
      
      if (force) {
        results = await this.cpaValidator.reprocessCustomer(customerId);
      } else if (model) {
        results = await this.cpaValidator.validateCustomerManual(customerId, model);
      } else {
        results = await this.cpaValidator.validateCustomer(customerId);
      }

      reply.send({
        success: true,
        data: {
          customer_id: customerId,
          validation_results: results,
          validated_at: new Date(),
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      this.logger.error('Error validating customer CPA', { 
        customer_id: request.params.customerId, 
        error 
      });
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }

  // ===============================================
  // ENDPOINTS DE MONITORAMENTO
  // ===============================================

  async getMonitorStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      this.logger.info('Getting monitor stats');
      
      const stats = this.transactionMonitor.getStats();

      reply.send({
        success: true,
        data: stats,
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      this.logger.error('Error getting monitor stats', { error });
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }

  async startMonitor(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      this.logger.info('Starting transaction monitor');
      
      await this.transactionMonitor.start();

      reply.send({
        success: true,
        data: { message: 'Monitor iniciado com sucesso' },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      this.logger.error('Error starting monitor', { error });
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }

  async stopMonitor(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      this.logger.info('Stopping transaction monitor');
      
      await this.transactionMonitor.stop();

      reply.send({
        success: true,
        data: { message: 'Monitor parado com sucesso' },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      this.logger.error('Error stopping monitor', { error });
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }

  // ===============================================
  // ENDPOINTS DE HEALTH CHECK
  // ===============================================

  async healthCheck(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      this.logger.debug('Health check requested');
      
      const [dbHealth, redisHealth, affiliateServiceHealth] = await Promise.all([
        this.dataService.checkDatabaseHealth(),
        this.dataService.checkRedisHealth(),
        this.eventPublisher.testAffiliateServiceConnection(),
      ]);

      const isHealthy = 
        dbHealth.status === 'connected' && 
        redisHealth.status === 'connected' && 
        affiliateServiceHealth;

      const status = isHealthy ? 'healthy' : 'unhealthy';

      const healthData = {
        status,
        timestamp: new Date(),
        services: {
          database: dbHealth,
          redis: redisHealth,
          affiliate_service: {
            status: affiliateServiceHealth ? 'reachable' : 'unreachable',
          },
        },
        uptime_seconds: process.uptime(),
        memory_usage: {
          used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
        },
      };

      reply.status(isHealthy ? 200 : 503).send({
        success: isHealthy,
        data: healthData,
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      this.logger.error('Error in health check', { error });
      reply.status(503).send({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Falha na verificação de saúde',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }
}

