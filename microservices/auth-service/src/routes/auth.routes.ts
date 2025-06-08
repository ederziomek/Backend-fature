import { FastifyInstance } from 'fastify';
import { AuthController } from '@/controllers/auth.controller';
import { authMiddleware, requireEmailVerified, userRateLimit } from '@/middleware/auth.middleware';
import { ChangePasswordRequest } from '@/types';

/**
 * Rotas de autenticação
 */
export async function authRoutes(fastify: FastifyInstance) {
  // Configurar prefixo das rotas
  await fastify.register(async function (fastify) {
    // Rotas públicas (sem autenticação)
    
    // POST /auth/register - Registrar novo usuário
    fastify.post('/register', {
      schema: {
        description: 'Registrar novo usuário',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { 
              type: 'string', 
              format: 'email',
              description: 'Email do usuário'
            },
            password: { 
              type: 'string', 
              minLength: 8,
              description: 'Senha do usuário (mínimo 8 caracteres)'
            },
            name: { 
              type: 'string', 
              minLength: 2,
              description: 'Nome completo do usuário'
            },
            phone: { 
              type: 'string',
              description: 'Telefone do usuário (opcional)'
            },
            document: { 
              type: 'string',
              description: 'Documento do usuário (opcional)'
            }
          }
        },
        response: {
          201: {
            description: 'Usuário registrado com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresAt: { type: 'string', format: 'date-time' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: 'string' },
                      status: { type: 'string' }
                    }
                  }
                }
              },
              message: { type: 'string' }
            }
          },
          400: {
            description: 'Erro de validação',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    }, AuthController.register);

    // POST /auth/login - Fazer login
    fastify.post('/login', {
      schema: {
        description: 'Autenticar usuário',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { 
              type: 'string', 
              format: 'email',
              description: 'Email do usuário'
            },
            password: { 
              type: 'string',
              description: 'Senha do usuário'
            },
            deviceFingerprint: { 
              type: 'string',
              description: 'Fingerprint do dispositivo (opcional)'
            },
            rememberMe: { 
              type: 'boolean',
              description: 'Lembrar login (opcional)'
            }
          }
        },
        response: {
          200: {
            description: 'Login realizado com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresAt: { type: 'string', format: 'date-time' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: 'string' },
                      status: { type: 'string' }
                    }
                  }
                }
              },
              message: { type: 'string' }
            }
          },
          401: {
            description: 'Credenciais inválidas',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    }, AuthController.login);

    // POST /auth/refresh - Renovar token
    fastify.post('/refresh', {
      schema: {
        description: 'Renovar token de acesso',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { 
              type: 'string',
              description: 'Token de renovação'
            }
          }
        },
        response: {
          200: {
            description: 'Token renovado com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresAt: { type: 'string', format: 'date-time' }
                }
              },
              message: { type: 'string' }
            }
          },
          401: {
            description: 'Token inválido ou expirado',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    }, AuthController.refreshToken);

    // POST /auth/forgot-password - Solicitar recuperação de senha
    fastify.post('/forgot-password', {
      schema: {
        description: 'Solicitar recuperação de senha',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { 
              type: 'string', 
              format: 'email',
              description: 'Email do usuário'
            }
          }
        },
        response: {
          200: {
            description: 'Solicitação processada',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    }, AuthController.forgotPassword);

    // POST /auth/reset-password - Redefinir senha
    fastify.post('/reset-password', {
      schema: {
        description: 'Redefinir senha com token',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { 
              type: 'string',
              description: 'Token de recuperação'
            },
            password: { 
              type: 'string', 
              minLength: 8,
              description: 'Nova senha (mínimo 8 caracteres)'
            }
          }
        },
        response: {
          200: {
            description: 'Senha redefinida com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          },
          400: {
            description: 'Token inválido ou expirado',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    }, AuthController.resetPassword);

    // POST /auth/verify-email - Verificar email
    fastify.post('/verify-email', {
      schema: {
        description: 'Verificar email do usuário',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { 
              type: 'string',
              description: 'Token de verificação de email'
            }
          }
        },
        response: {
          200: {
            description: 'Email verificado com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          },
          400: {
            description: 'Token inválido ou expirado',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    }, AuthController.verifyEmail);

    // Rotas protegidas (requerem autenticação)
    
    // GET /auth/me - Obter dados do usuário atual
    fastify.get('/me', {
      preHandler: [authMiddleware],
      schema: {
        description: 'Obter dados do usuário autenticado',
        tags: ['Autenticação'],
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            description: 'Dados do usuário',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  status: { type: 'string' },
                  emailVerifiedAt: { type: 'string', format: 'date-time' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          },
          401: {
            description: 'Não autenticado',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    }, AuthController.me);

    // POST /auth/logout - Fazer logout
    fastify.post('/logout', {
      preHandler: [authMiddleware],
      schema: {
        description: 'Fazer logout da sessão atual',
        tags: ['Autenticação'],
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            description: 'Logout realizado com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          },
          401: {
            description: 'Não autenticado',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    }, AuthController.logout);

    // POST /auth/logout-all - Fazer logout de todas as sessões
    fastify.post('/logout-all', {
      preHandler: [authMiddleware],
      schema: {
        description: 'Fazer logout de todas as sessões do usuário',
        tags: ['Autenticação'],
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            description: 'Logout de todas as sessões realizado',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          },
          401: {
            description: 'Não autenticado',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    }, AuthController.logoutAll);

    // POST /auth/change-password - Alterar senha
    fastify.post<{ Body: ChangePasswordRequest }>('/change-password', {
      preHandler: [authMiddleware, userRateLimit(5, 15 * 60 * 1000)], // 5 tentativas por 15 minutos
      schema: {
        description: 'Alterar senha do usuário',
        tags: ['Autenticação'],
        security: [{ BearerAuth: [] }],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { 
              type: 'string',
              description: 'Senha atual'
            },
            newPassword: { 
              type: 'string', 
              minLength: 8,
              description: 'Nova senha (mínimo 8 caracteres)'
            }
          }
        },
        response: {
          200: {
            description: 'Senha alterada com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          },
          400: {
            description: 'Senha atual incorreta',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          },
          401: {
            description: 'Não autenticado',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    }, AuthController.changePassword);

  }, { prefix: '/auth' });
}

