// ===============================================
// WEBHOOK SERVICE - AFFILIATE SERVICE
// ===============================================

import crypto from 'crypto';
import { EventService } from './event.service';
import { AuditService } from './audit.service';

export interface WebhookStats {
  total_events_received: number;
  events_by_type: Record<string, number>;
  last_event_received: Date | null;
  average_processing_time_ms: number;
  failed_events: number;
  success_rate: number;
}

export interface WebhookEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  processing_time_ms: number;
  success: boolean;
  error_message?: string;
}

export class WebhookService {
  private eventService: EventService;
  private auditService: AuditService;
  private secretKey: string;
  private stats: WebhookStats;
  private recentEvents: WebhookEvent[] = [];
  private maxRecentEvents = 1000;

  constructor(eventService: EventService, auditService: AuditService) {
    this.eventService = eventService;
    this.auditService = auditService;
    this.secretKey = process.env.WEBHOOK_SECRET_KEY || 'default_secret_key';
    
    this.stats = {
      total_events_received: 0,
      events_by_type: {},
      last_event_received: null,
      average_processing_time_ms: 0,
      failed_events: 0,
      success_rate: 100,
    };
  }

  /**
   * Verifica assinatura HMAC do webhook
   */
  verifySignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(payload)
        .digest('hex');
      
      const receivedSignature = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Registra evento de webhook processado
   */
  recordWebhookEvent(
    eventId: string,
    eventType: string,
    source: string,
    processingTimeMs: number,
    success: boolean,
    errorMessage?: string
  ): void {
    // Atualizar estatísticas
    this.stats.total_events_received++;
    this.stats.events_by_type[eventType] = (this.stats.events_by_type[eventType] || 0) + 1;
    this.stats.last_event_received = new Date();
    
    if (!success) {
      this.stats.failed_events++;
    }
    
    this.stats.success_rate = ((this.stats.total_events_received - this.stats.failed_events) / this.stats.total_events_received) * 100;
    
    // Calcular tempo médio de processamento
    const totalProcessingTime = this.stats.average_processing_time_ms * (this.stats.total_events_received - 1) + processingTimeMs;
    this.stats.average_processing_time_ms = totalProcessingTime / this.stats.total_events_received;

    // Adicionar aos eventos recentes
    const webhookEvent: WebhookEvent = {
      id: eventId,
      type: eventType,
      source,
      timestamp: new Date(),
      processing_time_ms: processingTimeMs,
      success,
      error_message: errorMessage,
    };

    this.recentEvents.unshift(webhookEvent);
    
    // Manter apenas os eventos mais recentes
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents = this.recentEvents.slice(0, this.maxRecentEvents);
    }
  }

  /**
   * Retorna estatísticas do webhook
   */
  async getWebhookStats(): Promise<WebhookStats & { recent_events: WebhookEvent[] }> {
    return {
      ...this.stats,
      recent_events: this.recentEvents.slice(0, 10), // Últimos 10 eventos
    };
  }

  /**
   * Valida estrutura do evento recebido
   */
  validateEventStructure(event: any): boolean {
    if (!event || typeof event !== 'object') {
      return false;
    }

    const requiredFields = ['id', 'type', 'source', 'timestamp', 'data'];
    
    for (const field of requiredFields) {
      if (!(field in event)) {
        return false;
      }
    }

    // Validar tipos específicos
    if (typeof event.id !== 'string' || event.id.length === 0) {
      return false;
    }

    if (typeof event.type !== 'string' || event.type.length === 0) {
      return false;
    }

    if (typeof event.source !== 'string' || event.source.length === 0) {
      return false;
    }

    // Validar timestamp
    const timestamp = new Date(event.timestamp);
    if (isNaN(timestamp.getTime())) {
      return false;
    }

    return true;
  }

  /**
   * Valida se o evento não é muito antigo
   */
  validateEventTimestamp(event: any, maxAgeMinutes: number = 30): boolean {
    try {
      const eventTime = new Date(event.timestamp);
      const now = new Date();
      const ageMinutes = (now.getTime() - eventTime.getTime()) / (1000 * 60);
      
      return ageMinutes <= maxAgeMinutes;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifica se o evento já foi processado (prevenção de duplicatas)
   */
  async checkDuplicateEvent(eventId: string): Promise<boolean> {
    try {
      // Verificar nos eventos recentes em memória
      const recentDuplicate = this.recentEvents.some(event => event.id === eventId);
      if (recentDuplicate) {
        return true;
      }

      // Verificar no banco de dados via EventService
      const existingEvent = await this.eventService.getEventByExternalId(eventId);
      return existingEvent !== null;
    } catch (error) {
      console.error('Error checking duplicate event:', error);
      return false;
    }
  }

  /**
   * Processa webhook com validações completas
   */
  async processWebhookSafely(
    eventData: any,
    signature: string,
    processor: (event: any) => Promise<void>
  ): Promise<{ success: boolean; error?: string; processing_time_ms: number }> {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;

    try {
      // 1. Validar assinatura
      if (!this.verifySignature(JSON.stringify(eventData), signature)) {
        throw new Error('Invalid webhook signature');
      }

      // 2. Validar estrutura do evento
      if (!this.validateEventStructure(eventData.event)) {
        throw new Error('Invalid event structure');
      }

      // 3. Validar timestamp
      if (!this.validateEventTimestamp(eventData.event)) {
        throw new Error('Event timestamp too old');
      }

      // 4. Verificar duplicatas
      const isDuplicate = await this.checkDuplicateEvent(eventData.event.id);
      if (isDuplicate) {
        throw new Error('Duplicate event detected');
      }

      // 5. Processar evento
      await processor(eventData.event);
      
      success = true;

    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      const processingTime = Date.now() - startTime;
      
      // Registrar evento processado
      this.recordWebhookEvent(
        eventData.event?.id || 'unknown',
        eventData.event?.type || 'unknown',
        eventData.event?.source || 'unknown',
        processingTime,
        success,
        errorMessage
      );

      return {
        success,
        error: errorMessage,
        processing_time_ms: processingTime,
      };
    }
  }

  /**
   * Limpa estatísticas (útil para testes)
   */
  resetStats(): void {
    this.stats = {
      total_events_received: 0,
      events_by_type: {},
      last_event_received: null,
      average_processing_time_ms: 0,
      failed_events: 0,
      success_rate: 100,
    };
    this.recentEvents = [];
  }

  /**
   * Configura nova chave secreta
   */
  setSecretKey(secretKey: string): void {
    this.secretKey = secretKey;
  }

  /**
   * Retorna eventos recentes filtrados por tipo
   */
  getRecentEventsByType(eventType: string, limit: number = 10): WebhookEvent[] {
    return this.recentEvents
      .filter(event => event.type === eventType)
      .slice(0, limit);
  }

  /**
   * Retorna eventos recentes com falha
   */
  getFailedEvents(limit: number = 10): WebhookEvent[] {
    return this.recentEvents
      .filter(event => !event.success)
      .slice(0, limit);
  }

  /**
   * Calcula taxa de sucesso por tipo de evento
   */
  getSuccessRateByType(): Record<string, number> {
    const successRates: Record<string, number> = {};
    
    for (const eventType in this.stats.events_by_type) {
      const totalEvents = this.recentEvents.filter(e => e.type === eventType).length;
      const successfulEvents = this.recentEvents.filter(e => e.type === eventType && e.success).length;
      
      if (totalEvents > 0) {
        successRates[eventType] = (successfulEvents / totalEvents) * 100;
      }
    }
    
    return successRates;
  }

  /**
   * Retorna métricas de performance
   */
  getPerformanceMetrics(): {
    average_processing_time_ms: number;
    min_processing_time_ms: number;
    max_processing_time_ms: number;
    p95_processing_time_ms: number;
  } {
    if (this.recentEvents.length === 0) {
      return {
        average_processing_time_ms: 0,
        min_processing_time_ms: 0,
        max_processing_time_ms: 0,
        p95_processing_time_ms: 0,
      };
    }

    const processingTimes = this.recentEvents.map(e => e.processing_time_ms).sort((a, b) => a - b);
    
    return {
      average_processing_time_ms: this.stats.average_processing_time_ms,
      min_processing_time_ms: processingTimes[0],
      max_processing_time_ms: processingTimes[processingTimes.length - 1],
      p95_processing_time_ms: processingTimes[Math.floor(processingTimes.length * 0.95)],
    };
  }
}

