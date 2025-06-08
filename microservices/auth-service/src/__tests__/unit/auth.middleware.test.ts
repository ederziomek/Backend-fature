import { authMiddleware, requirePermission, requireRole } from '@/middleware/auth.middleware';
import { 
  mockPrisma, 
  mockRedis, 
  mockJwt,
  mockAuditService,
  testUser,
  testJwtPayload,
  testSessionData,
  createMockRequest,
  createMockReply,
  resetAllMocks 
} from '../mocks';

// Mock das dependências
jest.mock('@/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/config/redis', () => ({
  redis: mockRedis,
}));

jest.mock('jsonwebtoken', () => mockJwt);

jest.mock('@/services/audit.service', () => ({
  AuditService: mockAuditService,
}));

jest.mock('@/config', () => ({
  config: {
    jwt: {
      secret: 'test-secret',
    },
  },
}));

describe('Auth Middleware', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('authMiddleware', () => {
    it('deve autenticar usuário com token válido', async () => {
      // Arrange
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer valid-token',
          'user-agent': 'Test Agent',
        },
      });
      const reply = createMockReply();

      mockJwt.verify.mockReturnValue(testJwtPayload);
      mockRedis.get.mockResolvedValue(JSON.stringify(testSessionData));
      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      mockRedis.setex.mockResolvedValue('OK');

      // Act
      await authMiddleware(request as any, reply as any);

      // Assert
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockRedis.get).toHaveBeenCalledWith('session:test-session-id');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: expect.any(Object),
      });
      expect(request.currentUser).toEqual(testUser);
      expect(request.sessionData).toBeDefined();
    });

    it('deve falhar sem token de autorização', async () => {
      // Arrange
      const request = createMockRequest({
        headers: {},
      });
      const reply = createMockReply();

      // Act
      await authMiddleware(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Token de acesso não fornecido',
        statusCode: 401,
      });
    });

    it('deve falhar com token inválido', async () => {
      // Arrange
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });
      const reply = createMockReply();

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      await authMiddleware(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Token inválido',
        statusCode: 401,
      });
    });

    it('deve falhar com token expirado', async () => {
      // Arrange
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer expired-token',
        },
      });
      const reply = createMockReply();

      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      mockJwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      // Act
      await authMiddleware(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Token expirado',
        statusCode: 401,
      });
    });

    it('deve falhar com sessão inexistente no Redis', async () => {
      // Arrange
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });
      const reply = createMockReply();

      mockJwt.verify.mockReturnValue(testJwtPayload);
      mockRedis.get.mockResolvedValue(null); // Sessão não encontrada

      // Act
      await authMiddleware(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Sessão expirada ou inválida',
        statusCode: 401,
      });
    });

    it('deve falhar com sessão expirada', async () => {
      // Arrange
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });
      const reply = createMockReply();

      const expiredSessionData = {
        ...testSessionData,
        expiresAt: new Date(Date.now() - 1000), // Expirado
      };

      mockJwt.verify.mockReturnValue(testJwtPayload);
      mockRedis.get.mockResolvedValue(JSON.stringify(expiredSessionData));
      mockRedis.del.mockResolvedValue(1);

      // Act
      await authMiddleware(request as any, reply as any);

      // Assert
      expect(mockRedis.del).toHaveBeenCalledWith('session:test-session-id');
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Sessão expirada',
        statusCode: 401,
      });
    });

    it('deve falhar com usuário não encontrado', async () => {
      // Arrange
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });
      const reply = createMockReply();

      mockJwt.verify.mockReturnValue(testJwtPayload);
      mockRedis.get.mockResolvedValue(JSON.stringify(testSessionData));
      mockPrisma.user.findUnique.mockResolvedValue(null); // Usuário não encontrado

      // Act
      await authMiddleware(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Usuário não encontrado',
        statusCode: 401,
      });
    });

    it('deve falhar com usuário suspenso', async () => {
      // Arrange
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });
      const reply = createMockReply();

      const suspendedUser = {
        ...testUser,
        status: 'suspended',
      };

      mockJwt.verify.mockReturnValue(testJwtPayload);
      mockRedis.get.mockResolvedValue(JSON.stringify(testSessionData));
      mockPrisma.user.findUnique.mockResolvedValue(suspendedUser);

      // Act
      await authMiddleware(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Conta suspensa ou banida',
        statusCode: 403,
      });
    });
  });

  describe('requirePermission', () => {
    it('deve permitir acesso com permissão válida', async () => {
      // Arrange
      const request = createMockRequest({
        currentUser: testUser,
      });
      const reply = createMockReply();
      const middleware = requirePermission('read_users');

      mockPrisma.userPermission.findMany.mockResolvedValue([
        { permission: 'read_users' },
        { permission: 'write_users' },
      ]);

      // Act
      await middleware(request as any, reply as any);

      // Assert
      expect(mockPrisma.userPermission.findMany).toHaveBeenCalledWith({
        where: { userId: testUser.id },
        select: { permission: true },
      });
      expect(reply.status).not.toHaveBeenCalled();
    });

    it('deve negar acesso sem permissão', async () => {
      // Arrange
      const request = createMockRequest({
        currentUser: testUser,
      });
      const reply = createMockReply();
      const middleware = requirePermission('admin_access');

      mockPrisma.userPermission.findMany.mockResolvedValue([
        { permission: 'read_users' },
      ]);

      // Act
      await middleware(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Permissão insuficiente',
        statusCode: 403,
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('deve negar acesso sem usuário autenticado', async () => {
      // Arrange
      const request = createMockRequest({
        currentUser: null,
      });
      const reply = createMockReply();
      const middleware = requirePermission('read_users');

      // Act
      await middleware(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Usuário não autenticado',
        statusCode: 401,
      });
    });
  });

  describe('requireRole', () => {
    it('deve permitir acesso com role válido', async () => {
      // Arrange
      const request = createMockRequest({
        currentUser: testUser,
      });
      const reply = createMockReply();
      const middleware = requireRole('admin');

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'admin',
      });

      // Act
      await middleware(request as any, reply as any);

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: testUser.id },
        select: { role: true },
      });
      expect(reply.status).not.toHaveBeenCalled();
    });

    it('deve negar acesso com role insuficiente', async () => {
      // Arrange
      const request = createMockRequest({
        currentUser: testUser,
      });
      const reply = createMockReply();
      const middleware = requireRole('admin');

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'user',
      });

      // Act
      await middleware(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Role insuficiente',
        statusCode: 403,
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });
});

