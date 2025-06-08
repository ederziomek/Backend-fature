// ===============================================
// TESTES UNITÁRIOS CORRIGIDOS - PLATFORM DATA SERVICE
// ===============================================

import { PlatformDataService } from '../src/services/PlatformDataService';
import { config } from '../src/config';

// Mock das dependências
const mockPgPool = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn(),
};

const mockRedisClient = {
  connect: jest.fn(),
  get: jest.fn(),
  setEx: jest.fn(),
  quit: jest.fn(),
  ping: jest.fn(),
};

// Mock dos módulos
jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPgPool),
}));

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

describe('PlatformDataService', () => {
  let dataService: PlatformDataService;

  beforeEach(() => {
    jest.clearAllMocks();
    dataService = new PlatformDataService();
  });

  describe('connect', () => {
    it('deve conectar com PostgreSQL e Redis com sucesso', async () => {
      // Arrange
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
        release: jest.fn(),
      };
      mockPgPool.connect.mockResolvedValue(mockClient);
      mockRedisClient.connect.mockResolvedValue(undefined);

      // Act
      await dataService.connect();

      // Assert
      expect(mockPgPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('deve tratar erro de conexão', async () => {
      // Arrange
      const error = new Error('Connection failed');
      mockPgPool.connect.mockRejectedValue(error);

      // Act & Assert
      await expect(dataService.connect()).rejects.toThrow(error);
    });
  });

  describe('getUserById', () => {
    const userId = 'user-123';

    it('deve retornar usuário do cache quando disponível', async () => {
      // Arrange
      const cachedUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedUser));

      // Act
      const result = await dataService.getUserById(userId);

      // Assert
      expect(result).toEqual(cachedUser);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockPgPool.query).not.toHaveBeenCalled();
    });

    it('deve buscar usuário no banco quando não está no cache', async () => {
      // Arrange
      const dbUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockRedisClient.get.mockResolvedValue(null);
      mockPgPool.query.mockResolvedValue({ rows: [dbUser] });
      mockRedisClient.setEx.mockResolvedValue('OK');

      // Act
      const result = await dataService.getUserById(userId);

      // Assert
      expect(result).toEqual(dbUser);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, name'),
        [userId]
      );
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `user:${userId}`,
        config.redis.ttl_seconds,
        JSON.stringify(dbUser)
      );
    });

    it('deve retornar null quando usuário não existe', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);
      mockPgPool.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await dataService.getUserById(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('validateCPAModel11', () => {
    const customerId = 'customer-123';

    it('deve validar CPA modelo 1.1 com sucesso', async () => {
      // Arrange
      const mockTransaction = {
        id: 'tx-123',
        affiliate_id: 'affiliate-456',
        customer_id: customerId,
        amount: '50.00',
        created_at: new Date(),
      };
      mockPgPool.query.mockResolvedValue({ rows: [mockTransaction] });

      // Act
      const result = await dataService.validateCPAModel11(customerId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.customer_id).toBe(customerId);
      expect(result?.affiliate_id).toBe('affiliate-456');
      expect(result?.model).toBe('1.1');
      expect(result?.validation_passed).toBe(true);
      expect(result?.first_deposit?.amount).toBe(50.00);
    });

    it('deve retornar null quando não há depósito válido', async () => {
      // Arrange
      mockPgPool.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await dataService.validateCPAModel11(customerId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('validateCPAModel12', () => {
    const customerId = 'customer-123';

    it('deve validar CPA modelo 1.2 com atividade suficiente', async () => {
      // Arrange
      const mockDeposit = {
        id: 'tx-123',
        affiliate_id: 'affiliate-456',
        amount: '50.00',
        created_at: new Date(),
      };
      const mockActivity = {
        bet_count: '15',
        total_ggr: '25.00',
      };

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [mockDeposit] })
        .mockResolvedValueOnce({ rows: [mockActivity] });

      // Act
      const result = await dataService.validateCPAModel12(customerId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.customer_id).toBe(customerId);
      expect(result?.model).toBe('1.2');
      expect(result?.validation_passed).toBe(true);
      expect(result?.activity_metrics?.bet_count).toBe(15);
      expect(result?.activity_metrics?.total_ggr).toBe(25.00);
    });

    it('deve falhar validação quando atividade é insuficiente', async () => {
      // Arrange
      const mockDeposit = {
        id: 'tx-123',
        affiliate_id: 'affiliate-456',
        amount: '50.00',
        created_at: new Date(),
      };
      const mockActivity = {
        bet_count: '5',
        total_ggr: '10.00',
      };

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [mockDeposit] })
        .mockResolvedValueOnce({ rows: [mockActivity] });

      // Act
      const result = await dataService.validateCPAModel12(customerId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.validation_passed).toBe(false);
    });
  });

  describe('checkDatabaseHealth', () => {
    it('deve retornar status conectado quando banco está saudável', async () => {
      // Arrange
      mockPgPool.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await dataService.checkDatabaseHealth();

      // Assert
      expect(result.status).toBe('connected');
      expect(result.response_time_ms).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('deve retornar status de erro quando banco falha', async () => {
      // Arrange
      const error = new Error('Database error');
      mockPgPool.query.mockRejectedValue(error);

      // Act
      const result = await dataService.checkDatabaseHealth();

      // Assert
      expect(result.status).toBe('error');
      expect(result.error).toBe('Database error');
    });
  });

  describe('checkRedisHealth', () => {
    it('deve retornar status conectado quando Redis está saudável', async () => {
      // Arrange
      mockRedisClient.ping.mockResolvedValue('PONG');

      // Act
      const result = await dataService.checkRedisHealth();

      // Assert
      expect(result.status).toBe('connected');
      expect(result.response_time_ms).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('deve retornar status de erro quando Redis falha', async () => {
      // Arrange
      const error = new Error('Redis error');
      mockRedisClient.ping.mockRejectedValue(error);

      // Act
      const result = await dataService.checkRedisHealth();

      // Assert
      expect(result.status).toBe('error');
      expect(result.error).toBe('Redis error');
    });
  });
});

