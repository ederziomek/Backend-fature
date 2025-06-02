import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService, LoginRequest, RegisterRequest } from '@/services/auth';
import { JwtService } from '@/utils/jwt';
import { ApiResponse } from '@/types/fastify';

export class AuthController {
  /**
   * POST /auth/login
   * Autentica um usuário
   */
  static async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const data = request.body as LoginRequest;

      const result = await AuthService.login(data);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      return reply.status(200).send(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      const response: ApiResponse = {
        success: false,
        error: 'LOGIN_FAILED',
        message,
      };

      return reply.status(400).send(response);
    }
  }

  /**
   * POST /auth/register
   * Registra um novo usuário
   */
  static async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const data = request.body as RegisterRequest;

      const result = await AuthService.register(data);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Usuário registrado com sucesso',
      };

      return reply.status(201).send(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      const response: ApiResponse = {
        success: false,
        error: 'REGISTRATION_FAILED',
        message,
      };

      return reply.status(400).send(response);
    }
  }

  /**
   * POST /auth/refresh
   * Renova o access token
   */
  static async refreshToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { refreshToken } = request.body as { refreshToken: string };

      if (!refreshToken) {
        const response: ApiResponse = {
          success: false,
          error: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token é obrigatório',
        };

        return reply.status(400).send(response);
      }

      const result = await AuthService.refreshToken(refreshToken);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      return reply.status(200).send(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      const response: ApiResponse = {
        success: false,
        error: 'REFRESH_FAILED',
        message,
      };

      return reply.status(401).send(response);
    }
  }

  /**
   * POST /auth/logout
   * Faz logout do usuário
   */
  static async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { refreshToken } = request.body as { refreshToken?: string };
      const accessToken = JwtService.extractTokenFromHeader(request.headers.authorization);

      if (!accessToken) {
        const response: ApiResponse = {
          success: false,
          error: 'MISSING_ACCESS_TOKEN',
          message: 'Access token é obrigatório',
        };

        return reply.status(400).send(response);
      }

      await AuthService.logout(accessToken, refreshToken);

      const response: ApiResponse = {
        success: true,
        message: 'Logout realizado com sucesso',
      };

      return reply.status(200).send(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      const response: ApiResponse = {
        success: false,
        error: 'LOGOUT_FAILED',
        message,
      };

      return reply.status(400).send(response);
    }
  }

  /**
   * GET /auth/me
   * Retorna informações do usuário autenticado
   */
  static async me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      if (!request.currentUser) {
        const response: ApiResponse = {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Usuário não autenticado',
        };

        return reply.status(401).send(response);
      }

      const userData = {
        user: request.currentUser,
        affiliate: request.affiliate || null,
      };

      const response: ApiResponse = {
        success: true,
        data: userData,
      };

      return reply.status(200).send(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      const response: ApiResponse = {
        success: false,
        error: 'FETCH_USER_FAILED',
        message,
      };

      return reply.status(500).send(response);
    }
  }

  /**
   * POST /auth/verify-email
   * Verifica email do usuário
   */
  static async verifyEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // TODO: Implementar verificação de email
      const response: ApiResponse = {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'Funcionalidade não implementada',
      };

      return reply.status(501).send(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      const response: ApiResponse = {
        success: false,
        error: 'EMAIL_VERIFICATION_FAILED',
        message,
      };

      return reply.status(500).send(response);
    }
  }

  /**
   * POST /auth/forgot-password
   * Solicita redefinição de senha
   */
  static async forgotPassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // TODO: Implementar redefinição de senha
      const response: ApiResponse = {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'Funcionalidade não implementada',
      };

      return reply.status(501).send(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      const response: ApiResponse = {
        success: false,
        error: 'FORGOT_PASSWORD_FAILED',
        message,
      };

      return reply.status(500).send(response);
    }
  }

  /**
   * POST /auth/reset-password
   * Redefine senha do usuário
   */
  static async resetPassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // TODO: Implementar redefinição de senha
      const response: ApiResponse = {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'Funcionalidade não implementada',
      };

      return reply.status(501).send(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      const response: ApiResponse = {
        success: false,
        error: 'RESET_PASSWORD_FAILED',
        message,
      };

      return reply.status(500).send(response);
    }
  }

  /**
   * POST /auth/change-password
   * Altera senha do usuário autenticado
   */
  static async changePassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // TODO: Implementar alteração de senha
      const response: ApiResponse = {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'Funcionalidade não implementada',
      };

      return reply.status(501).send(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      const response: ApiResponse = {
        success: false,
        error: 'CHANGE_PASSWORD_FAILED',
        message,
      };

      return reply.status(500).send(response);
    }
  }

  /**
   * POST /auth/enable-mfa
   * Habilita autenticação de dois fatores
   */
  static async enableMfa(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // TODO: Implementar MFA
      const response: ApiResponse = {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'Funcionalidade não implementada',
      };

      return reply.status(501).send(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      const response: ApiResponse = {
        success: false,
        error: 'ENABLE_MFA_FAILED',
        message,
      };

      return reply.status(500).send(response);
    }
  }

  /**
   * POST /auth/disable-mfa
   * Desabilita autenticação de dois fatores
   */
  static async disableMfa(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // TODO: Implementar MFA
      const response: ApiResponse = {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'Funcionalidade não implementada',
      };

      return reply.status(501).send(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      const response: ApiResponse = {
        success: false,
        error: 'DISABLE_MFA_FAILED',
        message,
      };

      return reply.status(500).send(response);
    }
  }
}

