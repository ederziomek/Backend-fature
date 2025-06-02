import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtService } from '@/utils/jwt';
import { CacheService } from '@/config/redis';
import { prisma } from '@/config/database';

/**
 * Middleware de autenticação JWT
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extrair token do header
    const token = JwtService.extractTokenFromHeader(request.headers.authorization);
    
    if (!token) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        error: 'Unauthorized',
        message: 'Token de acesso é obrigatório',
        statusCode: 401,
      });
    }

    // Verificar se o token está na blacklist
    const isBlacklisted = await CacheService.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return reply.status(401).send({
        code: 'TOKEN_BLACKLISTED',
        error: 'Unauthorized',
        message: 'Token foi revogado',
        statusCode: 401,
      });
    }

    // Verificar e decodificar o token
    let payload;
    try {
      payload = JwtService.verifyAccessToken(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token inválido';
      return reply.status(401).send({
        code: 'INVALID_TOKEN',
        error: 'Unauthorized',
        message: errorMessage,
        statusCode: 401,
      });
    }

    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        deletedAt: true,
        affiliate: {
          select: {
            id: true,
            referralCode: true,
            category: true,
            level: true,
            status: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      return reply.status(401).send({
        code: 'USER_NOT_FOUND',
        error: 'Unauthorized',
        message: 'Usuário não encontrado',
        statusCode: 401,
      });
    }

    if (user.status !== 'active') {
      return reply.status(401).send({
        code: 'USER_INACTIVE',
        error: 'Unauthorized',
        message: 'Usuário inativo',
        statusCode: 401,
      });
    }

    // Adicionar informações do usuário à requisição
    request.currentUser = {
      id: user.id,
      email: user.email,
      role: 'affiliate', // Por enquanto todos são afiliados
      permissions: payload.permissions,
    };

    // Adicionar informações do afiliado se existir
    if (user.affiliate) {
      request.affiliate = {
        id: user.affiliate.id,
        userId: user.id,
        referralCode: user.affiliate.referralCode,
        category: user.affiliate.category,
        level: user.affiliate.level,
        status: user.affiliate.status,
      };
    }

  } catch (error) {
    request.log.error('Erro no middleware de autenticação:', error);
    return reply.status(500).send({
      code: 'INTERNAL_SERVER_ERROR',
      error: 'Internal Server Error',
      message: 'Erro interno do servidor',
      statusCode: 500,
    });
  }
}

/**
 * Middleware para verificar permissões específicas
 */
export function requirePermissions(permissions: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.currentUser) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        error: 'Unauthorized',
        message: 'Usuário não autenticado',
        statusCode: 401,
      });
    }

    const userPermissions = request.currentUser.permissions || [];
    const hasPermission = permissions.every(permission => 
      userPermissions.includes(permission) || userPermissions.includes('*')
    );

    if (!hasPermission) {
      return reply.status(403).send({
        code: 'FORBIDDEN',
        error: 'Forbidden',
        message: 'Permissões insuficientes',
        statusCode: 403,
      });
    }
  };
}

/**
 * Middleware para verificar se o usuário é um afiliado ativo
 */
export async function requireActiveAffiliate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.affiliate) {
    return reply.status(403).send({
      code: 'NOT_AFFILIATE',
      error: 'Forbidden',
      message: 'Usuário não é um afiliado',
      statusCode: 403,
    });
  }

  if (request.affiliate.status !== 'active') {
    return reply.status(403).send({
      code: 'AFFILIATE_INACTIVE',
      error: 'Forbidden',
      message: 'Afiliado não está ativo',
      statusCode: 403,
    });
  }
}

/**
 * Middleware para verificar categoria mínima do afiliado
 */
export function requireAffiliateCategory(minCategory: string) {
  const categoryLevels = {
    standard: 1,
    premium: 2,
    vip: 3,
    diamond: 4,
  };

  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.affiliate) {
      return reply.status(403).send({
        code: 'NOT_AFFILIATE',
        error: 'Forbidden',
        message: 'Usuário não é um afiliado',
        statusCode: 403,
      });
    }

    const userLevel = categoryLevels[request.affiliate.category as keyof typeof categoryLevels] || 0;
    const requiredLevel = categoryLevels[minCategory as keyof typeof categoryLevels] || 0;

    if (userLevel < requiredLevel) {
      return reply.status(403).send({
        code: 'INSUFFICIENT_CATEGORY',
        error: 'Forbidden',
        message: `Categoria ${minCategory} ou superior é necessária`,
        statusCode: 403,
      });
    }
  };
}

/**
 * Middleware opcional de autenticação (não falha se não houver token)
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = JwtService.extractTokenFromHeader(request.headers.authorization);
    
    if (!token) {
      return; // Continua sem autenticação
    }

    // Verificar se o token está na blacklist
    const isBlacklisted = await CacheService.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return; // Continua sem autenticação
    }

    // Verificar e decodificar o token
    let payload;
    try {
      payload = JwtService.verifyAccessToken(token);
    } catch {
      return; // Continua sem autenticação
    }

    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        deletedAt: true,
        affiliate: {
          select: {
            id: true,
            referralCode: true,
            category: true,
            level: true,
            status: true,
          },
        },
      },
    });

    if (user && !user.deletedAt && user.status === 'active') {
      // Adicionar informações do usuário à requisição
      request.currentUser = {
        id: user.id,
        email: user.email,
        role: 'affiliate',
        permissions: payload.permissions,
      };

      // Adicionar informações do afiliado se existir
      if (user.affiliate) {
        request.affiliate = {
          id: user.affiliate.id,
          userId: user.id,
          referralCode: user.affiliate.referralCode,
          category: user.affiliate.category,
          level: user.affiliate.level,
          status: user.affiliate.status,
        };
      }
    }

  } catch (error) {
    request.log.error('Erro no middleware de autenticação opcional:', error);
    // Continua sem autenticação em caso de erro
  }
}

