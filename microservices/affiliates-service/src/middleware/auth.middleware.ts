import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { redis } from '@/config/redis';
import { prisma } from '@/config/database';
import { AuditService } from '@/services/audit.service';
import { AffiliateData } from '@/types';

interface JWTPayload {
  userId: string;
  sessionId: string;
  email: string;
  iat: number;
  exp: number;
}

interface SessionData {
  userId: string;
  sessionId: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
}

// Extensão do FastifyRequest para incluir dados do usuário
declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: any;
    currentAffiliate?: AffiliateData;
    sessionData?: SessionData;
  }
}

/**
 * Middleware de autenticação para microsserviço de afiliados
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
      });
    }

    const token = authHeader.substring(7);

    // Verificar e decodificar JWT
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as JWTPayload;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        return reply.status(401).send({
          success: false,
          error: 'Token expirado',
          statusCode: 401
        });
      }
      
      return reply.status(401).send({
        success: false,
        error: 'Token inválido',
        statusCode: 401
      });
    }

    // Verificar sessão no Redis
    const sessionKey = `session:${payload.sessionId}`;
    const sessionDataStr = await redis.get(sessionKey);
    
    if (!sessionDataStr) {
      return reply.status(401).send({
        success: false,
        error: 'Sessão expirada ou inválida',
        statusCode: 401
      });
    }

    const sessionData: SessionData = JSON.parse(sessionDataStr);

    // Verificar se sessão não expirou
    if (new Date() > new Date(sessionData.expiresAt)) {
      await redis.del(sessionKey);
      return reply.status(401).send({
        success: false,
        error: 'Sessão expirada',
        statusCode: 401
      });
    }

    // Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        emailVerifiedAt: true,
        role: true
      }
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Usuário não encontrado',
        statusCode: 401
      });
    }

    // Verificar status do usuário
    if (user.status === 'suspended' || user.status === 'banned') {
      return reply.status(403).send({
        success: false,
        error: 'Conta suspensa ou banida',
        statusCode: 403
      });
    }

    // Buscar dados do afiliado se existir
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: user.id }
    });

    // Estender sessão se ativa
    const extendedExpiry = new Date(Date.now() + 15 * 60 * 1000); // +15 minutos
    const updatedSessionData = {
      ...sessionData,
      expiresAt: extendedExpiry
    };
    
    await redis.setex(sessionKey, 15 * 60, JSON.stringify(updatedSessionData));

    // Adicionar dados ao request
    request.currentUser = user;
    request.currentAffiliate = affiliate as AffiliateData;
    request.sessionData = updatedSessionData;

    // Log de auditoria para acesso
    await AuditService.log({
      userId: user.id,
      action: 'affiliate.api.access',
      resource: 'affiliate_api',
      details: {
        endpoint: request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        hasAffiliate: !!affiliate
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] as string,
      severity: 'debug'
    });

  } catch (error: any) {
    await AuditService.log({
      action: 'affiliate.auth.error',
      resource: 'auth',
      details: {
        error: error.message,
        endpoint: request.url,
        method: request.method
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] as string,
      severity: 'error'
    });

    return reply.status(500).send({
      success: false,
      error: 'Erro interno de autenticação',
      statusCode: 500
    });
  }
}

/**
 * Middleware para verificar se usuário é afiliado
 */
export async function requireAffiliate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.currentAffiliate) {
    return reply.status(403).send({
      success: false,
      error: 'Usuário não é afiliado',
      statusCode: 403
    });
  }

  if (request.currentAffiliate.status !== 'active') {
    return reply.status(403).send({
      success: false,
      error: 'Afiliado não está ativo',
      statusCode: 403
    });
  }
}

/**
 * Middleware para verificar permissões de categoria
 */
export function requireCategory(minCategory: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.currentAffiliate) {
      return reply.status(403).send({
        success: false,
        error: 'Usuário não é afiliado',
        statusCode: 403
      });
    }

    const categoryOrder = ['jogador', 'iniciante', 'afiliado', 'profissional', 'expert', 'mestre', 'lenda'];
    const userCategoryIndex = categoryOrder.indexOf(request.currentAffiliate.category);
    const minCategoryIndex = categoryOrder.indexOf(minCategory);

    if (userCategoryIndex < minCategoryIndex) {
      await AuditService.log({
        userId: request.currentUser?.id,
        action: 'affiliate.access.denied',
        resource: 'affiliate_api',
        details: {
          requiredCategory: minCategory,
          userCategory: request.currentAffiliate.category,
          endpoint: request.url
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] as string,
        severity: 'warning'
      });

      return reply.status(403).send({
        success: false,
        error: `Categoria mínima requerida: ${minCategory}`,
        statusCode: 403
      });
    }
  };
}

/**
 * Middleware para verificar se afiliado pode acessar dados de outro afiliado
 */
export async function requireAffiliateAccess(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const targetAffiliateId = (request.params as any).id;
  const currentAffiliate = request.currentAffiliate;

  if (!currentAffiliate) {
    return reply.status(403).send({
      success: false,
      error: 'Usuário não é afiliado',
      statusCode: 403
    });
  }

  // Admin pode acessar qualquer afiliado
  if (request.currentUser?.role === 'admin') {
    return;
  }

  // Afiliado pode acessar seus próprios dados
  if (currentAffiliate.id === targetAffiliateId) {
    return;
  }

  // Verificar se é sponsor do afiliado alvo
  const targetAffiliate = await prisma.affiliate.findUnique({
    where: { id: targetAffiliateId }
  });

  if (targetAffiliate?.sponsorId === currentAffiliate.id) {
    return;
  }

  // Verificar se está na hierarquia (até 5 níveis)
  let currentSponsorId = targetAffiliate?.sponsorId;
  let level = 1;
  
  while (currentSponsorId && level <= 5) {
    if (currentSponsorId === currentAffiliate.id) {
      return; // Encontrou na hierarquia
    }
    
    const sponsor = await prisma.affiliate.findUnique({
      where: { id: currentSponsorId },
      select: { sponsorId: true }
    });
    
    currentSponsorId = sponsor?.sponsorId;
    level++;
  }

  // Log de tentativa de acesso negado
  await AuditService.log({
    userId: request.currentUser?.id,
    action: 'affiliate.unauthorized.access',
    resource: 'affiliate',
    resourceId: targetAffiliateId,
    details: {
      currentAffiliateId: currentAffiliate.id,
      targetAffiliateId,
      endpoint: request.url
    },
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] as string,
    severity: 'warning'
  });

  return reply.status(403).send({
    success: false,
    error: 'Acesso negado a este afiliado',
    statusCode: 403
  });
}

/**
 * Middleware de rate limiting específico para afiliados
 */
export async function affiliateRateLimit(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.currentUser?.id;
  if (!userId) return;

  const key = `rate_limit:affiliate:${userId}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, 60); // 1 minuto
  }
  
  const limit = 100; // 100 requests por minuto
  
  if (current > limit) {
    await AuditService.log({
      userId,
      action: 'affiliate.rate.limit.exceeded',
      resource: 'rate_limit',
      details: {
        current,
        limit,
        endpoint: request.url
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] as string,
      severity: 'warning'
    });

    return reply.status(429).send({
      success: false,
      error: 'Muitas requisições. Tente novamente em 1 minuto.',
      statusCode: 429
    });
  }
}

