import { AuditService } from '@/services/audit.service';
import { mockPrisma, resetAllMocks } from '../mocks';

// Mock do Prisma
jest.mock('@/config/database', () => ({
  prisma: mockPrisma,
}));

describe('AuditService', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('log', () => {
    it('deve criar log de auditoria com sucesso', async () => {
      // Arrange
      const auditData = {
        userId: 'test-user-id',
        action: 'user.login',
        resource: 'user',
        resourceId: 'test-user-id',
        details: { email: 'test@example.com' },
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        severity: 'info' as const,
      };

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'audit-log-id',
        ...auditData,
        timestamp: new Date(),
      });

      // Act
      await AuditService.log(auditData);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          ...auditData,
          timestamp: expect.any(Date),
        },
      });
    });

    it('deve tratar erro sem falhar operação principal', async () => {
      // Arrange
      const auditData = {
        action: 'user.login',
        resource: 'user',
        severity: 'info' as const,
      };

      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await AuditService.log(auditData);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Erro ao registrar log de auditoria:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getLogs', () => {
    it('deve buscar logs com filtros', async () => {
      // Arrange
      const filters = {
        userId: 'test-user-id',
        action: 'login',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 10,
        offset: 0,
      };

      const mockLogs = [
        {
          id: 'log-1',
          action: 'user.login',
          timestamp: new Date(),
          user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User' },
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      // Act
      const result = await AuditService.getLogs(filters);

      // Assert
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          action: { contains: 'login', mode: 'insensitive' },
          timestamp: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        skip: 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        hasMore: false,
      });
    });

    it('deve buscar logs sem filtros', async () => {
      // Arrange
      const mockLogs = [];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      // Act
      const result = await AuditService.getLogs({});

      // Assert
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        take: 50, // Limite padrão
        skip: 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      expect(result).toEqual({
        logs: mockLogs,
        total: 0,
        hasMore: false,
      });
    });
  });

  describe('logFailedLogin', () => {
    it('deve registrar tentativa de login falhada', async () => {
      // Arrange
      const userId = 'test-user-id';
      const ipAddress = '127.0.0.1';
      const userAgent = 'Test Agent';

      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await AuditService.logFailedLogin(userId, ipAddress, userAgent);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: 'user.login.failed',
          resource: 'user',
          resourceId: userId,
          details: { reason: 'invalid_credentials' },
          ipAddress,
          userAgent,
          severity: 'warning',
          timestamp: expect.any(Date),
        },
      });
    });
  });

  describe('logAccountLocked', () => {
    it('deve registrar bloqueio de conta', async () => {
      // Arrange
      const userId = 'test-user-id';
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      const ipAddress = '127.0.0.1';

      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await AuditService.logAccountLocked(userId, lockedUntil, ipAddress);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: 'user.account.locked',
          resource: 'user',
          resourceId: userId,
          details: {
            lockedUntil: lockedUntil.toISOString(),
            reason: 'too_many_failed_attempts',
          },
          ipAddress,
          severity: 'warning',
          timestamp: expect.any(Date),
        },
      });
    });
  });

  describe('logSuspiciousActivity', () => {
    it('deve registrar atividade suspeita', async () => {
      // Arrange
      const userId = 'test-user-id';
      const activityType = 'multiple_locations';
      const details = { locations: ['Brazil', 'USA'] };
      const ipAddress = '127.0.0.1';

      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await AuditService.logSuspiciousActivity(userId, activityType, details, ipAddress);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: `security.suspicious.${activityType}`,
          resource: 'security',
          resourceId: userId,
          details,
          ipAddress,
          severity: 'critical',
          timestamp: expect.any(Date),
        },
      });
    });
  });
});

