import { prisma } from '@/config/database';
import { CacheService } from '@/config/redis';
import { JwtService } from '@/utils/jwt';
import { PasswordService, CryptoService, ValidationService } from '@/utils/security';
import { JwtPayload } from '@/types/fastify';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  document?: string;
  referralCode?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
  };
  affiliate?: {
    id: string;
    referralCode: string;
    category: string;
    level: number;
    status: string;
  };
  expiresAt: string;
}

export class AuthService {
  /**
   * Autentica um usuário
   */
  static async login(data: LoginRequest): Promise<AuthResponse> {
    // Validar dados de entrada
    if (!ValidationService.isValidEmail(data.email)) {
      throw new Error('Email inválido');
    }

    if (!data.password) {
      throw new Error('Senha é obrigatória');
    }

    // Buscar usuário no banco
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        affiliate: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new Error('Credenciais inválidas');
    }

    // Verificar status do usuário
    if (user.status === 'banned') {
      throw new Error('Usuário banido');
    }

    if (user.status === 'suspended') {
      throw new Error('Usuário suspenso');
    }

    // Verificar senha
    const isPasswordValid = await PasswordService.verifyPassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas');
    }

    // Verificar MFA se habilitado
    if (user.mfaEnabled) {
      if (!data.mfaCode) {
        throw new Error('Código MFA é obrigatório');
      }

      const isValidMfaCode = await AuthService.verifyMfaCode(user.id, data.mfaCode);
      if (!isValidMfaCode) {
        throw new Error('Código MFA inválido');
      }
    }

    // Gerar tokens
    const permissions = AuthService.getUserPermissions(user.affiliate?.category || 'standard');
    const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: 'affiliate',
      permissions,
    };

    const accessToken = JwtService.generateAccessToken(tokenPayload);
    const refreshTokenId = CryptoService.generateSecureToken();
    const refreshToken = JwtService.generateRefreshToken({
      sub: user.id,
      tokenId: refreshTokenId,
    });

    // Salvar refresh token no cache
    const refreshTokenTtl = data.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30 dias ou 7 dias
    await CacheService.set(`refresh_token:${refreshTokenId}`, {
      userId: user.id,
      createdAt: new Date().toISOString(),
    }, refreshTokenTtl);

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Preparar resposta
    const response: AuthResponse = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'affiliate',
        permissions,
      },
      expiresAt: JwtService.getTokenExpiration(accessToken)?.toISOString() || '',
    };

    if (user.affiliate) {
      response.affiliate = {
        id: user.affiliate.id,
        referralCode: user.affiliate.referralCode,
        category: user.affiliate.category,
        level: user.affiliate.level,
        status: user.affiliate.status,
      };
    }

    return response;
  }

  /**
   * Registra um novo usuário
   */
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    // Validar dados de entrada
    if (!ValidationService.isValidEmail(data.email)) {
      throw new Error('Email inválido');
    }

    const passwordValidation = PasswordService.validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Senha inválida: ${passwordValidation.errors.join(', ')}`);
    }

    if (data.phone && !ValidationService.isValidBrazilianPhone(data.phone)) {
      throw new Error('Telefone inválido');
    }

    if (data.document && !ValidationService.isValidCPF(data.document)) {
      throw new Error('CPF inválido');
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('Email já está em uso');
    }

    // Verificar se documento já existe
    if (data.document) {
      const existingDocument = await prisma.user.findUnique({
        where: { document: data.document },
      });

      if (existingDocument) {
        throw new Error('CPF já está em uso');
      }
    }

    // Verificar código de indicação se fornecido
    let parentAffiliate = null;
    if (data.referralCode) {
      parentAffiliate = await prisma.affiliate.findUnique({
        where: { referralCode: data.referralCode.toUpperCase() },
      });

      if (!parentAffiliate) {
        throw new Error('Código de indicação inválido');
      }

      if (parentAffiliate.status !== 'active') {
        throw new Error('Afiliado indicador não está ativo');
      }
    }

    // Hash da senha
    const passwordHash = await PasswordService.hashPassword(data.password);

    // Criar usuário e afiliado em transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar usuário
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          name: ValidationService.sanitizeString(data.name),
          phone: data.phone,
          document: data.document,
          status: 'pending', // Requer verificação de email
        },
      });

      // Gerar código de indicação único
      let referralCode: string;
      let isUnique = false;
      let attempts = 0;
      
      do {
        referralCode = AuthService.generateReferralCode();
        const existing = await tx.affiliate.findUnique({
          where: { referralCode },
        });
        isUnique = !existing;
        attempts++;
      } while (!isUnique && attempts < 10);

      if (!isUnique) {
        throw new Error('Erro ao gerar código de indicação');
      }

      // Criar afiliado
      const affiliate = await tx.affiliate.create({
        data: {
          userId: user.id,
          parentId: parentAffiliate?.id,
          referralCode,
          category: 'standard',
          level: parentAffiliate ? parentAffiliate.level + 1 : 0,
          status: 'active',
        },
      });

      // Atualizar contador de indicações do pai
      if (parentAffiliate) {
        await tx.affiliate.update({
          where: { id: parentAffiliate.id },
          data: {
            totalReferrals: { increment: 1 },
            activeReferrals: { increment: 1 },
          },
        });
      }

      return { user, affiliate };
    });

    // Gerar tokens
    const permissions = AuthService.getUserPermissions('standard');
    const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: result.user.id,
      email: result.user.email,
      role: 'affiliate',
      permissions,
    };

    const accessToken = JwtService.generateAccessToken(tokenPayload);
    const refreshTokenId = CryptoService.generateSecureToken();
    const refreshToken = JwtService.generateRefreshToken({
      sub: result.user.id,
      tokenId: refreshTokenId,
    });

    // Salvar refresh token no cache
    await CacheService.set(`refresh_token:${refreshTokenId}`, {
      userId: result.user.id,
      createdAt: new Date().toISOString(),
    }, 7 * 24 * 60 * 60); // 7 dias

    return {
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: 'affiliate',
        permissions,
      },
      affiliate: {
        id: result.affiliate.id,
        referralCode: result.affiliate.referralCode,
        category: result.affiliate.category,
        level: result.affiliate.level,
        status: result.affiliate.status,
      },
      expiresAt: JwtService.getTokenExpiration(accessToken)?.toISOString() || '',
    };
  }

  /**
   * Renova o access token usando refresh token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
    try {
      // Verificar refresh token
      const payload = JwtService.verifyRefreshToken(refreshToken);

      // Verificar se o refresh token existe no cache
      const tokenData = await CacheService.get(`refresh_token:${payload.tokenId}`);
      if (!tokenData) {
        throw new Error('Refresh token inválido ou expirado');
      }

      // Buscar usuário
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: { affiliate: true },
      });

      if (!user || user.deletedAt || user.status !== 'active') {
        throw new Error('Usuário inválido');
      }

      // Gerar novo access token
      const permissions = AuthService.getUserPermissions(user.affiliate?.category || 'standard');
      const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
        sub: user.id,
        email: user.email,
        role: 'affiliate',
        permissions,
      };

      const accessToken = JwtService.generateAccessToken(tokenPayload);

      return {
        accessToken,
        expiresAt: JwtService.getTokenExpiration(accessToken)?.toISOString() || '',
      };

    } catch (error) {
      throw new Error('Refresh token inválido');
    }
  }

  /**
   * Faz logout do usuário
   */
  static async logout(accessToken: string, refreshToken?: string): Promise<void> {
    // Adicionar access token à blacklist
    const tokenExpiration = JwtService.getTokenExpiration(accessToken);
    if (tokenExpiration) {
      const ttl = Math.floor((tokenExpiration.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        await CacheService.set(`blacklist:${accessToken}`, true, ttl);
      }
    }

    // Remover refresh token se fornecido
    if (refreshToken) {
      try {
        const payload = JwtService.verifyRefreshToken(refreshToken);
        await CacheService.del(`refresh_token:${payload.tokenId}`);
      } catch {
        // Ignorar erro se refresh token for inválido
      }
    }
  }

  /**
   * Verifica código MFA
   */
  static async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    // Por enquanto, implementação simples
    // Em produção, usar TOTP (Time-based One-Time Password)
    const storedCode = await CacheService.get(`mfa_code:${userId}`);
    return storedCode === code;
  }

  /**
   * Gera código de indicação único
   */
  private static generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Obtém permissões baseadas na categoria do afiliado
   */
  private static getUserPermissions(category: string): string[] {
    const basePermissions = [
      'read:profile',
      'write:profile',
      'read:affiliate',
      'read:transactions',
      'read:commissions',
      'read:gamification',
    ];

    switch (category) {
      case 'premium':
        return [...basePermissions, 'read:reports:basic'];
      case 'vip':
        return [...basePermissions, 'read:reports:basic', 'read:reports:advanced'];
      case 'diamond':
        return [...basePermissions, 'read:reports:basic', 'read:reports:advanced', 'read:network'];
      default:
        return basePermissions;
    }
  }
}

