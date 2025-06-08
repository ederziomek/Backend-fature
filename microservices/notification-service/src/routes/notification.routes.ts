import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { NotificationController } from '@/controllers/notification.controller';

export async function notificationRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  const controller = new NotificationController(prisma);

  // === NOTIFICAÇÕES ===

  // Enviar notificação individual
  fastify.post('/notifications/send', {
    schema: {
      description: 'Envia uma notificação individual',
      tags: ['Notifications'],
      body: {
        type: 'object',
        required: ['userId', 'type', 'category', 'templateId'],
        properties: {
          userId: { type: 'string', description: 'ID do usuário' },
          type: { 
            type: 'string', 
            enum: ['EMAIL', 'SMS', 'PUSH'],
            description: 'Tipo de notificação' 
          },
          category: { 
            type: 'string',
            enum: [
              'WELCOME', 'CPA_COMMISSION', 'REVSHARE_COMMISSION', 
              'LEVEL_UP', 'RANKING_UPDATE', 'SECURITY_ALERT',
              'SYSTEM_MAINTENANCE', 'PROMOTIONAL', 'REMINDER'
            ],
            description: 'Categoria da notificação' 
          },
          templateId: { type: 'string', description: 'ID do template' },
          variables: { 
            type: 'object',
            description: 'Variáveis para renderização do template',
            additionalProperties: true
          },
          recipient: { type: 'string', description: 'Destinatário específico (opcional)' },
          priority: { 
            type: 'string',
            enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
            description: 'Prioridade da notificação'
          },
          scheduledFor: { 
            type: 'string',
            format: 'date-time',
            description: 'Data/hora para envio agendado'
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, controller.sendNotification.bind(controller));

  // Enviar notificações em lote
  fastify.post('/notifications/bulk', {
    schema: {
      description: 'Envia notificações em lote',
      tags: ['Notifications'],
      body: {
        type: 'object',
        required: ['userIds', 'type', 'category', 'templateId'],
        properties: {
          userIds: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Array de IDs de usuários'
          },
          type: { 
            type: 'string', 
            enum: ['EMAIL', 'SMS', 'PUSH'],
            description: 'Tipo de notificação' 
          },
          category: { 
            type: 'string',
            enum: [
              'WELCOME', 'CPA_COMMISSION', 'REVSHARE_COMMISSION', 
              'LEVEL_UP', 'RANKING_UPDATE', 'SECURITY_ALERT',
              'SYSTEM_MAINTENANCE', 'PROMOTIONAL', 'REMINDER'
            ],
            description: 'Categoria da notificação' 
          },
          templateId: { type: 'string', description: 'ID do template' },
          variables: { 
            type: 'object',
            description: 'Variáveis para renderização do template',
            additionalProperties: true
          },
          priority: { 
            type: 'string',
            enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
            description: 'Prioridade da notificação'
          },
          scheduledFor: { 
            type: 'string',
            format: 'date-time',
            description: 'Data/hora para envio agendado'
          }
        }
      },
      response: {
        202: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            totalUsers: { type: 'number' }
          }
        }
      }
    }
  }, controller.sendBulkNotification.bind(controller));

  // Buscar estatísticas
  fastify.get('/notifications/stats', {
    schema: {
      description: 'Busca estatísticas de notificações',
      tags: ['Notifications'],
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date', description: 'Data inicial' },
          endDate: { type: 'string', format: 'date', description: 'Data final' },
          category: { 
            type: 'string',
            enum: [
              'WELCOME', 'CPA_COMMISSION', 'REVSHARE_COMMISSION', 
              'LEVEL_UP', 'RANKING_UPDATE', 'SECURITY_ALERT',
              'SYSTEM_MAINTENANCE', 'PROMOTIONAL', 'REMINDER'
            ],
            description: 'Filtrar por categoria' 
          },
          type: { 
            type: 'string', 
            enum: ['EMAIL', 'SMS', 'PUSH'],
            description: 'Filtrar por tipo' 
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                sent: { type: 'number' },
                delivered: { type: 'number' },
                failed: { type: 'number' },
                pending: { type: 'number' },
                deliveryRate: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, controller.getNotificationStats.bind(controller));

  // === TEMPLATES ===

  // Criar template
  fastify.post('/templates', {
    schema: {
      description: 'Cria um novo template de notificação',
      tags: ['Templates'],
      body: {
        type: 'object',
        required: ['name', 'type', 'content', 'variables'],
        properties: {
          name: { type: 'string', description: 'Nome do template' },
          type: { 
            type: 'string', 
            enum: ['EMAIL', 'SMS', 'PUSH'],
            description: 'Tipo de notificação' 
          },
          subject: { type: 'string', description: 'Assunto (para emails)' },
          content: { type: 'string', description: 'Conteúdo do template' },
          variables: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Variáveis disponíveis no template'
          }
        }
      }
    }
  }, controller.createTemplate.bind(controller));

  // Listar templates
  fastify.get('/templates', {
    schema: {
      description: 'Lista templates de notificação',
      tags: ['Templates'],
      querystring: {
        type: 'object',
        properties: {
          type: { 
            type: 'string', 
            enum: ['EMAIL', 'SMS', 'PUSH'],
            description: 'Filtrar por tipo' 
          },
          isActive: { type: 'string', enum: ['true', 'false'], description: 'Filtrar por status' },
          page: { type: 'string', description: 'Página (padrão: 1)' },
          limit: { type: 'string', description: 'Itens por página (padrão: 20)' }
        }
      }
    }
  }, controller.listTemplates.bind(controller));

  // Buscar template por ID
  fastify.get('/templates/:id', {
    schema: {
      description: 'Busca template por ID',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'ID do template' }
        }
      }
    }
  }, controller.getTemplate.bind(controller));

  // Atualizar template
  fastify.put('/templates/:id', {
    schema: {
      description: 'Atualiza um template',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'ID do template' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome do template' },
          subject: { type: 'string', description: 'Assunto (para emails)' },
          content: { type: 'string', description: 'Conteúdo do template' },
          variables: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Variáveis disponíveis no template'
          },
          isActive: { type: 'boolean', description: 'Status do template' }
        }
      }
    }
  }, controller.updateTemplate.bind(controller));

  // Deletar template
  fastify.delete('/templates/:id', {
    schema: {
      description: 'Deleta um template',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'ID do template' }
        }
      }
    }
  }, controller.deleteTemplate.bind(controller));

  // Testar template
  fastify.post('/templates/:id/test', {
    schema: {
      description: 'Testa renderização de um template',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'ID do template' }
        }
      },
      body: {
        type: 'object',
        properties: {
          variables: { 
            type: 'object',
            description: 'Variáveis para teste',
            additionalProperties: true
          }
        }
      }
    }
  }, controller.testTemplate.bind(controller));

  // === PREFERÊNCIAS ===

  // Buscar preferências do usuário
  fastify.get('/preferences/:userId', {
    schema: {
      description: 'Busca preferências de notificação do usuário',
      tags: ['Preferences'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'ID do usuário' }
        }
      }
    }
  }, controller.getUserPreferences.bind(controller));

  // Atualizar preferências do usuário
  fastify.put('/preferences/:userId', {
    schema: {
      description: 'Atualiza preferências de notificação do usuário',
      tags: ['Preferences'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'ID do usuário' }
        }
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'boolean', description: 'Receber emails' },
          sms: { type: 'boolean', description: 'Receber SMS' },
          push: { type: 'boolean', description: 'Receber push notifications' },
          categories: { 
            type: 'array',
            items: { 
              type: 'string',
              enum: [
                'WELCOME', 'CPA_COMMISSION', 'REVSHARE_COMMISSION', 
                'LEVEL_UP', 'RANKING_UPDATE', 'SECURITY_ALERT',
                'SYSTEM_MAINTENANCE', 'PROMOTIONAL', 'REMINDER'
              ]
            },
            description: 'Categorias habilitadas'
          }
        }
      }
    }
  }, controller.updateUserPreferences.bind(controller));

  // Desabilitar todas as notificações
  fastify.post('/preferences/:userId/disable-all', {
    schema: {
      description: 'Desabilita todas as notificações para o usuário',
      tags: ['Preferences'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'ID do usuário' }
        }
      }
    }
  }, controller.disableAllNotifications.bind(controller));

  // Habilitar todas as notificações
  fastify.post('/preferences/:userId/enable-all', {
    schema: {
      description: 'Habilita todas as notificações para o usuário',
      tags: ['Preferences'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'ID do usuário' }
        }
      }
    }
  }, controller.enableAllNotifications.bind(controller));

  // === HEALTH CHECK ===

  // Health check
  fastify.get('/health', {
    schema: {
      description: 'Verifica saúde do serviço',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            service: { type: 'string' },
            version: { type: 'string' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'boolean' },
                redis: { type: 'boolean' },
                sendgrid: { type: 'boolean' },
                twilio: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, controller.healthCheck.bind(controller));
}

