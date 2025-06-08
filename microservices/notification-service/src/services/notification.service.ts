import { PrismaClient } from '@prisma/client';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import webpush from 'web-push';
import Handlebars from 'handlebars';
import { NotificationCache } from '@/config/redis';
import { notificationConfig } from '@/config';
import {
  NotificationRequest,
  NotificationTemplate,
  NotificationPreference,
  NotificationLog,
  NotificationStatus,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  BulkNotificationRequest,
  NotificationStats
} from '@/types';

export class NotificationService {
  private prisma: PrismaClient;
  private twilioClient: any;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize SendGrid
    if (notificationConfig.email.apiKey) {
      sgMail.setApiKey(notificationConfig.email.apiKey);
    }

    // Initialize Twilio
    if (notificationConfig.sms.accountSid && notificationConfig.sms.authToken) {
      this.twilioClient = twilio(
        notificationConfig.sms.accountSid,
        notificationConfig.sms.authToken
      );
    }

    // Initialize Web Push
    if (notificationConfig.push.vapidPublicKey && notificationConfig.push.vapidPrivateKey) {
      webpush.setVapidDetails(
        notificationConfig.push.vapidSubject,
        notificationConfig.push.vapidPublicKey,
        notificationConfig.push.vapidPrivateKey
      );
    }
  }

  /**
   * Envia uma notificação individual
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationLog> {
    try {
      // Buscar template
      const template = await this.getTemplate(request.templateId);
      if (!template) {
        throw new Error(`Template ${request.templateId} não encontrado`);
      }

      // Verificar preferências do usuário
      const preferences = await this.getUserPreferences(request.userId);
      if (!this.shouldSendNotification(request.type, request.category, preferences)) {
        throw new Error('Usuário optou por não receber este tipo de notificação');
      }

      // Determinar destinatário
      const recipient = request.recipient || await this.getRecipientForUser(request.userId, request.type);
      if (!recipient) {
        throw new Error('Destinatário não encontrado para o usuário');
      }

      // Criar log de notificação
      const notificationLog = await this.prisma.notificationLog.create({
        data: {
          userId: request.userId,
          type: request.type,
          category: request.category,
          templateId: request.templateId,
          recipient,
          priority: request.priority,
          scheduledFor: request.scheduledFor,
          metadata: request.variables,
        },
      });

      // Se agendada, não enviar agora
      if (request.scheduledFor && request.scheduledFor > new Date()) {
        return notificationLog;
      }

      // Renderizar conteúdo
      const content = this.renderTemplate(template.content, request.variables);
      const subject = template.subject ? this.renderTemplate(template.subject, request.variables) : undefined;

      // Enviar notificação
      const success = await this.sendByType(request.type, recipient, content, subject);

      // Atualizar log
      const updatedLog = await this.prisma.notificationLog.update({
        where: { id: notificationLog.id },
        data: {
          status: success ? NotificationStatus.SENT : NotificationStatus.FAILED,
          sentAt: success ? new Date() : undefined,
          errorMessage: success ? undefined : 'Falha no envio',
        },
      });

      // Atualizar estatísticas
      await this.updateStats(request.category, request.type, success);

      return updatedLog;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      
      // Criar log de erro se possível
      try {
        return await this.prisma.notificationLog.create({
          data: {
            userId: request.userId,
            type: request.type,
            category: request.category,
            templateId: request.templateId,
            recipient: request.recipient || 'unknown',
            status: NotificationStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
            metadata: request.variables,
          },
        });
      } catch (logError) {
        console.error('Erro ao criar log de notificação:', logError);
        throw error;
      }
    }
  }

  /**
   * Envia notificações em lote
   */
  async sendBulkNotification(request: BulkNotificationRequest): Promise<void> {
    const batch = await this.prisma.notificationBatch.create({
      data: {
        name: `Bulk ${request.category} - ${new Date().toISOString()}`,
        type: request.type,
        category: request.category,
        templateId: request.templateId,
        userIds: request.userIds,
        variables: request.variables,
        totalUsers: request.userIds.length,
      },
    });

    // Processar em lotes menores
    const batchSize = notificationConfig.notification.batchSize;
    const userBatches = this.chunkArray(request.userIds, batchSize);

    let processed = 0;
    let successful = 0;
    let failed = 0;

    await this.prisma.notificationBatch.update({
      where: { id: batch.id },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    for (const userBatch of userBatches) {
      const promises = userBatch.map(async (userId) => {
        try {
          const notificationRequest: NotificationRequest = {
            userId,
            type: request.type,
            category: request.category,
            templateId: request.templateId,
            variables: request.variables,
            priority: request.priority || NotificationPriority.NORMAL,
            scheduledFor: request.scheduledFor ? new Date(request.scheduledFor) : undefined,
          };

          await this.sendNotification(notificationRequest);
          return { success: true };
        } catch (error) {
          console.error(`Erro ao enviar notificação para usuário ${userId}:`, error);
          return { success: false };
        }
      });

      const results = await Promise.allSettled(promises);
      
      results.forEach((result) => {
        processed++;
        if (result.status === 'fulfilled' && result.value.success) {
          successful++;
        } else {
          failed++;
        }
      });

      // Atualizar progresso do lote
      await this.prisma.notificationBatch.update({
        where: { id: batch.id },
        data: { processed, successful, failed },
      });

      // Pequena pausa entre lotes para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Finalizar lote
    await this.prisma.notificationBatch.update({
      where: { id: batch.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        processed,
        successful,
        failed,
      },
    });
  }

  /**
   * Busca template (com cache)
   */
  private async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    // Tentar buscar do cache primeiro
    const cached = await NotificationCache.getTemplate(templateId);
    if (cached) {
      return JSON.parse(cached);
    }

    // Buscar do banco
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id: templateId, isActive: true },
    });

    if (template) {
      // Salvar no cache
      await NotificationCache.setTemplate(
        templateId,
        JSON.stringify(template),
        notificationConfig.templates.cacheTimeout / 1000
      );
    }

    return template;
  }

  /**
   * Busca preferências do usuário (com cache)
   */
  private async getUserPreferences(userId: string): Promise<NotificationPreference | null> {
    // Tentar buscar do cache primeiro
    const cached = await NotificationCache.getPreferences(userId);
    if (cached) {
      return JSON.parse(cached);
    }

    // Buscar do banco
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (preferences) {
      // Salvar no cache
      await NotificationCache.setPreferences(
        userId,
        JSON.stringify(preferences),
        1800 // 30 minutos
      );
    }

    return preferences;
  }

  /**
   * Verifica se deve enviar a notificação baseado nas preferências
   */
  private shouldSendNotification(
    type: NotificationType,
    category: NotificationCategory,
    preferences: NotificationPreference | null
  ): boolean {
    if (!preferences) {
      return true; // Se não tem preferências, enviar por padrão
    }

    // Verificar se o tipo está habilitado
    const typeEnabled = preferences[type.toLowerCase() as keyof NotificationPreference] as boolean;
    if (!typeEnabled) {
      return false;
    }

    // Verificar se a categoria está habilitada
    if (preferences.categories.length > 0 && !preferences.categories.includes(category)) {
      return false;
    }

    return true;
  }

  /**
   * Busca destinatário para o usuário baseado no tipo
   */
  private async getRecipientForUser(userId: string, type: NotificationType): Promise<string | null> {
    // Aqui você faria uma chamada para o auth-service ou affiliate-service
    // para buscar os dados do usuário (email, telefone, etc.)
    // Por enquanto, vou simular
    
    try {
      // Simular busca de dados do usuário
      // Em produção, isso seria uma chamada HTTP para outro microsserviço
      switch (type) {
        case NotificationType.EMAIL:
          return `user${userId}@example.com`; // Placeholder
        case NotificationType.SMS:
          return `+5511999999999`; // Placeholder
        case NotificationType.PUSH:
          return `push_endpoint_${userId}`; // Placeholder
        default:
          return null;
      }
    } catch (error) {
      console.error('Erro ao buscar destinatário:', error);
      return null;
    }
  }

  /**
   * Renderiza template com variáveis
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(variables);
  }

  /**
   * Envia notificação baseado no tipo
   */
  private async sendByType(
    type: NotificationType,
    recipient: string,
    content: string,
    subject?: string
  ): Promise<boolean> {
    try {
      switch (type) {
        case NotificationType.EMAIL:
          return await this.sendEmail(recipient, content, subject || 'Notificação');
        case NotificationType.SMS:
          return await this.sendSMS(recipient, content);
        case NotificationType.PUSH:
          return await this.sendPush(recipient, content, subject);
        default:
          throw new Error(`Tipo de notificação não suportado: ${type}`);
      }
    } catch (error) {
      console.error(`Erro ao enviar ${type}:`, error);
      return false;
    }
  }

  /**
   * Envia email via SendGrid
   */
  private async sendEmail(to: string, content: string, subject: string): Promise<boolean> {
    try {
      if (!notificationConfig.email.apiKey) {
        console.warn('SendGrid API key não configurada');
        return false;
      }

      const msg = {
        to,
        from: {
          email: notificationConfig.email.fromEmail,
          name: notificationConfig.email.fromName,
        },
        subject,
        html: content,
        replyTo: notificationConfig.email.replyTo,
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return false;
    }
  }

  /**
   * Envia SMS via Twilio
   */
  private async sendSMS(to: string, content: string): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        console.warn('Twilio não configurado');
        return false;
      }

      await this.twilioClient.messages.create({
        body: content,
        from: notificationConfig.sms.fromNumber,
        to,
      });

      return true;
    } catch (error) {
      console.error('Erro ao enviar SMS:', error);
      return false;
    }
  }

  /**
   * Envia push notification
   */
  private async sendPush(endpoint: string, content: string, title?: string): Promise<boolean> {
    try {
      const payload = JSON.stringify({
        title: title || 'Notificação',
        body: content,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
      });

      // Em produção, o endpoint seria um endpoint real de push subscription
      // Por enquanto, apenas simular sucesso
      console.log(`Push notification enviada para ${endpoint}: ${payload}`);
      return true;
    } catch (error) {
      console.error('Erro ao enviar push notification:', error);
      return false;
    }
  }

  /**
   * Atualiza estatísticas
   */
  private async updateStats(
    category: NotificationCategory,
    type: NotificationType,
    success: boolean
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      await this.prisma.notificationStats.upsert({
        where: {
          date_category_type: {
            date: today,
            category,
            type,
          },
        },
        update: {
          totalSent: { increment: 1 },
          totalDelivered: success ? { increment: 1 } : undefined,
          totalFailed: success ? undefined : { increment: 1 },
        },
        create: {
          date: today,
          category,
          type,
          totalSent: 1,
          totalDelivered: success ? 1 : 0,
          totalFailed: success ? 0 : 1,
        },
      });

      // Recalcular taxa de entrega
      const stats = await this.prisma.notificationStats.findUnique({
        where: {
          date_category_type: {
            date: today,
            category,
            type,
          },
        },
      });

      if (stats) {
        const deliveryRate = stats.totalSent > 0 ? (stats.totalDelivered / stats.totalSent) * 100 : 0;
        await this.prisma.notificationStats.update({
          where: { id: stats.id },
          data: { deliveryRate },
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar estatísticas:', error);
    }
  }

  /**
   * Divide array em chunks menores
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Busca estatísticas de notificação
   */
  async getStats(
    startDate?: Date,
    endDate?: Date,
    category?: NotificationCategory,
    type?: NotificationType
  ): Promise<NotificationStats> {
    const where: any = {};
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }
    
    if (category) where.category = category;
    if (type) where.type = type;

    const stats = await this.prisma.notificationStats.aggregate({
      where,
      _sum: {
        totalSent: true,
        totalDelivered: true,
        totalFailed: true,
      },
    });

    const total = stats._sum.totalSent || 0;
    const delivered = stats._sum.totalDelivered || 0;
    const failed = stats._sum.totalFailed || 0;
    const pending = 0; // Calcular baseado na queue se necessário

    // Inicializar categorias e tipos com valores zero
    const categories = {} as Record<NotificationCategory, number>;
    const types = {} as Record<NotificationType, number>;
    
    Object.values(NotificationCategory).forEach(cat => {
      categories[cat] = 0;
    });
    
    Object.values(NotificationType).forEach(t => {
      types[t] = 0;
    });

    return {
      total,
      sent: total,
      delivered,
      failed,
      pending,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
      categories,
      types,
    };
  }
}

