// ===============================================
// WEBHOOK CONTROLLER - AFFILIATE SERVICE
// ===============================================

import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { WebhookService } from '../services/webhook.service';
import { CommissionService } from '../services/commission.service';
import { EventService } from '../services/event.service';
import { AuditService } from '../services/audit.service';
import { 
  DataServiceEvent, 
  CPAValidationEvent, 
  CommissionCalculationEvent,
  TransactionProcessedEvent,
  ApiResponse 
} from '../types';

export class WebhookController {
  private webhookService: WebhookService;
  private commissionService: CommissionService;
  private eventService: EventService;
  private auditService: AuditService;

  constructor(
    webhookService: WebhookService,
    commissionService: CommissionService,
    eventService: EventService,
    auditService: AuditService
  ) {
    this.webhookService = webhookService;
    this.commissionService = commissionService;
    this.eventService = eventService;
    this.auditService = auditService;
  }

  /**
   * Webhook principal para receber eventos do Data Service
   */
  async handleDataServiceWebhook(
    request: FastifyRequest<{
      Body: {
        event: DataServiceEvent;
        timestamp: string;
        source: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Verificar assinatura do webhook
      const signature = request.headers['x-webhook-signature'] as string;
      const eventType = request.headers['x-event-type'] as string;
      const eventId = request.headers['x-event-id'] as string;

      if (!signature || !eventType || !eventId) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_HEADERS',
            message: 'Headers obrigatórios ausentes',
          },
          timestamp: new Date(),
          request_id: request.id,
        } as ApiResponse);
        return;
      }

      // Validar assinatura
      const isValidSignature = this.webhookService.verifySignature(
        JSON.stringify(request.body),
        signature
      );

      if (!isValidSignature) {
        await this.auditService.logSecurityEvent({
          type: 'INVALID_WEBHOOK_SIGNATURE',
          source: 'data-service',
          event_id: eventId,
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          timestamp: new Date(),
        });

        reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Assinatura inválida',
          },
          timestamp: new Date(),
          request_id: request.id,
        } as ApiResponse);
        return;
      }

      const { event } = request.body;

      // Log do evento recebido
      request.log.info('Webhook event received', {
        event_id: event.id,
        event_type: event.type,
        source: event.source,
        processing_time_ms: Date.now() - startTime,
      });

      // Processar evento baseado no tipo
      await this.processEvent(event, request);

      // Resposta de sucesso
      reply.send({
        success: true,
        data: {
          event_id: event.id,
          processed_at: new Date(),
          processing_time_ms: Date.now() - startTime,
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      request.log.error('Error processing webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: Date.now() - startTime,
      });

      reply.status(500).send({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: 'Erro ao processar webhook',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }

  /**
   * Processa evento baseado no tipo
   */
  private async processEvent(event: DataServiceEvent, request: FastifyRequest): Promise<void> {
    switch (event.type) {
      case 'cpa.validation.completed':
        await this.handleCPAValidationCompleted(event as CPAValidationEvent, request);
        break;

      case 'commission.calculation.requested':
        await this.handleCommissionCalculationRequested(event as CommissionCalculationEvent, request);
        break;

      case 'transaction.processed':
        await this.handleTransactionProcessed(event as TransactionProcessedEvent, request);
        break;

      default:
        request.log.warn('Unknown event type received', {
          event_id: event.id,
          event_type: event.type,
        });
    }
  }

  /**
   * Processa evento de validação CPA concluída
   */
  private async handleCPAValidationCompleted(
    event: CPAValidationEvent,
    request: FastifyRequest
  ): Promise<void> {
    try {
      const { data: validationResult } = event;

      request.log.info('Processing CPA validation completed', {
        event_id: event.id,
        customer_id: validationResult.customer_id,
        affiliate_id: validationResult.affiliate_id,
        model: validationResult.model,
        validation_passed: validationResult.validation_passed,
      });

      // Registrar evento no sistema
      await this.eventService.recordEvent({
        type: 'CPA_VALIDATION_COMPLETED',
        affiliate_id: validationResult.affiliate_id,
        customer_id: validationResult.customer_id,
        data: validationResult,
        source: 'data-service',
        external_id: event.id,
      });

      // Se a validação passou, preparar para processamento de comissão
      if (validationResult.validation_passed && validationResult.commission_eligible) {
        await this.commissionService.prepareCPACommission(validationResult);
      }

    } catch (error) {
      request.log.error('Error handling CPA validation completed', {
        event_id: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Processa evento de cálculo de comissão solicitado
   */
  private async handleCommissionCalculationRequested(
    event: CommissionCalculationEvent,
    request: FastifyRequest
  ): Promise<void> {
    try {
      const { data: commissionData } = event;

      request.log.info('Processing commission calculation requested', {
        event_id: event.id,
        customer_id: commissionData.customer_id,
        affiliate_id: commissionData.affiliate_id,
        commission_amount: commissionData.commission_amount,
        hierarchy_levels: commissionData.hierarchy_levels.length,
      });

      // Registrar evento no sistema
      await this.eventService.recordEvent({
        type: 'COMMISSION_CALCULATION_REQUESTED',
        affiliate_id: commissionData.affiliate_id,
        customer_id: commissionData.customer_id,
        data: commissionData,
        source: 'data-service',
        external_id: event.id,
      });

      // Processar comissões CPA
      const result = await this.commissionService.processCPACommissions(commissionData);

      request.log.info('Commission calculation completed', {
        event_id: event.id,
        customer_id: commissionData.customer_id,
        total_distributed: result.total_distributed,
        commissions_created: result.commissions_created,
      });

    } catch (error) {
      request.log.error('Error handling commission calculation requested', {
        event_id: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Processa evento de transação processada
   */
  private async handleTransactionProcessed(
    event: TransactionProcessedEvent,
    request: FastifyRequest
  ): Promise<void> {
    try {
      const { data } = event;

      request.log.info('Processing transaction processed', {
        event_id: event.id,
        transaction_id: data.transaction.id,
        customer_id: data.transaction.customer_id,
        affiliate_id: data.transaction.affiliate_id,
        type: data.transaction.type,
        amount: data.transaction.amount,
        validation_triggered: data.validation_triggered,
      });

      // Registrar evento no sistema
      await this.eventService.recordEvent({
        type: 'TRANSACTION_PROCESSED',
        affiliate_id: data.transaction.affiliate_id,
        customer_id: data.transaction.customer_id,
        data: data,
        source: 'data-service',
        external_id: event.id,
      });

      // Atualizar métricas do afiliado se necessário
      if (data.validation_triggered) {
        await this.commissionService.updateAffiliateMetrics(
          data.transaction.affiliate_id,
          data.transaction
        );
      }

    } catch (error) {
      request.log.error('Error handling transaction processed', {
        event_id: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Endpoint para testar conectividade do webhook
   */
  async testWebhook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const testEvent = {
        id: `test_${Date.now()}`,
        type: 'webhook.test',
        source: 'affiliate-service',
        timestamp: new Date(),
        data: {
          message: 'Teste de conectividade do webhook',
          timestamp: new Date(),
        },
      };

      reply.send({
        success: true,
        data: {
          message: 'Webhook funcionando corretamente',
          test_event: testEvent,
          server_time: new Date(),
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      request.log.error('Error in webhook test', { error });
      reply.status(500).send({
        success: false,
        error: {
          code: 'WEBHOOK_TEST_ERROR',
          message: 'Erro no teste do webhook',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }

  /**
   * Endpoint para obter estatísticas do webhook
   */
  async getWebhookStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const stats = await this.webhookService.getWebhookStats();

      reply.send({
        success: true,
        data: stats,
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      request.log.error('Error getting webhook stats', { error });
      reply.status(500).send({
        success: false,
        error: {
          code: 'WEBHOOK_STATS_ERROR',
          message: 'Erro ao obter estatísticas do webhook',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }

  /**
   * Endpoint para reprocessar evento manualmente
   */
  async reprocessEvent(
    request: FastifyRequest<{
      Body: { event: DataServiceEvent };
      Params: { eventId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { eventId } = request.params;
      const { event } = request.body;

      request.log.info('Manual event reprocessing requested', {
        event_id: eventId,
        event_type: event.type,
      });

      // Processar evento
      await this.processEvent(event, request);

      reply.send({
        success: true,
        data: {
          event_id: eventId,
          reprocessed_at: new Date(),
          message: 'Evento reprocessado com sucesso',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);

    } catch (error) {
      request.log.error('Error reprocessing event', {
        event_id: request.params.eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      reply.status(500).send({
        success: false,
        error: {
          code: 'EVENT_REPROCESSING_ERROR',
          message: 'Erro ao reprocessar evento',
        },
        timestamp: new Date(),
        request_id: request.id,
      } as ApiResponse);
    }
  }
}

