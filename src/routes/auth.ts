import { FastifyInstance } from 'fastify';
import { AuthController } from '@/controllers/auth';
import { authMiddleware } from '@/middleware/auth';

// Schemas de resposta para documentação
const authResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresAt: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
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
    message: { type: 'string' },
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

const tokenResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  },
};

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /auth/login
  fastify.post('/login', {
    schema: {
      description: 'Autentica um usuário no sistema',
      tags: ['Autenticação'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: authResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
    },
  }, AuthController.login);

  // POST /auth/register
  fastify.post('/register', {
    schema: {
      description: 'Registra um novo usuário no sistema',
      tags: ['Autenticação'],
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
          phone: { type: 'string', pattern: '^\\+55\\d{2}9?\\d{8}$' },
          document: { type: 'string', pattern: '^\\d{11}$' },
          referralCode: { type: 'string', minLength: 6, maxLength: 10 },
        },
      },
      response: {
        201: authResponseSchema,
        400: errorResponseSchema,
      },
    },
  }, AuthController.register);

  // POST /auth/refresh
  fastify.post('/refresh', {
    schema: {
      description: 'Renova tokens de acesso',
      tags: ['Autenticação'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: tokenResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
    },
  }, AuthController.refreshToken);

  // POST /auth/logout
  fastify.post('/logout', {
    schema: {
      description: 'Encerra sessão do usuário',
      tags: ['Autenticação'],
      security: [{ Bearer: [] }],
      response: {
        200: successMessageSchema,
        401: errorResponseSchema,
      },
    },
  }, AuthController.logout);

  // GET /auth/me
  fastify.get('/me', {
    schema: {
      description: 'Retorna dados do usuário autenticado',
      tags: ['Autenticação'],
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: authResponseSchema.properties.data.properties.user,
                affiliate: authResponseSchema.properties.data.properties.affiliate,
              },
            },
          },
        },
        401: errorResponseSchema,
      },
    },
    preHandler: authMiddleware
  }, AuthController.me);

  // POST /auth/verify-email
  fastify.post('/verify-email', {
    schema: {
      description: 'Verifica email do usuário',
      tags: ['Autenticação'],
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: successMessageSchema,
        400: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
  }, AuthController.verifyEmail);

  // POST /auth/forgot-password
  fastify.post('/forgot-password', {
    schema: {
      description: 'Solicita recuperação de senha',
      tags: ['Autenticação'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
      response: {
        200: successMessageSchema,
        400: errorResponseSchema,
      },
    },
  }, AuthController.forgotPassword);

  // POST /auth/reset-password
  fastify.post('/reset-password', {
    schema: {
      description: 'Redefine senha do usuário',
      tags: ['Autenticação'],
      body: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 8 },
        },
      },
      response: {
        200: successMessageSchema,
        400: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
  }, AuthController.resetPassword);

  // POST /auth/change-password
  fastify.post('/change-password', {
    schema: {
      description: 'Altera senha do usuário autenticado',
      tags: ['Autenticação'],
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      response: {
        200: successMessageSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
    },
  }, AuthController.changePassword);

  // POST /auth/enable-mfa
  fastify.post('/enable-mfa', {
    schema: {
      description: 'Habilita autenticação de dois fatores',
      tags: ['Autenticação'],
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                qrCode: { type: 'string' },
                secret: { type: 'string' },
              },
            },
          },
        },
        401: errorResponseSchema,
      },
    },
  }, AuthController.enableMfa);

  // POST /auth/disable-mfa
  fastify.post('/disable-mfa', {
    schema: {
      description: 'Desabilita autenticação de dois fatores',
      tags: ['Autenticação'],
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', pattern: '^\\d{6}$' },
        },
      },
      response: {
        200: successMessageSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
    },
  }, AuthController.disableMfa);
}

