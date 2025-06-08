import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { config } from '@/config';
import { JwtPayload, UserData, SessionData, ApiResponse } from '@/types';
import { AuditService } from '@/services/audit.service';

/**
 * Middleware de autenticação JWT
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extrair token do header Authorization
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'Token de acesso não fornecido',
        statusCode: 401
      } as ApiResponse);
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verificar e decodificar JWT
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        return reply.status(401).send({
          success: false,
          error: 'Token expirado',
          statusCode: 401
        } as ApiResponse);
      }
      
      return reply.status(401).send({
        success: false,
        error: 'Token inválido',
        statusCode: 401
      } as ApiResponse);
    }

    // Verificar se sessão ainda está ativa no Redis
    const sessionKey = `session:${payload.sessionId}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      return reply.status(401).send({
        success: false,
        error: 'Sessão expirada ou inválida',
        statusCode: 401
      } as ApiResponse);
    }

    const session: SessionData = JSON.parse(sessionData);

    // Verificar se sessão não expirou
    if (new Date() > new Date(session.expiresAt)) {
      await redis.del(sessionKey);
      return reply.status(401).send({
        success: false,
        error: 'Sessão expirada',
        statusCode: 401
      } as ApiResponse);
    }

    // Buscar dados atualizados do usuário
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        document: true,
        status: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        lastLoginAt: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Usuário não encontrado',
        statusCode: 401
      } as ApiResponse);
    }

    // Verificar status do usuário
    if (user.status === 'suspended' || user.status === 'banned') {
      return reply.status(403).send({
        success: false,
        error: 'Conta suspensa ou banida',
        statusCode: 403
      } as ApiResponse);
    }

    if (user.status === 'inactive') {
      return reply.status(403).send({
        success: false,
        error: 'Conta inativa',
        statusCode: 403
      } as ApiResponse);
    }

    // Atualizar última atividade da sessão no Redis
    session.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Estender por 15 minutos
    await redis.setex(sessionKey, 15 * 60, JSON.stringify(session));

    // Adicionar dados do usuário e sessão ao request
    request.currentUser = user as UserData;
    request.sessionData = session;

  } catch (error: any) {
    // Log de erro de autenticação
    await AuditService.log({
      action: 'auth.middleware.error',
      resource: 'authentication',
      details: { error: error.message },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
      severity: 'error'
    });

    return reply.status(500).send({
      success: false,
      error: 'Erro interno de autenticação',
      statusCode: 500
    } as ApiResponse);
  }
}

/**
 * Middleware opcional de autenticação (não falha se não autenticado)
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return; // Continua sem autenticação
    }

    // Tenta autenticar, mas não falha se não conseguir
    await authMiddleware(request, reply);
  } catch (error) {
    // Ignora erros de autenticação no modo opcional
    return;
  }
}

/**
 * Middleware para verificar permissões específicas
 */
export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const currentUser = request.currentUser;

    if (!currentUser) {
      return reply.status(401).send({
        success: false,
        error: 'Usuário não autenticado',
        statusCode: 401
      } as ApiResponse);
    }

    // Verificar se usuário tem a permissão necessária
    const hasPermission = await checkUserPermission(currentUser.id, permission);

    if (!hasPermission) {
      await AuditService.log({
        userId: currentUser.id,
        action: 'auth.permission.denied',
        resource: 'permission',
        resourceId: permission,
        details: { requiredPermission: permission },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        severity: 'warning'
      });

      return reply.status(403).send({
        success: false,
        error: 'Permissão insuficiente',
        statusCode: 403
      } as ApiResponse);
    }
  };
}

/**
 * Middleware para verificar roles específicos
 */
export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const currentUser = request.currentUser;

    if (!currentUser) {
      return reply.status(401).send({
        success: false,
        error: 'Usuário não autenticado',
        statusCode: 401
      } as ApiResponse);
    }

    // TODO: Implementar sistema de roles quando tabela for criada
    // Buscar role do usuário
    /*
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { role: true }
    });

    if (!user || user.role !== role) {
      await AuditService.log({
        userId: currentUser.id,
        action: 'auth.role.denied',
        resource: 'role',
        resourceId: role,
        details: { 
          requiredRole: role,
          userRole: user?.role || 'unknown'
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        severity: 'warning'
      });

      return reply.status(403).send({
        success: false,
        error: 'Acesso negado: role insuficiente',
        statusCode: 403
      });
    }
    */
    
    // Por enquanto, permitir acesso (implementar roles futuramente)
    console.log(`Role check bypassed for user ${currentUser.id}, required role: ${role}`);
  };
}

/**
 * Middleware para verificar se email foi verificado
 */
export async function requireEmailVerified(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const currentUser = request.currentUser;

  if (!currentUser) {
    return reply.status(401).send({
      success: false,
      error: 'Usuário não autenticado',
      statusCode: 401
    } as ApiResponse);
  }

  if (!currentUser.emailVerifiedAt) {
    return reply.status(403).send({
      success: false,
      error: 'Email não verificado',
      statusCode: 403
    } as ApiResponse);
  }
}

/**
 * Middleware para rate limiting por usuário
 */
export function userRateLimit(maxRequests: number, windowMs: number) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const currentUser = request.currentUser;

    if (!currentUser) {
      return; // Não aplica rate limit se não autenticado
    }

    const key = `rate_limit:user:${currentUser.id}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }

    if (current > maxRequests) {
      await AuditService.log({
        userId: currentUser.id,
        action: 'auth.rate_limit.exceeded',
        resource: 'rate_limit',
        details: { 
          maxRequests,
          windowMs,
          currentRequests: current
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        severity: 'warning'
      });

      return reply.status(429).send({
        success: false,
        error: 'Muitas requisições. Tente novamente mais tarde.',
        statusCode: 429
      } as ApiResponse);
    }
  };
}

/**
 * Função auxiliar para verificar permissões do usuário
 * TODO: Implementar quando tabela userPermission for criada
 */
async function checkUserPermission(userId: string, permission: string): Promise<boolean> {
  // Implementação temporária - sempre retorna true
  console.log(`Permission check bypassed for user ${userId}, permission: ${permission}`);
  return true;
  
  /*
  // Implementação futura quando tabela userPermission existir
  const userPermissions = await prisma.userPermission.findMany({
    where: { userId },
    select: { permission: true }
  });

  return userPermissions.some((p: any) => p.permission === permission);
  */
}

