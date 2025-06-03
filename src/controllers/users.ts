import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/config/database';
import { cache } from '@/config/redis';
import { 
  calculateAffiliateCategory, 
  getAffiliateCategory, 
  enrichAffiliateWithCategory,
  AffiliateWithCategory 
} from '@/utils/affiliate-category-utils';

// Schemas de validação
const getUsersQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  role: z.enum(['admin', 'affiliate']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLoginAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255, 'Nome muito longo').optional(),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().regex(/^\+55\d{2}9?\d{8}$/, 'Telefone inválido').optional(),
  document: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

const userParamsSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
});

export class UsersController {
  /**
   * Lista usuários com paginação e filtros
   */
  static async getUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = getUsersQuerySchema.parse(request.query);
      const { page, limit, search, role, status, sortBy, sortOrder } = query;

      // Calcular offset para paginação
      const offset = (page - 1) * limit;

      // Construir filtros
      const where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role) {
        where.role = role;
      }

      if (status) {
        where.status = status;
      }

      // Buscar usuários com paginação
      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            phone: true,
            document: true,
            emailVerifiedAt: true,
            mfaEnabled: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            affiliate: {
              select: {
                id: true,
                referralCode: true,
                validatedReferrals: true,
                level: true,
                status: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      // Calcular metadados de paginação
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return reply.status(200).send({
        success: true,
        data: {
          users,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasNextPage,
            hasPrevPage,
          },
        },
      });
    } catch (error) {
      request.log.error('Erro ao listar usuários:', error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Parâmetros de consulta inválidos',
          details: error.errors,
          statusCode: 400,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno do servidor',
        statusCode: 500,
      });
    }
  }

  /**
   * Busca usuário por ID
   */
  static async getUserById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = userParamsSchema.parse(request.params);

      // Verificar cache primeiro
      const cacheKey = `user:${id}`;
      const cachedUser = await cache.get(cacheKey);
      
      if (cachedUser) {
        return reply.status(200).send({
          success: true,
          data: { user: cachedUser },
        });
      }

      // Buscar usuário no banco
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          phone: true,
          document: true,
          emailVerifiedAt: true,
          mfaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          affiliate: {
            select: {
              id: true,
              referralCode: true,
              validatedReferrals: true,
              level: true,
              status: true,
              parentId: true,
              lifetimeCommissions: true,
              lifetimeVolume: true,
              createdAt: true,
              parent: {
                select: {
                  id: true,
                  referralCode: true,
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'Usuário não encontrado',
          statusCode: 404,
        });
      }

      // Cachear resultado por 5 minutos
      await cache.set(cacheKey, user, 300);

      return reply.status(200).send({
        success: true,
        data: { user },
      });
    } catch (error) {
      request.log.error('Erro ao buscar usuário:', error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'ID de usuário inválido',
          details: error.errors,
          statusCode: 400,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno do servidor',
        statusCode: 500,
      });
    }
  }

  /**
   * Atualiza usuário
   */
  static async updateUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = userParamsSchema.parse(request.params);
      const updateData = updateUserSchema.parse(request.body);

      // Verificar se usuário existe
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true },
      });

      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'Usuário não encontrado',
          statusCode: 404,
        });
      }

      // Verificar se email já está em uso (se estiver sendo alterado)
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updateData.email },
          select: { id: true },
        });

        if (emailExists) {
          return reply.status(409).send({
            success: false,
            error: 'EMAIL_ALREADY_EXISTS',
            message: 'Este email já está sendo usado por outro usuário',
            statusCode: 409,
          });
        }
      }

      // Filtrar apenas campos definidos para o update
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      // Atualizar usuário
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...filteredUpdateData,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          phone: true,
          document: true,
          emailVerifiedAt: true,
          mfaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          affiliate: {
            select: {
              id: true,
              referralCode: true,
              validatedReferrals: true,
              level: true,
              status: true,
            },
          },
        },
      });

      // Invalidar cache
      await cache.del(`user:${id}`);

      return reply.status(200).send({
        success: true,
        data: { user: updatedUser },
        message: 'Usuário atualizado com sucesso',
      });
    } catch (error) {
      request.log.error('Erro ao atualizar usuário:', error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          details: error.errors,
          statusCode: 400,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno do servidor',
        statusCode: 500,
      });
    }
  }

  /**
   * Desativa usuário (soft delete)
   */
  static async deactivateUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = userParamsSchema.parse(request.params);

      // Verificar se usuário existe
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'Usuário não encontrado',
          statusCode: 404,
        });
      }

      if (existingUser.status === 'inactive') {
        return reply.status(400).send({
          success: false,
          error: 'USER_ALREADY_INACTIVE',
          message: 'Usuário já está inativo',
          statusCode: 400,
        });
      }

      // Desativar usuário e afiliado relacionado
      await prisma.$transaction(async (tx) => {
        // Desativar usuário
        await tx.user.update({
          where: { id },
          data: {
            status: 'inactive',
            updatedAt: new Date(),
          },
        });

        // Desativar afiliado relacionado
        await tx.affiliate.updateMany({
          where: { userId: id },
          data: {
            status: 'inactive',
            updatedAt: new Date(),
          },
        });

        // Registrar log de auditoria
        await tx.auditLog.create({
          data: {
            userId: id,
            action: 'USER_DEACTIVATED',
            resource: 'users',
            resourceId: id,
            details: { reason: 'Manual deactivation' },
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] || '',
          },
        });
      });

      // Invalidar cache
      await cache.del(`user:${id}`);

      return reply.status(200).send({
        success: true,
        message: 'Usuário desativado com sucesso',
      });
    } catch (error) {
      request.log.error('Erro ao desativar usuário:', error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'ID de usuário inválido',
          details: error.errors,
          statusCode: 400,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno do servidor',
        statusCode: 500,
      });
    }
  }

  /**
   * Reativa usuário
   */
  static async reactivateUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = userParamsSchema.parse(request.params);

      // Verificar se usuário existe
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'Usuário não encontrado',
          statusCode: 404,
        });
      }

      if (existingUser.status === 'active') {
        return reply.status(400).send({
          success: false,
          error: 'USER_ALREADY_ACTIVE',
          message: 'Usuário já está ativo',
          statusCode: 400,
        });
      }

      // Reativar usuário e afiliado relacionado
      await prisma.$transaction(async (tx) => {
        // Reativar usuário
        await tx.user.update({
          where: { id },
          data: {
            status: 'active',
            updatedAt: new Date(),
          },
        });

        // Reativar afiliado relacionado
        await tx.affiliate.updateMany({
          where: { userId: id },
          data: {
            status: 'active',
            updatedAt: new Date(),
          },
        });

        // Registrar log de auditoria
        await tx.auditLog.create({
          data: {
            userId: id,
            action: 'USER_REACTIVATED',
            resource: 'users',
            resourceId: id,
            details: { reason: 'Manual reactivation' },
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] || '',
          },
        });
      });

      // Invalidar cache
      await cache.del(`user:${id}`);

      return reply.status(200).send({
        success: true,
        message: 'Usuário reativado com sucesso',
      });
    } catch (error) {
      request.log.error('Erro ao reativar usuário:', error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'ID de usuário inválido',
          details: error.errors,
          statusCode: 400,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno do servidor',
        statusCode: 500,
      });
    }
  }
}

