// ===============================================
// ROTAS DE GESTÃO DE USUÁRIOS - ADMIN SERVICE
// ===============================================

import { FastifyInstance } from 'fastify';
import { UserManagementController } from '@/controllers/user-management.controller';

export async function userManagementRoutes(fastify: FastifyInstance) {
  await fastify.register(async function (fastify) {
    // Schemas para documentação
    fastify.addSchema({
      $id: 'UserManagement',
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'pending_verification'] },
        isAffiliate: { type: 'boolean' },
        affiliateCode: { type: 'string' },
        totalCommissions: { type: 'number' },
        lastActivityAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    });

    fastify.addSchema({
      $id: 'AdminUser',
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string' },
        role: { type: 'string', enum: ['super_admin', 'admin', 'manager', 'analyst', 'support'] },
        status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'pending_activation'] },
        permissions: { type: 'array', items: { type: 'string' } },
        lastLoginAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    });

    // ===============================================
    // ROTAS DE USUÁRIOS
    // ===============================================

    // Listar usuários
    fastify.get('/users', {
      schema: {
        tags: ['Usuários'],
        summary: 'Listar usuários',
        description: 'Lista usuários com filtros e paginação',
        security: [{ Bearer: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filtrar por status' },
            isAffiliate: { type: 'boolean', description: 'Filtrar por afiliados' },
            dateFrom: { type: 'string', format: 'date', description: 'Data inicial' },
            dateTo: { type: 'string', format: 'date', description: 'Data final' },
            search: { type: 'string', description: 'Buscar por nome ou email' },
            page: { type: 'number', minimum: 1, default: 1, description: 'Página' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: 'Itens por página' }
          }
        },
        response: {
          200: {
            description: 'Lista de usuários',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: { $ref: 'UserManagement#' } },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'number' },
                      limit: { type: 'number' },
                      total: { type: 'number' },
                      pages: { type: 'number' }
                    }
                  }
                }
              },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      }
    }, UserManagementController.listUsers);

    // Obter detalhes de usuário
    fastify.get('/users/:id', {
      schema: {
        tags: ['Usuários'],
        summary: 'Detalhes do usuário',
        description: 'Obtém detalhes completos de um usuário',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do usuário' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Detalhes do usuário',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: 'UserManagement#' },
              statusCode: { type: 'number', example: 200 }
            }
          },
          404: {
            description: 'Usuário não encontrado',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Usuário não encontrado' },
              statusCode: { type: 'number', example: 404 }
            }
          }
        }
      }
    }, UserManagementController.getUserDetails);

    // Atualizar status do usuário
    fastify.put('/users/:id/status', {
      schema: {
        tags: ['Usuários'],
        summary: 'Atualizar status',
        description: 'Atualiza o status de um usuário',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do usuário' }
          },
          required: ['id']
        },
        body: {
          type: 'object',
          properties: {
            status: { 
              type: 'string', 
              enum: ['active', 'inactive', 'suspended', 'pending_verification'],
              description: 'Novo status do usuário'
            }
          },
          required: ['status']
        },
        response: {
          200: {
            description: 'Status atualizado com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Status atualizado com sucesso' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      }
    }, UserManagementController.updateUserStatus);

    // Suspender usuário
    fastify.post('/users/:id/suspend', {
      schema: {
        tags: ['Usuários'],
        summary: 'Suspender usuário',
        description: 'Suspende um usuário com motivo',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do usuário' }
          },
          required: ['id']
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Motivo da suspensão' }
          },
          required: ['reason']
        },
        response: {
          200: {
            description: 'Usuário suspenso com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Usuário suspenso com sucesso' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      }
    }, UserManagementController.suspendUser);

    // Reativar usuário
    fastify.post('/users/:id/reactivate', {
      schema: {
        tags: ['Usuários'],
        summary: 'Reativar usuário',
        description: 'Reativa um usuário suspenso',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do usuário' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Usuário reativado com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Usuário reativado com sucesso' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      }
    }, UserManagementController.reactivateUser);

    // ===============================================
    // ROTAS DE ADMINISTRADORES
    // ===============================================

    // Listar administradores
    fastify.get('/admins', {
      schema: {
        tags: ['Usuários'],
        summary: 'Listar administradores',
        description: 'Lista todos os administradores do sistema',
        security: [{ Bearer: [] }],
        response: {
          200: {
            description: 'Lista de administradores',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'array', items: { $ref: 'AdminUser#' } },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      }
    }, UserManagementController.listAdmins);

    // Criar administrador
    fastify.post('/admins', {
      schema: {
        tags: ['Usuários'],
        summary: 'Criar administrador',
        description: 'Cria um novo administrador do sistema',
        security: [{ Bearer: [] }],
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', description: 'Email do administrador' },
            name: { type: 'string', description: 'Nome do administrador' },
            password: { type: 'string', minLength: 8, description: 'Senha do administrador' },
            role: { 
              type: 'string', 
              enum: ['super_admin', 'admin', 'manager', 'analyst', 'support'],
              description: 'Papel do administrador'
            },
            permissions: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Permissões específicas (opcional)'
            }
          },
          required: ['email', 'name', 'password', 'role']
        },
        response: {
          201: {
            description: 'Administrador criado com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: 'AdminUser#' },
              message: { type: 'string', example: 'Administrador criado com sucesso' },
              statusCode: { type: 'number', example: 201 }
            }
          }
        }
      }
    }, UserManagementController.createAdmin);

    // Atualizar administrador
    fastify.put('/admins/:id', {
      schema: {
        tags: ['Usuários'],
        summary: 'Atualizar administrador',
        description: 'Atualiza dados de um administrador',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do administrador' }
          },
          required: ['id']
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome do administrador' },
            role: { 
              type: 'string', 
              enum: ['super_admin', 'admin', 'manager', 'analyst', 'support'],
              description: 'Papel do administrador'
            },
            status: { 
              type: 'string', 
              enum: ['active', 'inactive', 'suspended', 'pending_activation'],
              description: 'Status do administrador'
            },
            permissions: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Permissões específicas'
            }
          }
        },
        response: {
          200: {
            description: 'Administrador atualizado com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: 'AdminUser#' },
              message: { type: 'string', example: 'Administrador atualizado com sucesso' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      }
    }, UserManagementController.updateAdmin);

    // Remover administrador
    fastify.delete('/admins/:id', {
      schema: {
        tags: ['Usuários'],
        summary: 'Remover administrador',
        description: 'Remove um administrador do sistema',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do administrador' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Administrador removido com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Administrador removido com sucesso' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      }
    }, UserManagementController.deleteAdmin);
  });
}

