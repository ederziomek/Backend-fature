import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/config/database';
import { redis, sessionUtils } from '@/config/redis';
import { config } from '@/config';
import { 
  UserData, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  JwtPayload, 
  RefreshJwtPayload,
  SessionData 
} from '@/types';
import { AuditService } from './audit.service';
import { EventService } from './event.service';
import { EmailService } from './email.service';
import { TokenService } from './token.service';

export class AuthService {
  /**
   * Registra um novo usuário
   */
  static async register(data: RegisterRequest, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error('Email já está em uso');
    }

    // Verificar se documento já existe (se fornecido)
    if (data.document) {
      const existingDocument = await prisma.user.findUnique({
        where: { document: data.document }
      });

      if (existingDocument) {
        throw new Error('Documento já está em uso');
      }
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(data.password, config.security.bcryptRounds);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        phone: data.phone,
        document: data.document,
        status: 'pending', // Requer verificação de email
      }
    });

    // Log de auditoria
    await AuditService.log({
      userId: user.id,
      action: 'user.register',
      resource: 'user',
      resourceId: user.id,
      details: { email: user.email, name: user.name },
      ipAddress,
      userAgent,
      severity: 'info'
    });

    // Gerar token de verificação de email
    const verificationToken = await TokenService.createToken(user.id, 'email_verification', 1440); // 24 horas

    // Enviar email de verificação
    try {
      await EmailService.sendEmailVerification(user.email, verificationToken, user.name);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Não falhar o registro se o email não puder ser enviado
    }

    // Publicar evento
    await EventService.publishUserCreated({
      userId: user.id,
      email: user.email,
      name: user.name,
      timestamp: new Date(),
      metadata: { registrationIp: ipAddress }
    });

    // Criar sessão e tokens
    const authResponse = await this.createSession(user, ipAddress, userAgent);

    return authResponse;
  }

  /**
   * Autentica um usuário
   */
  static async login(data: LoginRequest, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    // Verificar se conta está bloqueada
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new Error(`Conta bloqueada. Tente novamente em ${remainingTime} minutos`);
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      // Incrementar tentativas de login falhadas
      await this.handleFailedLogin(user.id);
      throw new Error('Credenciais inválidas');
    }

    // Verificar status do usuário
    if (user.status === 'suspended' || user.status === 'banned') {
      throw new Error('Conta suspensa ou banida');
    }

    // Reset tentativas de login falhadas
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress
      }
    });

    // Log de auditoria
    await AuditService.log({
      userId: user.id,
      action: 'user.login',
      resource: 'user',
      resourceId: user.id,
      details: { email: user.email },
      ipAddress,
      userAgent,
      severity: 'info'
    });

    // Criar sessão e tokens
    const authResponse = await this.createSession(user, ipAddress, userAgent, data.deviceFingerprint);

    // Extrair sessionId do JWT payload para usar no evento
    const decoded = jwt.decode(authResponse.accessToken) as JwtPayload;
    
    // Publicar evento após criar sessão
    await EventService.publishUserLogin({
      userId: user.id,
      email: user.email,
      name: user.name,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      deviceFingerprint: data.deviceFingerprint,
      sessionId: decoded.sessionId
    });

    return authResponse;
  }

  /**
   * Cria uma nova sessão para o usuário
   */
  private static async createSession(
    user: any, 
    ipAddress?: string, 
    userAgent?: string, 
    deviceFingerprint?: string
  ): Promise<AuthResponse> {
    const sessionId = uuidv4();
    const sessionToken = uuidv4();
    const refreshToken = uuidv4();

    const expiresAt = new Date(Date.now() + this.parseTimeToMs(config.jwt.expiresIn));
    const refreshExpiresAt = new Date(Date.now() + this.parseTimeToMs(config.jwt.refreshExpiresIn));

    // Criar sessão no banco
    await prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        sessionToken,
        refreshToken,
        deviceFingerprint,
        ipAddress,
        userAgent,
        expiresAt,
        refreshExpiresAt,
        status: 'active'
      }
    });

    // Salvar dados da sessão no Redis
    const sessionData: SessionData = {
      userId: user.id,
      sessionId,
      deviceFingerprint: deviceFingerprint || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: new Date(),
      expiresAt
    };

    await sessionUtils.saveSession(sessionId, sessionData);

    // Gerar tokens JWT
    const jwtPayload: JwtPayload = {
      userId: user.id,
      sessionId,
      email: user.email
    };

    // @ts-ignore - Problema conhecido com tipagem do jsonwebtoken
    const accessToken = jwt.sign(jwtPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    const userData: UserData = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone ?? undefined,
      document: user.document ?? undefined,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt ?? undefined,
      phoneVerifiedAt: user.phoneVerifiedAt ?? undefined,
      lastLoginAt: user.lastLoginAt ?? undefined,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return {
      accessToken,
      refreshToken,
      expiresAt,
      user: userData
    };
  }

  /**
   * Renova tokens de acesso
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    // Buscar sessão pelo refresh token
    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: true }
    });

    if (!session || session.status !== 'active') {
      throw new Error('Refresh token inválido');
    }

    if (session.refreshExpiresAt && session.refreshExpiresAt < new Date()) {
      // Marcar sessão como expirada
      await prisma.userSession.update({
        where: { id: session.id },
        data: { status: 'expired' }
      });
      throw new Error('Refresh token expirado');
    }

    // Gerar novos tokens
    const newRefreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + this.parseTimeToMs(config.jwt.expiresIn));
    const refreshExpiresAt = new Date(Date.now() + this.parseTimeToMs(config.jwt.refreshExpiresIn));

    // Atualizar sessão
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt,
        refreshExpiresAt,
        lastUsedAt: new Date()
      }
    });

    // Atualizar Redis
    await sessionUtils.refreshSession(session.id);

    // Gerar novo access token
    const jwtPayload: JwtPayload = {
      userId: session.userId,
      sessionId: session.id,
      email: session.user.email
    };

    // @ts-ignore - Problema conhecido com tipagem do jsonwebtoken
    const accessToken = jwt.sign(jwtPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt
    };
  }

  /**
   * Faz logout do usuário
   */
  static async logout(sessionId: string, userId: string): Promise<void> {
    // Marcar sessão como revogada
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { status: 'revoked' }
    });

    // Remover do Redis
    await sessionUtils.deleteSession(sessionId);

    // Log de auditoria
    await AuditService.log({
      userId,
      action: 'user.logout',
      resource: 'session',
      resourceId: sessionId,
      severity: 'info'
    });

    // Publicar evento
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await EventService.publishUserLogout({
        userId: user.id,
        email: user.email,
        name: user.name,
        timestamp: new Date(),
        sessionId
      });
    }
  }

  /**
   * Valida um token JWT
   */
  static async validateToken(token: string): Promise<{ user: UserData; sessionData: SessionData } | null> {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      // Verificar se sessão existe e está ativa
      const sessionData = await sessionUtils.getSession(payload.sessionId);
      if (!sessionData) {
        return null;
      }

      // Buscar usuário
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user || user.status === 'suspended' || user.status === 'banned') {
        return null;
      }

      const userData: UserData = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone ?? undefined,
        document: user.document ?? undefined,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt ?? undefined,
        phoneVerifiedAt: user.phoneVerifiedAt ?? undefined,
        lastLoginAt: user.lastLoginAt ?? undefined,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return { user: userData, sessionData };
    } catch (error) {
      return null;
    }
  }

  /**
   * Trata tentativas de login falhadas
   */
  private static async handleFailedLogin(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const newAttempts = user.failedLoginAttempts + 1;
    const updateData: any = { failedLoginAttempts: newAttempts };

    // Bloquear conta após máximo de tentativas
    if (newAttempts >= config.security.maxLoginAttempts) {
      updateData.lockedUntil = new Date(Date.now() + config.security.lockoutDuration);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    // Log de auditoria
    await AuditService.log({
      userId,
      action: 'user.failed_login',
      resource: 'user',
      resourceId: userId,
      details: { attempts: newAttempts, locked: !!updateData.lockedUntil },
      severity: 'warning'
    });
  }

  /**
   * Faz logout de todas as sessões de um usuário
   */
  static async logoutAll(userId: string, ipAddress?: string): Promise<void> {
    // Buscar todas as sessões ativas do usuário
    const activeSessions = await prisma.userSession.findMany({
      where: {
        userId,
        status: 'active'
      }
    });

    // Revogar todas as sessões no banco
    await prisma.userSession.updateMany({
      where: {
        userId,
        status: 'active'
      },
      data: { status: 'revoked' }
    });

    // Remover todas as sessões do Redis
    for (const session of activeSessions) {
      await sessionUtils.deleteSession(session.id);
    }

    // Log de auditoria
    await AuditService.log({
      userId,
      action: 'user.logout_all',
      resource: 'session',
      details: { sessionCount: activeSessions.length },
      ipAddress: ipAddress || '',
      severity: 'info'
    });

    // Publicar evento
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await EventService.publishUserLogoutAll({
        userId: user.id,
        email: user.email,
        name: user.name,
        timestamp: new Date(),
        sessionCount: activeSessions.length
      });
    }
  }

  /**
   * Altera a senha do usuário
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Buscar usuário
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Senha atual incorreta');
    }

    // Verificar se nova senha é diferente da atual
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new Error('A nova senha deve ser diferente da senha atual');
    }

    // Hash da nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

    // Atualizar senha
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash
      }
    });

    // Revogar todas as sessões ativas (forçar novo login)
    await this.logoutAll(userId, ipAddress);

    // Log de auditoria
    await AuditService.log({
      userId,
      action: 'user.password_changed',
      resource: 'user',
      ipAddress: ipAddress || '',
      userAgent: userAgent || '',
      severity: 'info'
    });

    // Publicar evento
    await EventService.publishPasswordChanged({
      userId: user.id,
      email: user.email,
      name: user.name,
      timestamp: new Date()
    });
  }

  /**
   * Inicia processo de recuperação de senha
   */
  static async forgotPassword(email: string, ipAddress?: string): Promise<void> {
    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Sempre retornar sucesso para não vazar informações
    if (!user) {
      return;
    }

    try {
      // Gerar token de reset (expira em 1 hora)
      const resetToken = await TokenService.createToken(user.id, 'password_reset', 60);

      // Enviar email de reset
      await EmailService.sendPasswordReset(user.email, resetToken, user.name);

      // Log de auditoria
      await AuditService.log({
        userId: user.id,
        action: 'user.password_reset_requested',
        resource: 'user',
        details: { email: user.email },
        ipAddress: ipAddress || '',
        severity: 'info'
      });

      // Publicar evento
      await EventService.publishPasswordResetRequested({
        userId: user.id,
        email: user.email,
        name: user.name,
        resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error in forgotPassword:', error);
      // Log do erro mas não expor para o usuário
      await AuditService.log({
        userId: user.id,
        action: 'user.password_reset_failed',
        resource: 'user',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        ipAddress: ipAddress || '',
        severity: 'error'
      });
    }
  }

  /**
   * Redefine a senha usando token de reset
   */
  static async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string
  ): Promise<void> {
    // Validar e consumir token
    const tokenValidation = await TokenService.validateAndConsumeToken(token, 'password_reset');
    
    if (!tokenValidation.valid) {
      if (tokenValidation.expired) {
        throw new Error('Token de reset expirado');
      }
      if (tokenValidation.used) {
        throw new Error('Token de reset já foi utilizado');
      }
      throw new Error('Token de reset inválido');
    }

    const userId = tokenValidation.userId!;

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Validar nova senha
    if (newPassword.length < 8) {
      throw new Error('Nova senha deve ter pelo menos 8 caracteres');
    }

    // Verificar se nova senha é diferente da atual
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new Error('Nova senha deve ser diferente da senha atual');
    }

    // Hash da nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

    // Atualizar senha no banco
    await prisma.user.update({
      where: { id: userId },
      data: { 
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      }
    });

    // Revogar todas as sessões ativas do usuário
    await this.logoutAll(userId, ipAddress);

    // Log de auditoria
    await AuditService.log({
      userId,
      action: 'user.password_reset_completed',
      resource: 'user',
      details: { email: user.email },
      ipAddress: ipAddress || '',
      severity: 'info'
    });

    // Publicar evento
    await EventService.publishPasswordResetCompleted({
      userId,
      email: user.email,
      name: user.name,
      timestamp: new Date()
    });
  }

  /**
   * Verifica email usando token de verificação
   */
  static async verifyEmail(token: string): Promise<void> {
    // Validar e consumir token
    const tokenValidation = await TokenService.validateAndConsumeToken(token, 'email_verification');
    
    if (!tokenValidation.valid) {
      if (tokenValidation.expired) {
        throw new Error('Token de verificação expirado');
      }
      if (tokenValidation.used) {
        throw new Error('Token de verificação já foi utilizado');
      }
      throw new Error('Token de verificação inválido');
    }

    const userId = tokenValidation.userId!;

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se email já foi verificado
    if (user.emailVerifiedAt) {
      throw new Error('Email já foi verificado anteriormente');
    }

    // Marcar email como verificado
    await prisma.user.update({
      where: { id: userId },
      data: { 
        emailVerifiedAt: new Date(),
        status: 'active', // Ativar usuário após verificação
        updatedAt: new Date()
      }
    });

    // Log de auditoria
    await AuditService.log({
      userId,
      action: 'user.email_verified',
      resource: 'user',
      details: { email: user.email },
      severity: 'info'
    });

    // Publicar evento
    await EventService.publishEmailVerified({
      userId,
      email: user.email,
      name: user.name,
      timestamp: new Date()
    });
  }

  /**
   * Converte string de tempo para milissegundos
   */
  private static parseTimeToMs(timeStr: string): number {
    const units: { [key: string]: number } = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Formato de tempo inválido: ${timeStr}`);
    }
    const [, value, unit] = match;
    if (!value || !unit) {
      throw new Error(`Formato de tempo inválido: ${timeStr}`);
    }
    return parseInt(value) * (units[unit] || 1000);
  }
}

