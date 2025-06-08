// ===============================================
// TESTES DE INTEGRAÇÃO - FLUXO CPA COMPLETO
// ===============================================

import request from 'supertest';
import { DataServiceApp } from '../src/app';
import { PlatformDataService } from '../src/services/PlatformDataService';
import { EventPublisher } from '../src/services/EventPublisher';
import { CPAValidationResult, CPACommissionData } from '../src/types';

describe('Integração CPA - Fluxo Completo', () => {
  let app: DataServiceApp;
  let server: any;

  beforeAll(async () => {
    // Configurar ambiente de teste
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3003'; // Porta diferente para testes
    
    app = new DataServiceApp();
    await app.initialize();
    server = app.getFastifyInstance();
  });

  afterAll(async () => {
    if (app) {
      await app.stop();
    }
  });

  describe('Fluxo CPA Modelo 1.1', () => {
    const customerId = 'test-customer-123';
    const affiliateId = 'test-affiliate-456';

    it('deve processar fluxo completo de validação CPA 1.1', async () => {
      // 1. Simular dados no banco (mock)
      const mockValidationResult: CPAValidationResult = {
        customer_id: customerId,
        affiliate_id: affiliateId,
        model: '1.1',
        validation_passed: true,
        first_deposit: {
          amount: 50.00,
          date: new Date(),
          transaction_id: 'tx-test-123',
        },
        validation_date: new Date(),
        commission_eligible: true,
      };

      // Mock do PlatformDataService
      jest.spyOn(PlatformDataService.prototype, 'validateCPAModel11')
        .mockResolvedValue(mockValidationResult);
      
      jest.spyOn(PlatformDataService.prototype, 'validateCPAModel12')
        .mockResolvedValue(null);

      jest.spyOn(PlatformDataService.prototype, 'getAffiliateById')
        .mockResolvedValue({
          id: affiliateId,
          user_id: 'user-789',
          referral_code: 'REF123',
          category: 'standard',
          level: 1,
        } as any);

      // Mock do EventPublisher
      const publishEventSpy = jest.spyOn(EventPublisher.prototype, 'publishEvent')
        .mockResolvedValue();

      // 2. Fazer requisição de validação CPA
      const response = await request(server.server)
        .post(`/api/v1/customers/${customerId}/validate-cpa`)
        .expect(200);

      // 3. Verificar resposta
      expect(response.body.success).toBe(true);
      expect(response.body.data.validation_results).toHaveLength(1);
      expect(response.body.data.validation_results[0].model).toBe('1.1');
      expect(response.body.data.validation_results[0].validation_passed).toBe(true);

      // 4. Verificar que eventos foram publicados
      expect(publishEventSpy).toHaveBeenCalledTimes(2);
      
      // Verificar evento de validação
      const validationEvent = publishEventSpy.mock.calls[0][0];
      expect(validationEvent.type).toBe('cpa.validation.completed');
      expect(validationEvent.data.customer_id).toBe(customerId);

      // Verificar evento de cálculo de comissão
      const commissionEvent = publishEventSpy.mock.calls[1][0];
      expect(commissionEvent.type).toBe('commission.calculation.requested');
      expect(commissionEvent.data.commission_amount).toBe(60.00);
    });
  });

  describe('Fluxo CPA Modelo 1.2', () => {
    const customerId = 'test-customer-456';
    const affiliateId = 'test-affiliate-789';

    it('deve processar fluxo completo de validação CPA 1.2', async () => {
      // 1. Simular dados no banco
      const mockValidationResult: CPAValidationResult = {
        customer_id: customerId,
        affiliate_id: affiliateId,
        model: '1.2',
        validation_passed: true,
        first_deposit: {
          amount: 50.00,
          date: new Date(),
          transaction_id: 'tx-test-456',
        },
        activity_metrics: {
          bet_count: 15,
          total_ggr: 25.00,
          validation_date: new Date(),
        },
        validation_date: new Date(),
        commission_eligible: true,
      };

      // Mock dos serviços
      jest.spyOn(PlatformDataService.prototype, 'validateCPAModel11')
        .mockResolvedValue(null);
      
      jest.spyOn(PlatformDataService.prototype, 'validateCPAModel12')
        .mockResolvedValue(mockValidationResult);

      jest.spyOn(PlatformDataService.prototype, 'getAffiliateById')
        .mockResolvedValue({
          id: affiliateId,
          user_id: 'user-999',
          referral_code: 'REF456',
          category: 'premium',
          level: 2,
        } as any);

      const publishEventSpy = jest.spyOn(EventPublisher.prototype, 'publishEvent')
        .mockResolvedValue();

      // 2. Fazer requisição de validação CPA
      const response = await request(server.server)
        .post(`/api/v1/customers/${customerId}/validate-cpa`)
        .query({ model: '1.2' })
        .expect(200);

      // 3. Verificar resposta
      expect(response.body.success).toBe(true);
      expect(response.body.data.validation_results).toHaveLength(1);
      expect(response.body.data.validation_results[0].model).toBe('1.2');
      expect(response.body.data.validation_results[0].activity_metrics.bet_count).toBe(15);

      // 4. Verificar eventos publicados
      expect(publishEventSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Health Check', () => {
    it('deve retornar status de saúde do serviço', async () => {
      // Mock dos health checks
      jest.spyOn(PlatformDataService.prototype, 'checkDatabaseHealth')
        .mockResolvedValue({
          status: 'connected',
          response_time_ms: 50,
        });

      jest.spyOn(PlatformDataService.prototype, 'checkRedisHealth')
        .mockResolvedValue({
          status: 'connected',
          response_time_ms: 10,
        });

      jest.spyOn(EventPublisher.prototype, 'testAffiliateServiceConnection')
        .mockResolvedValue(true);

      const response = await request(server.server)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.services.database.status).toBe('connected');
      expect(response.body.data.services.redis.status).toBe('connected');
      expect(response.body.data.services.affiliate_service.status).toBe('reachable');
    });

    it('deve retornar status unhealthy quando serviços falham', async () => {
      // Mock de falha nos serviços
      jest.spyOn(PlatformDataService.prototype, 'checkDatabaseHealth')
        .mockResolvedValue({
          status: 'error',
          error: 'Connection failed',
        });

      const response = await request(server.server)
        .get('/api/v1/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.data.status).toBe('unhealthy');
    });
  });

  describe('Monitor de Transações', () => {
    it('deve retornar estatísticas do monitor', async () => {
      const response = await request(server.server)
        .get('/api/v1/monitor/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('is_running');
      expect(response.body.data).toHaveProperty('polling_interval_ms');
      expect(response.body.data).toHaveProperty('batch_size');
    });

    it('deve iniciar monitor com sucesso', async () => {
      const response = await request(server.server)
        .post('/api/v1/monitor/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('iniciado');
    });

    it('deve parar monitor com sucesso', async () => {
      const response = await request(server.server)
        .post('/api/v1/monitor/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('parado');
    });
  });

  describe('Consultas de Dados', () => {
    const userId = 'test-user-123';
    const affiliateId = 'test-affiliate-123';
    const customerId = 'test-customer-123';

    it('deve buscar usuário por ID', async () => {
      // Mock do usuário
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(PlatformDataService.prototype, 'getUserById')
        .mockResolvedValue(mockUser);

      const response = await request(server.server)
        .get(`/api/v1/users/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.email).toBe('test@example.com');
    });

    it('deve buscar afiliado por ID', async () => {
      // Mock do afiliado
      const mockAffiliate = {
        id: affiliateId,
        user_id: userId,
        referral_code: 'REF123',
        category: 'standard',
        level: 1,
        status: 'active',
      };

      jest.spyOn(PlatformDataService.prototype, 'getAffiliateById')
        .mockResolvedValue(mockAffiliate);

      const response = await request(server.server)
        .get(`/api/v1/affiliates/${affiliateId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(affiliateId);
      expect(response.body.data.referral_code).toBe('REF123');
    });

    it('deve buscar transações do cliente', async () => {
      // Mock das transações
      const mockTransactions = {
        data: [
          {
            id: 'tx-1',
            customer_id: customerId,
            type: 'deposit',
            amount: 50.00,
            status: 'processed',
            created_at: new Date(),
          },
          {
            id: 'tx-2',
            customer_id: customerId,
            type: 'bet',
            amount: 10.00,
            status: 'processed',
            created_at: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 2,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        },
      };

      jest.spyOn(PlatformDataService.prototype, 'getTransactionsByCustomer')
        .mockResolvedValue(mockTransactions);

      const response = await request(server.server)
        .get(`/api/v1/customers/${customerId}/transactions`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });
  });
});

