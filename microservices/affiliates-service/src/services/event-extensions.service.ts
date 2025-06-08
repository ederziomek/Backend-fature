// ===============================================
// EXTENSÕES PARA EVENT SERVICE - INTEGRAÇÃO CPA
// ===============================================

import { SystemEvent, SecurityEvent } from '../types/cpa-integration';
import { prisma } from '../config/database';

export class EventServiceExtensions {
  
  /**
   * Registra evento do sistema
   */
  static async recordEvent(eventData: {
    type: string;
    affiliate_id?: string;
    customer_id?: string;
    data: Record<string, any>;
    source: string;
    external_id?: string;
  }): Promise<SystemEvent> {
    try {
      const event = await prisma.systemEvent.create({
        data: {
          id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: eventData.type,
          affiliate_id: eventData.affiliate_id,
          customer_id: eventData.customer_id,
          data: eventData.data,
          source: eventData.source,
          external_id: eventData.external_id,
          created_at: new Date(),
        },
      });

      console.log('System event recorded', {
        event_id: event.id,
        type: event.type,
        source: event.source,
      });

      return event as SystemEvent;
    } catch (error) {
      console.error('Error recording system event:', error);
      throw error;
    }
  }

  /**
   * Busca evento por ID externo
   */
  static async getEventByExternalId(externalId: string): Promise<SystemEvent | null> {
    try {
      const event = await prisma.systemEvent.findFirst({
        where: {
          external_id: externalId,
        },
      });

      return event as SystemEvent | null;
    } catch (error) {
      console.error('Error getting event by external ID:', error);
      return null;
    }
  }

  /**
   * Busca eventos por tipo
   */
  static async getEventsByType(
    type: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SystemEvent[]> {
    try {
      const events = await prisma.systemEvent.findMany({
        where: {
          type: type,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return events as SystemEvent[];
    } catch (error) {
      console.error('Error getting events by type:', error);
      return [];
    }
  }

  /**
   * Busca eventos por afiliado
   */
  static async getEventsByAffiliate(
    affiliateId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SystemEvent[]> {
    try {
      const events = await prisma.systemEvent.findMany({
        where: {
          affiliate_id: affiliateId,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return events as SystemEvent[];
    } catch (error) {
      console.error('Error getting events by affiliate:', error);
      return [];
    }
  }

  /**
   * Busca eventos por cliente
   */
  static async getEventsByCustomer(
    customerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SystemEvent[]> {
    try {
      const events = await prisma.systemEvent.findMany({
        where: {
          customer_id: customerId,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return events as SystemEvent[];
    } catch (error) {
      console.error('Error getting events by customer:', error);
      return [];
    }
  }

  /**
   * Registra evento de segurança
   */
  static async logSecurityEvent(eventData: SecurityEvent): Promise<void> {
    try {
      // Registrar como evento do sistema
      await this.recordEvent({
        type: 'SECURITY_EVENT',
        data: eventData,
        source: 'affiliate-service',
      });

      // Log adicional para eventos de segurança
      console.warn('Security event logged', {
        type: eventData.type,
        source: eventData.source,
        event_id: eventData.event_id,
        ip_address: eventData.ip_address,
        timestamp: eventData.timestamp,
      });

      // Implementar alertas se necessário
      if (this.isHighSeveritySecurityEvent(eventData.type)) {
        await this.sendSecurityAlert(eventData);
      }

    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Verifica se é evento de segurança de alta severidade
   */
  private static isHighSeveritySecurityEvent(eventType: string): boolean {
    const highSeverityEvents = [
      'INVALID_WEBHOOK_SIGNATURE',
      'MULTIPLE_FAILED_AUTHENTICATIONS',
      'SUSPICIOUS_ACTIVITY_DETECTED',
      'UNAUTHORIZED_ACCESS_ATTEMPT',
    ];

    return highSeverityEvents.includes(eventType);
  }

  /**
   * Envia alerta de segurança
   */
  private static async sendSecurityAlert(eventData: SecurityEvent): Promise<void> {
    try {
      // Implementar notificação de segurança
      // Por exemplo: email, Slack, webhook para sistema de monitoramento
      
      console.error('HIGH SEVERITY SECURITY EVENT', {
        type: eventData.type,
        source: eventData.source,
        timestamp: eventData.timestamp,
        details: eventData.details,
      });

      // Registrar alerta enviado
      await this.recordEvent({
        type: 'SECURITY_ALERT_SENT',
        data: {
          original_event: eventData,
          alert_sent_at: new Date(),
        },
        source: 'affiliate-service',
      });

    } catch (error) {
      console.error('Error sending security alert:', error);
    }
  }

  /**
   * Limpa eventos antigos (manutenção)
   */
  static async cleanupOldEvents(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.systemEvent.deleteMany({
        where: {
          created_at: {
            lt: cutoffDate,
          },
        },
      });

      console.log('Old events cleaned up', {
        deleted_count: result.count,
        cutoff_date: cutoffDate,
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up old events:', error);
      return 0;
    }
  }

  /**
   * Obtém estatísticas de eventos
   */
  static async getEventStats(days: number = 30): Promise<{
    total_events: number;
    events_by_type: Record<string, number>;
    events_by_source: Record<string, number>;
    daily_counts: Array<{ date: string; count: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Total de eventos
      const totalEvents = await prisma.systemEvent.count({
        where: {
          created_at: {
            gte: startDate,
          },
        },
      });

      // Eventos por tipo
      const eventsByType = await prisma.systemEvent.groupBy({
        by: ['type'],
        where: {
          created_at: {
            gte: startDate,
          },
        },
        _count: {
          type: true,
        },
      });

      // Eventos por fonte
      const eventsBySource = await prisma.systemEvent.groupBy({
        by: ['source'],
        where: {
          created_at: {
            gte: startDate,
          },
        },
        _count: {
          source: true,
        },
      });

      // Contagem diária (implementação simplificada)
      const dailyCounts: Array<{ date: string; count: number }> = [];
      
      return {
        total_events: totalEvents,
        events_by_type: eventsByType.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {} as Record<string, number>),
        events_by_source: eventsBySource.reduce((acc, item) => {
          acc[item.source] = item._count.source;
          return acc;
        }, {} as Record<string, number>),
        daily_counts: dailyCounts,
      };

    } catch (error) {
      console.error('Error getting event stats:', error);
      return {
        total_events: 0,
        events_by_type: {},
        events_by_source: {},
        daily_counts: [],
      };
    }
  }
}

