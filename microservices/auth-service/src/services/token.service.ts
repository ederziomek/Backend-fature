import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { prisma } from '@/config/database';

export type TokenType = 'email_verification' | 'password_reset' | 'phone_verification';

export interface TokenData {
  id: string;
  userId: string;
  token: string;
  type: TokenType;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export class TokenService {
  /**
   * Gera um token seguro
   */
  private static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Cria um novo token de verificação
   */
  static async createToken(
    userId: string, 
    type: TokenType, 
    expiresInMinutes: number = 1440 // 24 horas por padrão
  ): Promise<string> {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // Invalidar tokens anteriores do mesmo tipo para o usuário
    await prisma.verificationToken.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      data: {
        usedAt: new Date()
      }
    });

    // Criar novo token
    await prisma.verificationToken.create({
      data: {
        userId,
        token,
        type,
        expiresAt
      }
    });

    return token;
  }

  /**
   * Valida e consome um token
   */
  static async validateAndConsumeToken(
    token: string, 
    type: TokenType
  ): Promise<{ valid: boolean; userId?: string; expired?: boolean; used?: boolean }> {
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        token,
        type
      }
    });

    if (!tokenRecord) {
      return { valid: false };
    }

    // Verificar se já foi usado
    if (tokenRecord.usedAt) {
      return { valid: false, used: true };
    }

    // Verificar se expirou
    if (tokenRecord.expiresAt < new Date()) {
      return { valid: false, expired: true };
    }

    // Marcar como usado
    await prisma.verificationToken.update({
      where: {
        id: tokenRecord.id
      },
      data: {
        usedAt: new Date()
      }
    });

    return { valid: true, userId: tokenRecord.userId };
  }

  /**
   * Verifica se um token é válido sem consumi-lo
   */
  static async isTokenValid(token: string, type: TokenType): Promise<boolean> {
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        token,
        type,
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    return !!tokenRecord;
  }

  /**
   * Remove tokens expirados (limpeza)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.verificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return result.count;
  }

  /**
   * Obtém informações de um token sem consumi-lo
   */
  static async getTokenInfo(token: string): Promise<TokenData | null> {
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        token
      }
    });

    if (!tokenRecord) {
      return null;
    }

    return {
      id: tokenRecord.id,
      userId: tokenRecord.userId,
      token: tokenRecord.token,
      type: tokenRecord.type as TokenType,
      expiresAt: tokenRecord.expiresAt,
      usedAt: tokenRecord.usedAt || undefined,
      createdAt: tokenRecord.createdAt
    };
  }

  /**
   * Revoga todos os tokens de um usuário de um tipo específico
   */
  static async revokeUserTokens(userId: string, type?: TokenType): Promise<number> {
    const whereClause: any = {
      userId,
      usedAt: null,
      expiresAt: {
        gt: new Date()
      }
    };

    if (type) {
      whereClause.type = type;
    }

    const result = await prisma.verificationToken.updateMany({
      where: whereClause,
      data: {
        usedAt: new Date()
      }
    });

    return result.count;
  }

  /**
   * Conta tokens ativos de um usuário
   */
  static async countActiveTokens(userId: string, type?: TokenType): Promise<number> {
    const whereClause: any = {
      userId,
      usedAt: null,
      expiresAt: {
        gt: new Date()
      }
    };

    if (type) {
      whereClause.type = type;
    }

    return await prisma.verificationToken.count({
      where: whereClause
    });
  }
}

