import { AuthService } from '@/services/auth.service';
import { 
  mockPrisma, 
  mockRedis, 
  mockBcrypt, 
  mockJwt,
  mockEventService,
  mockAuditService,
  testUser,
  testSession,
  resetAllMocks 
} from '../mocks';

// Mock das dependências
jest.mock('@/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/config/redis', () => ({
  redis: mockRedis,
  sessionUtils: {
    createSessionKey: jest.fn((sessionId) => `session:${sessionId}`),
  },
}));

jest.mock('bcryptjs', () => mockBcrypt);
jest.mock('jsonwebtoken', () => mockJwt);

jest.mock('@/services/audit.service', () => ({
  AuditService: mockAuditService,
}));

jest.mock('@/services/event.service', () => ({
  EventService: mockEventService,
}));

jest.mock('@/config', () => ({
  config: {
    security: {
      bcryptRounds: 10,
    },
    jwt: {
      secret: 'test-secret',
      refreshSecret: 'test-refresh-secret',
      expiresIn: '15m',
      refreshExpiresIn: '7d',
    },
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      // Arrange
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        phone: '+5511999999999',
        document: '12345678901',
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce(null); // Email não existe
      mockPrisma.user.findUnique.mockResolvedValueOnce(null); // Documento não existe
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      mockPrisma.user.create.mockResolvedValue({
        ...testUser,
        email: registerData.email,
        name: registerData.name,
      });
      mockPrisma.userSession.create.mockResolvedValue(testSession);
      mockRedis.setex.mockResolvedValue('OK');
      mockJwt.sign.mockReturnValue('test-access-token');

      // Act
      const result = await AuthService.register(registerData, '127.0.0.1', 'Test Agent');

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(registerData.password, 10);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
      expect(mockEventService.publishUserCreated).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('deve falhar se email já existir', async () => {
      // Arrange
      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'New User',
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce(testUser); // Email já existe

      // Act & Assert
      await expect(
        AuthService.register(registerData, '127.0.0.1', 'Test Agent')
      ).rejects.toThrow('Email já está em uso');
    });

    it('deve falhar se documento já existir', async () => {
      // Arrange
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        document: '12345678901',
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce(null); // Email não existe
      mockPrisma.user.findUnique.mockResolvedValueOnce(testUser); // Documento já existe

      // Act & Assert
      await expect(
        AuthService.register(registerData, '127.0.0.1', 'Test Agent')
      ).rejects.toThrow('Documento já está em uso');
    });
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(testUser);
      mockPrisma.userSession.create.mockResolvedValue(testSession);
      mockRedis.setex.mockResolvedValue('OK');
      mockJwt.sign.mockReturnValue('test-access-token');

      // Act
      const result = await AuthService.login(loginData, '127.0.0.1', 'Test Agent');

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email.toLowerCase() },
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(loginData.password, testUser.passwordHash);
      expect(mockAuditService.log).toHaveBeenCalled();
      expect(mockEventService.publishUserLogin).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('deve falhar com credenciais inválidas', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      mockBcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(
        AuthService.login(loginData, '127.0.0.1', 'Test Agent')
      ).rejects.toThrow('Credenciais inválidas');
    });

    it('deve falhar se usuário não existir', async () => {
      // Arrange
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        AuthService.login(loginData, '127.0.0.1', 'Test Agent')
      ).rejects.toThrow('Credenciais inválidas');
    });

    it('deve falhar se conta estiver bloqueada', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const lockedUser = {
        ...testUser,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // Bloqueado por 10 minutos
      };

      mockPrisma.user.findUnique.mockResolvedValue(lockedUser);

      // Act & Assert
      await expect(
        AuthService.login(loginData, '127.0.0.1', 'Test Agent')
      ).rejects.toThrow(/Conta bloqueada/);
    });

    it('deve falhar se conta estiver suspensa', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const suspendedUser = {
        ...testUser,
        status: 'suspended',
      };

      mockPrisma.user.findUnique.mockResolvedValue(suspendedUser);
      mockBcrypt.compare.mockResolvedValue(true);

      // Act & Assert
      await expect(
        AuthService.login(loginData, '127.0.0.1', 'Test Agent')
      ).rejects.toThrow('Conta suspensa ou banida');
    });
  });

  describe('refreshToken', () => {
    it('deve renovar token com sucesso', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      
      mockPrisma.userSession.findUnique.mockResolvedValue(testSession);
      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      mockJwt.sign.mockReturnValue('new-access-token');
      mockRedis.setex.mockResolvedValue('OK');

      // Act
      const result = await AuthService.refreshToken(refreshToken, '127.0.0.1', 'Test Agent');

      // Assert
      expect(mockPrisma.userSession.findUnique).toHaveBeenCalledWith({
        where: { refreshToken },
      });
      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('deve falhar com refresh token inválido', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      
      mockPrisma.userSession.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        AuthService.refreshToken(refreshToken, '127.0.0.1', 'Test Agent')
      ).rejects.toThrow('Refresh token inválido');
    });

    it('deve falhar com refresh token expirado', async () => {
      // Arrange
      const refreshToken = 'expired-refresh-token';
      const expiredSession = {
        ...testSession,
        refreshExpiresAt: new Date(Date.now() - 1000), // Expirado
      };
      
      mockPrisma.userSession.findUnique.mockResolvedValue(expiredSession);

      // Act & Assert
      await expect(
        AuthService.refreshToken(refreshToken, '127.0.0.1', 'Test Agent')
      ).rejects.toThrow('Refresh token expirado');
    });
  });

  describe('logout', () => {
    it('deve fazer logout com sucesso', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      
      mockPrisma.userSession.update.mockResolvedValue({
        ...testSession,
        status: 'inactive',
      });
      mockRedis.del.mockResolvedValue(1);

      // Act
      await AuthService.logout(sessionId, '127.0.0.1');

      // Assert
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { status: 'inactive' },
      });
      expect(mockRedis.del).toHaveBeenCalledWith(`session:${sessionId}`);
      expect(mockAuditService.logLogout).toHaveBeenCalled();
      expect(mockEventService.publishUserLogout).toHaveBeenCalled();
    });
  });

  describe('logoutAll', () => {
    it('deve fazer logout de todas as sessões com sucesso', async () => {
      // Arrange
      const userId = 'test-user-id';
      const sessions = [testSession, { ...testSession, id: 'session-2' }];
      
      mockPrisma.userSession.findMany.mockResolvedValue(sessions);
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 2 });
      mockRedis.del.mockResolvedValue(2);

      // Act
      await AuthService.logoutAll(userId, '127.0.0.1');

      // Assert
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId, status: 'active' },
        data: { status: 'inactive' },
      });
      expect(mockRedis.del).toHaveBeenCalledWith(['session:test-session-id', 'session:session-2']);
    });
  });
});

