import { AuthController } from '@/controllers/auth.controller';
import { AuthService } from '@/services/auth.service';
import { 
  testUser,
  createMockRequest,
  createMockReply,
  resetAllMocks 
} from '../mocks';

// Mock do AuthService
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  changePassword: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
};

jest.mock('@/services/auth.service', () => ({
  AuthService: mockAuthService,
}));

describe('AuthController', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('deve registrar usuário com sucesso', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const request = createMockRequest({
        body: registerData,
      });
      const reply = createMockReply();

      const authResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
        user: testUser,
      };

      mockAuthService.register.mockResolvedValue(authResponse);

      // Act
      await AuthController.register(request as any, reply as any);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalledWith(
        registerData,
        '127.0.0.1',
        'Test User Agent'
      );
      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith({
        success: true,
        data: authResponse,
        message: 'Usuário registrado com sucesso',
        statusCode: 201,
      });
    });

    it('deve falhar com dados inválidos', async () => {
      // Arrange
      const request = createMockRequest({
        body: {
          email: 'invalid-email',
          password: '123', // Muito curta
        },
      });
      const reply = createMockReply();

      // Act
      await AuthController.register(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Email, senha e nome são obrigatórios'),
        statusCode: 400,
      });
    });

    it('deve falhar com formato de email inválido', async () => {
      // Arrange
      const request = createMockRequest({
        body: {
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        },
      });
      const reply = createMockReply();

      // Act
      await AuthController.register(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Formato de email inválido',
        statusCode: 400,
      });
    });

    it('deve falhar com senha muito curta', async () => {
      // Arrange
      const request = createMockRequest({
        body: {
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
        },
      });
      const reply = createMockReply();

      // Act
      await AuthController.register(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Senha deve ter pelo menos 8 caracteres',
        statusCode: 400,
      });
    });

    it('deve tratar erro do AuthService', async () => {
      // Arrange
      const request = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      });
      const reply = createMockReply();

      mockAuthService.register.mockRejectedValue(new Error('Email já está em uso'));

      // Act
      await AuthController.register(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Email já está em uso',
        statusCode: 400,
      });
    });
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const request = createMockRequest({
        body: loginData,
      });
      const reply = createMockReply();

      const authResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
        user: testUser,
      };

      mockAuthService.login.mockResolvedValue(authResponse);

      // Act
      await AuthController.login(request as any, reply as any);

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith(
        loginData,
        '127.0.0.1',
        'Test User Agent'
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        success: true,
        data: authResponse,
        message: 'Login realizado com sucesso',
        statusCode: 200,
      });
    });

    it('deve falhar sem email ou senha', async () => {
      // Arrange
      const request = createMockRequest({
        body: {
          email: 'test@example.com',
          // password ausente
        },
      });
      const reply = createMockReply();

      // Act
      await AuthController.login(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Email e senha são obrigatórios',
        statusCode: 400,
      });
    });

    it('deve tratar erro de credenciais inválidas', async () => {
      // Arrange
      const request = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });
      const reply = createMockReply();

      mockAuthService.login.mockRejectedValue(new Error('Credenciais inválidas'));

      // Act
      await AuthController.login(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Credenciais inválidas',
        statusCode: 401,
      });
    });
  });

  describe('refreshToken', () => {
    it('deve renovar token com sucesso', async () => {
      // Arrange
      const request = createMockRequest({
        body: {
          refreshToken: 'valid-refresh-token',
        },
      });
      const reply = createMockReply();

      const authResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(),
      };

      mockAuthService.refreshToken.mockResolvedValue(authResponse);

      // Act
      await AuthController.refreshToken(request as any, reply as any);

      // Assert
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
        '127.0.0.1',
        'Test User Agent'
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        success: true,
        data: authResponse,
        message: 'Token renovado com sucesso',
        statusCode: 200,
      });
    });

    it('deve falhar sem refresh token', async () => {
      // Arrange
      const request = createMockRequest({
        body: {},
      });
      const reply = createMockReply();

      // Act
      await AuthController.refreshToken(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Refresh token é obrigatório',
        statusCode: 400,
      });
    });
  });

  describe('logout', () => {
    it('deve fazer logout com sucesso', async () => {
      // Arrange
      const request = createMockRequest({
        sessionData: {
          sessionId: 'test-session-id',
          userId: 'test-user-id',
        },
      });
      const reply = createMockReply();

      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      await AuthController.logout(request as any, reply as any);

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'test-session-id',
        '127.0.0.1'
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        success: true,
        message: 'Logout realizado com sucesso',
        statusCode: 200,
      });
    });

    it('deve falhar sem sessão', async () => {
      // Arrange
      const request = createMockRequest({
        sessionData: null,
      });
      const reply = createMockReply();

      // Act
      await AuthController.logout(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Sessão não encontrada',
        statusCode: 401,
      });
    });
  });

  describe('me', () => {
    it('deve retornar dados do usuário atual', async () => {
      // Arrange
      const request = createMockRequest({
        currentUser: testUser,
      });
      const reply = createMockReply();

      // Act
      await AuthController.me(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        success: true,
        data: testUser,
        statusCode: 200,
      });
    });

    it('deve falhar sem usuário autenticado', async () => {
      // Arrange
      const request = createMockRequest({
        currentUser: null,
      });
      const reply = createMockReply();

      // Act
      await AuthController.me(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Usuário não autenticado',
        statusCode: 401,
      });
    });
  });

  describe('changePassword', () => {
    it('deve alterar senha com sucesso', async () => {
      // Arrange
      const request = createMockRequest({
        currentUser: testUser,
        body: {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
        },
      });
      const reply = createMockReply();

      mockAuthService.changePassword.mockResolvedValue(undefined);

      // Act
      await AuthController.changePassword(request as any, reply as any);

      // Assert
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        testUser.id,
        'oldpassword',
        'newpassword123',
        '127.0.0.1',
        'Test User Agent'
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        success: true,
        message: 'Senha alterada com sucesso',
        statusCode: 200,
      });
    });

    it('deve falhar com nova senha muito curta', async () => {
      // Arrange
      const request = createMockRequest({
        currentUser: testUser,
        body: {
          currentPassword: 'oldpassword',
          newPassword: '123',
        },
      });
      const reply = createMockReply();

      // Act
      await AuthController.changePassword(request as any, reply as any);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Nova senha deve ter pelo menos 8 caracteres',
        statusCode: 400,
      });
    });
  });
});

