// ===============================================
// TESTES UNITÁRIOS - CPA VALIDATOR
// ===============================================

import { CPAValidator } from '../src/services/CPAValidator';
import { PlatformDataService } from '../src/services/PlatformDataService';
import { EventPublisher } from '../src/services/EventPublisher';
import { CPAValidationResult } from '../src/types';

// Mock dos serviços
jest.mock('../src/services/PlatformDataService');
jest.mock('../src/services/EventPublisher');

describe('CPAValidator', () => {
  let cpaValidator: CPAValidator;
  let mockDataService: jest.Mocked<PlatformDataService>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(() => {
    mockDataService = new PlatformDataService() as jest.Mocked<PlatformDataService>;
    mockEventPublisher = new EventPublisher() as jest.Mocked<EventPublisher>;
    cpaValidator = new CPAValidator(mockDataService, mockEventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCustomer', () => {
    const customerId = 'customer-123';
    const affiliateId = 'affiliate-456';

    it('deve validar cliente com sucesso para modelo 1.1', async () => {
      // Arrange
      const mockValidationResult: CPAValidationResult = {
        customer_id: customerId,
        affiliate_id: affiliateId,
        model: '1.1',
        validation_passed: true,
        first_deposit: {
          amount: 50.00,
          date: new Date(),
          transaction_id: 'tx-123',
        },
        validation_date: new Date(),
        commission_eligible: true,
      };

      mockDataService.validateCPAModel11.mockResolvedValue(mockValidationResult);
      mockDataService.validateCPAModel12.mockResolvedValue(null);
      mockEventPublisher.publishEvent.mockResolvedValue();

      // Act
      const results = await cpaValidator.validateCustomer(customerId);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockValidationResult);
      expect(mockDataService.validateCPAModel11).toHaveBeenCalledWith(customerId);
      expect(mockEventPublisher.publishEvent).toHaveBeenCalledTimes(2); // validation + commission events
    });

    it('deve validar cliente com sucesso para modelo 1.2', async () => {
      // Arrange
      const mockValidationResult: CPAValidationResult = {
        customer_id: customerId,
        affiliate_id: affiliateId,
        model: '1.2',
        validation_passed: true,
        first_deposit: {
          amount: 50.00,
          date: new Date(),
          transaction_id: 'tx-123',
        },
        activity_metrics: {
          bet_count: 15,
          total_ggr: 25.00,
          validation_date: new Date(),
        },
        validation_date: new Date(),
        commission_eligible: true,
      };

      mockDataService.validateCPAModel11.mockResolvedValue(null);
      mockDataService.validateCPAModel12.mockResolvedValue(mockValidationResult);
      mockEventPublisher.publishEvent.mockResolvedValue();

      // Act
      const results = await cpaValidator.validateCustomer(customerId);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockValidationResult);
      expect(mockDataService.validateCPAModel12).toHaveBeenCalledWith(customerId);
      expect(mockEventPublisher.publishEvent).toHaveBeenCalledTimes(2);
    });

    it('deve retornar array vazio quando nenhuma validação passa', async () => {
      // Arrange
      mockDataService.validateCPAModel11.mockResolvedValue(null);
      mockDataService.validateCPAModel12.mockResolvedValue(null);

      // Act
      const results = await cpaValidator.validateCustomer(customerId);

      // Assert
      expect(results).toHaveLength(0);
      expect(mockEventPublisher.publishEvent).not.toHaveBeenCalled();
    });

    it('deve tratar erro durante validação', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockDataService.validateCPAModel11.mockRejectedValue(error);

      // Act & Assert
      await expect(cpaValidator.validateCustomer(customerId)).rejects.toThrow(error);
    });
  });

  describe('validateCustomerManual', () => {
    const customerId = 'customer-123';

    it('deve validar modelo específico quando solicitado', async () => {
      // Arrange
      const mockValidationResult: CPAValidationResult = {
        customer_id: customerId,
        affiliate_id: 'affiliate-456',
        model: '1.1',
        validation_passed: true,
        first_deposit: {
          amount: 50.00,
          date: new Date(),
          transaction_id: 'tx-123',
        },
        validation_date: new Date(),
        commission_eligible: true,
      };

      mockDataService.validateCPAModel11.mockResolvedValue(mockValidationResult);

      // Act
      const results = await cpaValidator.validateCustomerManual(customerId, '1.1');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].model).toBe('1.1');
      expect(mockDataService.validateCPAModel11).toHaveBeenCalledWith(customerId);
      expect(mockDataService.validateCPAModel12).not.toHaveBeenCalled();
    });
  });

  describe('calculateCommissionData', () => {
    it('deve calcular dados de comissão corretamente', async () => {
      // Arrange
      const validationResult: CPAValidationResult = {
        customer_id: 'customer-123',
        affiliate_id: 'affiliate-456',
        model: '1.1',
        validation_passed: true,
        first_deposit: {
          amount: 50.00,
          date: new Date(),
          transaction_id: 'tx-123',
        },
        validation_date: new Date(),
        commission_eligible: true,
      };

      const mockAffiliate = {
        id: 'affiliate-456',
        user_id: 'user-789',
        referral_code: 'REF123',
        category: 'standard',
        level: 1,
      };

      mockDataService.getAffiliateById.mockResolvedValue(mockAffiliate as any);

      // Act
      const commissionData = await (cpaValidator as any).calculateCommissionData(validationResult);

      // Assert
      expect(commissionData.commission_amount).toBe(60.00);
      expect(commissionData.bonus_amount).toBe(5.00);
      expect(commissionData.hierarchy_levels).toHaveLength(1);
      expect(commissionData.hierarchy_levels[0].commission_amount).toBe(35.00);
      expect(commissionData.total_distributed).toBe(40.00); // 35 + 5
    });
  });

  describe('getStats', () => {
    it('deve retornar estatísticas do validador', () => {
      // Act
      const stats = cpaValidator.getStats();

      // Assert
      expect(stats).toHaveProperty('model_1_1_enabled');
      expect(stats).toHaveProperty('model_1_2_enabled');
      expect(stats).toHaveProperty('model_1_1_config');
      expect(stats).toHaveProperty('model_1_2_config');
      expect(typeof stats.model_1_1_enabled).toBe('boolean');
      expect(typeof stats.model_1_2_enabled).toBe('boolean');
    });
  });
});

