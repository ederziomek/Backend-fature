import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '@/services/notification.service';
import { TemplateService } from '@/services/template.service';
import { PreferenceService } from '@/services/preference.service';
import {
  SendNotificationRequest,
  BulkNotificationRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  UpdatePreferencesRequest,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from '@/types';

export class NotificationController {
  private notificationService: NotificationService;
  private templateService: TemplateService;
  private preferenceService: PreferenceService;

  constructor(prisma: PrismaClient) {
    this.notificationService = new NotificationService(prisma);
    this.templateService = new TemplateService(prisma);
    this.preferenceService = new PreferenceService(prisma);
  }

  /**
   * Envia uma notificação individual
   * POST /notifications/send
   */
  async sendNotification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as SendNotificationRequest;

      // Validar dados de entrada
      if (!body.userId || !body.type || !body.category || !body.templateId) {
        return reply.status(400).send({
          error: 'Campos obrigatórios: userId, type, category, templateId',
        });
      }

      const notificationRequest = {
        userId: body.userId,
        type: body.type,
        category: body.category,
        templateId: body.templateId,
        variables: body.variables || {},
        recipient: body.recipient,
        priority: body.priority || NotificationPriority.NORMAL,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      };

      const result = await this.notificationService.sendNotification(notificationRequest);

      return reply.status(201).send({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Envia notificações em lote
   * POST /notifications/bulk
   */
  async sendBulkNotification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as BulkNotificationRequest;

      // Validar dados de entrada
      if (!body.userIds || !Array.isArray(body.userIds) || body.userIds.length === 0) {
        return reply.status(400).send({
          error: 'userIds deve ser um array não vazio',
        });
      }

      if (!body.type || !body.category || !body.templateId) {
        return reply.status(400).send({
          error: 'Campos obrigatórios: type, category, templateId',
        });
      }

      // Processar em background
      this.notificationService.sendBulkNotification(body).catch(error => {
        console.error('Erro no processamento em lote:', error);
      });

      return reply.status(202).send({
        success: true,
        message: 'Processamento em lote iniciado',
        totalUsers: body.userIds.length,
      });
    } catch (error) {
      console.error('Erro ao iniciar envio em lote:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Busca estatísticas de notificações
   * GET /notifications/stats
   */
  async getNotificationStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as {
        startDate?: string;
        endDate?: string;
        category?: NotificationCategory;
        type?: NotificationType;
      };

      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const stats = await this.notificationService.getStats(
        startDate,
        endDate,
        query.category,
        query.type
      );

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // === TEMPLATES ===

  /**
   * Cria um novo template
   * POST /templates
   */
  async createTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as CreateTemplateRequest;

      // Validar dados de entrada
      if (!body.name || !body.type || !body.content || !body.variables) {
        return reply.status(400).send({
          error: 'Campos obrigatórios: name, type, content, variables',
        });
      }

      const template = await this.templateService.createTemplate(body);

      return reply.status(201).send({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error('Erro ao criar template:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Lista templates
   * GET /templates
   */
  async listTemplates(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as {
        type?: NotificationType;
        isActive?: string;
        page?: string;
        limit?: string;
      };

      const type = query.type;
      const isActive = query.isActive ? query.isActive === 'true' : undefined;
      const page = parseInt(query.page || '1', 10);
      const limit = parseInt(query.limit || '20', 10);

      const result = await this.templateService.listTemplates(type, isActive, page, limit);

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Erro ao listar templates:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Busca template por ID
   * GET /templates/:id
   */
  async getTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      const template = await this.templateService.getTemplate(params.id);

      if (!template) {
        return reply.status(404).send({
          error: 'Template não encontrado',
        });
      }

      return reply.send({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error('Erro ao buscar template:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Atualiza template
   * PUT /templates/:id
   */
  async updateTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      const body = request.body as UpdateTemplateRequest;

      const template = await this.templateService.updateTemplate(params.id, body);

      return reply.send({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Deleta template
   * DELETE /templates/:id
   */
  async deleteTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      await this.templateService.deleteTemplate(params.id);

      return reply.send({
        success: true,
        message: 'Template deletado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar template:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Testa renderização de template
   * POST /templates/:id/test
   */
  async testTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      const body = request.body as { variables: Record<string, any> };

      const result = await this.templateService.testTemplate(params.id, body.variables || {});

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Erro ao testar template:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // === PREFERÊNCIAS ===

  /**
   * Busca preferências do usuário
   * GET /preferences/:userId
   */
  async getUserPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { userId: string };
      const preferences = await this.preferenceService.getUserPreferences(params.userId);

      return reply.send({
        success: true,
        data: preferences,
      });
    } catch (error) {
      console.error('Erro ao buscar preferências:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Atualiza preferências do usuário
   * PUT /preferences/:userId
   */
  async updateUserPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { userId: string };
      const body = request.body as UpdatePreferencesRequest;

      const preferences = await this.preferenceService.updateUserPreferences(params.userId, body);

      return reply.send({
        success: true,
        data: preferences,
      });
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Desabilita todas as notificações para um usuário
   * POST /preferences/:userId/disable-all
   */
  async disableAllNotifications(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { userId: string };
      const preferences = await this.preferenceService.disableAllNotifications(params.userId);

      return reply.send({
        success: true,
        data: preferences,
        message: 'Todas as notificações foram desabilitadas',
      });
    } catch (error) {
      console.error('Erro ao desabilitar notificações:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Habilita todas as notificações para um usuário
   * POST /preferences/:userId/enable-all
   */
  async enableAllNotifications(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { userId: string };
      const preferences = await this.preferenceService.enableAllNotifications(params.userId);

      return reply.send({
        success: true,
        data: preferences,
        message: 'Todas as notificações foram habilitadas',
      });
    } catch (error) {
      console.error('Erro ao habilitar notificações:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // === HEALTH CHECK ===

  /**
   * Health check do serviço
   * GET /health
   */
  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Verificar conexões essenciais
      const checks = {
        database: false,
        redis: false,
        sendgrid: false,
        twilio: false,
      };

      // Verificar database
      try {
        const { checkDatabaseHealth } = await import('@/config/database');
        checks.database = await checkDatabaseHealth();
      } catch (error) {
        console.error('Database health check failed:', error);
      }

      // Verificar Redis
      try {
        const { checkRedisHealth } = await import('@/config/redis');
        checks.redis = await checkRedisHealth();
      } catch (error) {
        console.error('Redis health check failed:', error);
      }

      // Verificar SendGrid (se configurado)
      checks.sendgrid = !!process.env.SENDGRID_API_KEY;

      // Verificar Twilio (se configurado)
      checks.twilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

      const isHealthy = checks.database && checks.redis;

      return reply.status(isHealthy ? 200 : 503).send({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'notification-service',
        version: '1.0.0',
        checks,
      });
    } catch (error) {
      console.error('Health check error:', error);
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'notification-service',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
}

