import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthController } from '@/controllers/auth';
import { authMiddleware } from '@/middleware/auth';

// Schemas de validação
const loginSchema = {
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
    rememberMe: z.boolean().optional(),
    mfaCode: z.string().optional(),
  }),
};

const registerSchema = {
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255, 'Nome muito longo'),
    phone: z.string().regex(/^\+55\d{2}9?\d{8}$/, 'Telefone inválido').optional(),
    document: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional(),
    referralCode: z.string().regex(/^[A-Z0-9]{6,20}$/, 'Código de indicação inválido').optional(),
  }),
};

const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
  }),
};

const logoutSchema = {
  body: z.object({
    refreshToken: z.string().optional(),
  }),
};

const verifyEmailSchema = {
  body: z.object({
    token: z.string().min(1, 'Token de verificação é obrigatório'),
  }),
};

const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email('Email inválido'),
  }),
};

const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'Token de redefinição é obrigatório'),
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  }),
};

const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
  }),
};

const mfaSchema = {
  body: z.object({
    code: z.string().regex(/^\d{6}$/, 'Código MFA deve ter 6 dígitos'),
  }),
};

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
        expiresAt: { type: 'string' },
      },
    },
  },
};

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
  },
};

const errorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number' },
  },
};

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /auth/login
  fastify.post('/login', {
    schema: {
      description: 'Autentica um usuário no sistema',
      tags: ['Autenticação'],
      body: loginSchema.body,
      response: {
        200: authResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
    },
    preValidation: async (request, reply) => {
      try {
        loginSchema.body.parse(request.body);
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          statusCode: 400,
        });
      }
    },
  }, AuthController.login);

  // POST /auth/register
  fastify.post('/register', {
    schema: {
      description: 'Registra um novo usuário no sistema',
      tags: ['Autenticação'],
      body: registerSchema.body,
      response: {
        201: authResponseSchema,
        400: errorResponseSchema,
      },
    },
    preValidation: async (request, reply) => {
      try {
        registerSchema.body.parse(request.body);
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          statusCode: 400,
        });
      }
    },
  }, AuthController.register);

  // POST /auth/refresh
  fastify.post('/refresh', {
    schema: {
      description: 'Renova o access token usando refresh token',
      tags: ['Autenticação'],
      body: refreshTokenSchema.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                expiresAt: { type: 'string' },
              },
            },
          },
        },
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
    },
    preValidation: async (request, reply) => {
      try {
        refreshTokenSchema.body.parse(request.body);
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          statusCode: 400,
        });
      }
    },
  }, AuthController.refreshToken);

  // POST /auth/logout
  fastify.post('/logout', {
    schema: {
      description: 'Faz logout do usuário',
      tags: ['Autenticação'],
      body: logoutSchema.body,
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: errorResponseSchema,
      },
    },
    preValidation: async (request, reply) => {
      try {
        logoutSchema.body.parse(request.body);
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          statusCode: 400,
        });
      }
    },
  }, AuthController.logout);

  // GET /auth/me
  fastify.get('/me', {
    schema: {
      description: 'Retorna informações do usuário autenticado',
      tags: ['Autenticação'],
      security: [{ Bearer: [] }],
      response: {
        200: userResponseSchema,
        401: errorResponseSchema,
      },
    },
    preHandler: authMiddleware,
  }, AuthController.me);

  // POST /auth/verify-email
  fastify.post('/verify-email', {
    schema: {
      description: 'Verifica email do usuário',
      tags: ['Autenticação'],
      body: verifyEmailSchema.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: errorResponseSchema,
        501: errorResponseSchema,
      },
    },
    preValidation: async (request, reply) => {
      try {
        verifyEmailSchema.body.parse(request.body);
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          statusCode: 400,
        });
      }
    },
  }, AuthController.verifyEmail);

  // POST /auth/forgot-password
  fastify.post('/forgot-password', {
    schema: {
      description: 'Solicita redefinição de senha',
      tags: ['Autenticação'],
      body: forgotPasswordSchema.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: errorResponseSchema,
        501: errorResponseSchema,
      },
    },
    preValidation: async (request, reply) => {
      try {
        forgotPasswordSchema.body.parse(request.body);
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          statusCode: 400,
        });
      }
    },
  }, AuthController.forgotPassword);

  // POST /auth/reset-password
  fastify.post('/reset-password', {
    schema: {
      description: 'Redefine senha do usuário',
      tags: ['Autenticação'],
      body: resetPasswordSchema.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: errorResponseSchema,
        501: errorResponseSchema,
      },
    },
    preValidation: async (request, reply) => {
      try {
        resetPasswordSchema.body.parse(request.body);
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          statusCode: 400,
        });
      }
    },
  }, AuthController.resetPassword);

  // POST /auth/change-password
  fastify.post('/change-password', {
    schema: {
      description: 'Altera senha do usuário autenticado',
      tags: ['Autenticação'],
      body: changePasswordSchema.body,
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: errorResponseSchema,
        401: errorResponseSchema,
        501: errorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    preValidation: async (request, reply) => {
      try {
        changePasswordSchema.body.parse(request.body);
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          statusCode: 400,
        });
      }
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
            message: { type: 'string' },
          },
        },
        401: errorResponseSchema,
        501: errorResponseSchema,
      },
    },
    preHandler: authMiddleware,
  }, AuthController.enableMfa);

  // POST /auth/disable-mfa
  fastify.post('/disable-mfa', {
    schema: {
      description: 'Desabilita autenticação de dois fatores',
      tags: ['Autenticação'],
      body: mfaSchema.body,
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: errorResponseSchema,
        401: errorResponseSchema,
        501: errorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    preValidation: async (request, reply) => {
      try {
        mfaSchema.body.parse(request.body);
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          statusCode: 400,
        });
      }
    },
  }, AuthController.disableMfa);
}

