import { FastifyInstance } from 'fastify';
import { UsersController } from '@/controllers/users';
import { authMiddleware } from '@/middleware/auth';

// Schemas de resposta para documentação
const userResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            status: { type: 'string' },
            phone: { type: 'string' },
            document: { type: 'string' },
            emailVerified: { type: 'boolean' },
            mfaEnabled: { type: 'boolean' },
            lastLoginAt: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            affiliate: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                referralCode: { type: 'string' },
                category: { type: 'string' },
                level: { type: 'number' },
                status: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

const usersListResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              status: { type: 'string' },
              phone: { type: 'string' },
              document: { type: 'string' },
              emailVerified: { type: 'boolean' },
              mfaEnabled: { type: 'boolean' },
              lastLoginAt: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              affiliate: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  referralCode: { type: 'string' },
                  category: { type: 'string' },
                  level: { type: 'number' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            currentPage: { type: 'number' },
            totalPages: { type: 'number' },
            totalCount: { type: 'number' },
            limit: { type: 'number' },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' },
          },
        },
      },
    },
  },
};

const errorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number' },
    details: { type: 'array' },
  },
};

const successMessageSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

export async function usersRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /users - Listar usuários
  fastify.get('/', {
    schema: {
      description: 'Lista usuários com paginação e filtros',
      tags: ['Usuários'],
      security: [{ Bearer: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', description: 'Número da página (padrão: 1)' },
          limit: { type: 'string', description: 'Itens por página (padrão: 10)' },
          search: { type: 'string', description: 'Buscar por nome ou email' },
          role: { type: 'string', enum: ['admin', 'affiliate'], description: 'Filtrar por role' },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'], description: 'Filtrar por status' },
          sortBy: { type: 'string', enum: ['name', 'email', 'createdAt', 'lastLoginAt'], description: 'Campo para ordenação' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Ordem da classificação' },
        },
      },
      response: {
        200: usersListResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
      },
    },
    preHandler: authMiddleware,
  }, UsersController.getUsers);

  // GET /users/:id - Buscar usuário por ID
  fastify.get('/:id', {
    schema: {
      description: 'Busca usuário por ID',
      tags: ['Usuários'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'ID do usuário' },
        },
      },
      response: {
        200: userResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    preHandler: authMiddleware,
  }, UsersController.getUserById);

  // PUT /users/:id - Atualizar usuário
  fastify.put('/:id', {
    schema: {
      description: 'Atualiza dados do usuário',
      tags: ['Usuários'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'ID do usuário' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 255, description: 'Nome do usuário' },
          email: { type: 'string', format: 'email', description: 'Email do usuário' },
          phone: { type: 'string', pattern: '^\\+55\\d{2}9?\\d{8}$', description: 'Telefone brasileiro' },
          document: { type: 'string', pattern: '^\\d{11}$', description: 'CPF (11 dígitos)' },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'], description: 'Status do usuário' },
          role: { type: 'string', enum: ['admin', 'affiliate'], description: 'Role do usuário' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: userResponseSchema.properties.data.properties.user,
              },
            },
            message: { type: 'string' },
          },
        },
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        409: errorResponseSchema,
      },
    },
    preHandler: authMiddleware,
  }, UsersController.updateUser);

  // DELETE /users/:id - Desativar usuário
  fastify.delete('/:id', {
    schema: {
      description: 'Desativa usuário (soft delete)',
      tags: ['Usuários'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'ID do usuário' },
        },
      },
      response: {
        200: successMessageSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    preHandler: authMiddleware,
  }, UsersController.deactivateUser);

  // POST /users/:id/reactivate - Reativar usuário
  fastify.post('/:id/reactivate', {
    schema: {
      description: 'Reativa usuário desativado',
      tags: ['Usuários'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'ID do usuário' },
        },
      },
      response: {
        200: successMessageSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    preHandler: authMiddleware,
  }, UsersController.reactivateUser);
}

