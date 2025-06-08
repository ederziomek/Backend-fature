import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '@/services/auth.service';
import { 
  LoginRequest, 
  RegisterRequest, 
  RefreshTokenRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  ApiResponse 
} from '@/types';

/**
 * Controlador de autenticação
 */
export class AuthController {
  /**
   * Registra um novo usuário
   */
  static async register(
    request: FastifyRequest<{ Body: RegisterRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { email, password, name, phone, document } = request.body;

      // Validações básicas
      if (!email || !password || !name) {
        return reply.status(400).send({
          success: false,
          error: 'Email, senha e nome são obrigatórios',
          statusCode: 400
        });
      }

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reply.status(400).send({
          success: false,
          error: 'Formato de email inválido',
          statusCode: 400
        });
      }

      // Validar força da senha
      if (password.length < 8) {
        return reply.status(400).send({
          success: false,
          error: 'Senha deve ter pelo menos 8 caracteres',
          statusCode: 400
        });
      }

      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      const authResponse = await AuthService.register(
        { email, password, name, phone, document },
        ipAddress,
        userAgent
      );

      return reply.status(201).send({
        success: true,
        data: authResponse,
        message: 'Usuário registrado com sucesso',
        statusCode: 201
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Autentica um usuário
   */
  static async login(
    request: FastifyRequest<{ Body: LoginRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { email, password, deviceFingerprint, rememberMe } = request.body;

      // Validações básicas
      if (!email || !password) {
        return reply.status(400).send({
          success: false,
          error: 'Email e senha são obrigatórios',
          statusCode: 400
        });
      }

      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      const authResponse = await AuthService.login(
        { email, password, deviceFingerprint, rememberMe },
        ipAddress,
        userAgent
      );

      return reply.status(200).send({
        success: true,
        data: authResponse,
        message: 'Login realizado com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(401).send({
        success: false,
        error: error.message,
        statusCode: 401
      });
    }
  }

  /**
   * Renova token de acesso
   */
  static async refreshToken(
    request: FastifyRequest<{ Body: RefreshTokenRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { refreshToken } = request.body;

      if (!refreshToken) {
        return reply.status(400).send({
          success: false,
          error: 'Refresh token é obrigatório',
          statusCode: 400
        });
      }

      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      const authResponse = await AuthService.refreshToken(
        refreshToken,
        ipAddress,
        userAgent
      );

      return reply.status(200).send({
        success: true,
        data: authResponse,
        message: 'Token renovado com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(401).send({
        success: false,
        error: error.message,
        statusCode: 401
      });
    }
  }

  /**
   * Logout do usuário
   */
  static async logout(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const sessionData = request.sessionData;

      if (!sessionData) {
        return reply.status(401).send({
          success: false,
          error: 'Sessão não encontrada',
          statusCode: 401
        });
      }

      const ipAddress = request.ip;

      await AuthService.logout(sessionData.sessionId, ipAddress);

      return reply.status(200).send({
        success: true,
        message: 'Logout realizado com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Logout de todas as sessões
   */
  static async logoutAll(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const currentUser = request.currentUser;

      if (!currentUser) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado',
          statusCode: 401
        });
      }

      const ipAddress = request.ip;

      await AuthService.logoutAll(currentUser.id, ipAddress);

      return reply.status(200).send({
        success: true,
        message: 'Logout de todas as sessões realizado com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Obtém dados do usuário atual
   */
  static async me(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const currentUser = request.currentUser;

      if (!currentUser) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado',
          statusCode: 401
        });
      }

      return reply.status(200).send({
        success: true,
        data: currentUser,
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Altera senha do usuário
   */
  static async changePassword(
    request: FastifyRequest<{ Body: ChangePasswordRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const currentUser = request.currentUser;
      const { currentPassword, newPassword } = request.body;

      if (!currentUser) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado',
          statusCode: 401
        });
      }

      if (!currentPassword || !newPassword) {
        return reply.status(400).send({
          success: false,
          error: 'Senha atual e nova senha são obrigatórias',
          statusCode: 400
        });
      }

      if (newPassword.length < 8) {
        return reply.status(400).send({
          success: false,
          error: 'Nova senha deve ter pelo menos 8 caracteres',
          statusCode: 400
        });
      }

      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      await AuthService.changePassword(
        currentUser.id,
        currentPassword,
        newPassword,
        ipAddress,
        userAgent
      );

      return reply.status(200).send({
        success: true,
        message: 'Senha alterada com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Solicita recuperação de senha
   */
  static async forgotPassword(
    request: FastifyRequest<{ Body: ForgotPasswordRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { email } = request.body;

      if (!email) {
        return reply.status(400).send({
          success: false,
          error: 'Email é obrigatório',
          statusCode: 400
        });
      }

      const ipAddress = request.ip;

      await AuthService.forgotPassword(email, ipAddress);

      return reply.status(200).send({
        success: true,
        message: 'Se o email existir, você receberá instruções para recuperação',
        statusCode: 200
      });

    } catch (error: any) {
      // Sempre retorna sucesso por segurança
      return reply.status(200).send({
        success: true,
        message: 'Se o email existir, você receberá instruções para recuperação',
        statusCode: 200
      });
    }
  }

  /**
   * Redefine senha com token
   */
  static async resetPassword(
    request: FastifyRequest<{ Body: ResetPasswordRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { token, password } = request.body;

      if (!token || !password) {
        return reply.status(400).send({
          success: false,
          error: 'Token e nova senha são obrigatórios',
          statusCode: 400
        });
      }

      if (password.length < 8) {
        return reply.status(400).send({
          success: false,
          error: 'Senha deve ter pelo menos 8 caracteres',
          statusCode: 400
        });
      }

      const ipAddress = request.ip;

      await AuthService.resetPassword(token, password, ipAddress);

      return reply.status(200).send({
        success: true,
        message: 'Senha redefinida com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Verifica email do usuário
   */
  static async verifyEmail(
    request: FastifyRequest<{ Body: VerifyEmailRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { token } = request.body;

      if (!token) {
        return reply.status(400).send({
          success: false,
          error: 'Token de verificação é obrigatório',
          statusCode: 400
        });
      }

      await AuthService.verifyEmail(token);

      return reply.status(200).send({
        success: true,
        message: 'Email verificado com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }
}

