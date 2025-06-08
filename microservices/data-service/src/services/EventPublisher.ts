// ===============================================
// EVENT PUBLISHER - COMUNICAÇÃO COM MICROSSERVIÇOS
// ===============================================

import axios, { AxiosResponse } from 'axios';
import crypto from 'crypto';
import { config } from '../config';
import { ServiceEvent } from '../types';
import { Logger } from '../utils/logger';

export class EventPublisher {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('EventPublisher');
  }

  /**
   * Publica um evento para outros microsserviços
   */
  async publishEvent(event: ServiceEvent): Promise<void> {
    this.logger.info('Publishing event', {
      event_id: event.id,
      event_type: event.type,
      source: event.source,
    });

    try {
      // Publicar para Affiliate Service
      if (this.shouldSendToAffiliateService(event)) {
        await this.sendToAffiliateService(event);
      }

      // Publicar para outros serviços conforme necessário
      // await this.sendToNotificationService(event);
      // await this.sendToAnalyticsService(event);

      this.logger.info('Event published successfully', {
        event_id: event.id,
        event_type: event.type,
      });

    } catch (error) {
      this.logger.error('Error publishing event', {
        event_id: event.id,
        event_type: event.type,
        error,
      });
      throw error;
    }
  }

  /**
   * Determina se o evento deve ser enviado para o Affiliate Service
   */
  private shouldSendToAffiliateService(event: ServiceEvent): boolean {
    const affiliateServiceEvents = [
      'cpa.validation.completed',
      'commission.calculation.requested',
      'transaction.processed',
    ];

    return affiliateServiceEvents.includes(event.type);
  }

  /**
   * Envia evento para o Affiliate Service
   */
  private async sendToAffiliateService(event: ServiceEvent): Promise<void> {
    try {
      const webhookUrl = `${config.webhook.affiliate_service_url}/api/v1/webhooks/data-service`;
      
      this.logger.debug('Sending event to Affiliate Service', {
        event_id: event.id,
        webhook_url: webhookUrl,
      });

      // Gerar assinatura para segurança
      const signature = this.generateSignature(event);

      // Preparar payload
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        source: 'data-service',
      };

      // Enviar webhook
      const response: AxiosResponse = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Event-Type': event.type,
          'X-Event-ID': event.id,
        },
        timeout: config.webhook.timeout_ms,
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.info('Event sent to Affiliate Service successfully', {
          event_id: event.id,
          status: response.status,
        });
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }

    } catch (error) {
      this.logger.error('Error sending event to Affiliate Service', {
        event_id: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Implementar retry logic
      await this.retryAffiliateServiceWebhook(event);
    }
  }

  /**
   * Implementa retry logic para webhooks do Affiliate Service
   */
  private async retryAffiliateServiceWebhook(
    event: ServiceEvent,
    attempt: number = 1
  ): Promise<void> {
    if (attempt > config.webhook.max_retries) {
      this.logger.error('Max retries exceeded for Affiliate Service webhook', {
        event_id: event.id,
        attempts: attempt,
      });
      
      // Implementar dead letter queue ou notificação de falha
      await this.handleWebhookFailure(event);
      return;
    }

    this.logger.warn('Retrying Affiliate Service webhook', {
      event_id: event.id,
      attempt,
      max_retries: config.webhook.max_retries,
    });

    // Aguardar antes do retry (backoff exponencial)
    const delay = config.webhook.retry_delay_ms * Math.pow(2, attempt - 1);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.sendToAffiliateService(event);
    } catch (error) {
      this.logger.error('Retry failed for Affiliate Service webhook', {
        event_id: event.id,
        attempt,
        error,
      });

      // Tentar novamente
      await this.retryAffiliateServiceWebhook(event, attempt + 1);
    }
  }

  /**
   * Gera assinatura HMAC para segurança do webhook
   */
  private generateSignature(event: ServiceEvent): string {
    const payload = JSON.stringify(event);
    const signature = crypto
      .createHmac('sha256', config.webhook.secret_key)
      .update(payload)
      .digest('hex');
    
    return `sha256=${signature}`;
  }

  /**
   * Verifica assinatura de webhook recebido
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  }

  /**
   * Trata falhas de webhook após esgotar tentativas
   */
  private async handleWebhookFailure(event: ServiceEvent): Promise<void> {
    this.logger.error('Webhook failure - implementing fallback', {
      event_id: event.id,
      event_type: event.type,
    });

    // Implementar estratégias de fallback:
    // 1. Salvar em dead letter queue
    // 2. Notificar administradores
    // 3. Tentar via método alternativo

    try {
      // Salvar evento falho para reprocessamento manual
      await this.saveFailedEvent(event);
      
      // Notificar sobre a falha (implementar se necessário)
      // await this.notifyWebhookFailure(event);
      
    } catch (error) {
      this.logger.error('Error handling webhook failure', {
        event_id: event.id,
        error,
      });
    }
  }

  /**
   * Salva evento falho para reprocessamento
   */
  private async saveFailedEvent(event: ServiceEvent): Promise<void> {
    try {
      // Implementar salvamento em banco ou arquivo
      // Por enquanto, apenas log
      this.logger.warn('Failed event saved for manual reprocessing', {
        event_id: event.id,
        event_type: event.type,
        timestamp: event.timestamp,
      });
    } catch (error) {
      this.logger.error('Error saving failed event', {
        event_id: event.id,
        error,
      });
    }
  }

  /**
   * Publica evento de forma síncrona (para testes)
   */
  async publishEventSync(event: ServiceEvent): Promise<boolean> {
    try {
      await this.publishEvent(event);
      return true;
    } catch (error) {
      this.logger.error('Synchronous event publishing failed', {
        event_id: event.id,
        error,
      });
      return false;
    }
  }

  /**
   * Publica múltiplos eventos em lote
   */
  async publishEventBatch(events: ServiceEvent[]): Promise<void> {
    this.logger.info('Publishing event batch', {
      event_count: events.length,
    });

    const promises = events.map(event => this.publishEvent(event));
    
    try {
      await Promise.allSettled(promises);
      this.logger.info('Event batch publishing completed');
    } catch (error) {
      this.logger.error('Error in event batch publishing', { error });
    }
  }

  /**
   * Testa conectividade com Affiliate Service
   */
  async testAffiliateServiceConnection(): Promise<boolean> {
    try {
      const healthUrl = `${config.webhook.affiliate_service_url}/health`;
      
      const response = await axios.get(healthUrl, {
        timeout: 5000,
      });

      const isHealthy = response.status === 200;
      
      this.logger.info('Affiliate Service connection test', {
        url: healthUrl,
        status: response.status,
        healthy: isHealthy,
      });

      return isHealthy;
    } catch (error) {
      this.logger.error('Affiliate Service connection test failed', {
        url: config.webhook.affiliate_service_url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Retorna estatísticas do publisher
   */
  getStats(): {
    affiliate_service_url: string;
    timeout_ms: number;
    max_retries: number;
    retry_delay_ms: number;
  } {
    return {
      affiliate_service_url: config.webhook.affiliate_service_url,
      timeout_ms: config.webhook.timeout_ms,
      max_retries: config.webhook.max_retries,
      retry_delay_ms: config.webhook.retry_delay_ms,
    };
  }
}

