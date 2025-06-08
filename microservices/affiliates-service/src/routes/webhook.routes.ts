// ===============================================
// ROTAS DE WEBHOOK - AFFILIATE SERVICE
// ===============================================

import { FastifyInstance } from 'fastify';
import { WebhookController } from '../controllers/webhook.controller';

export async function webhookRoutes(
  fastify: FastifyInstance,
  controller: WebhookController
): Promise<void> {
  
  // ===============================================
  // WEBHOOK PRINCIPAL DO DATA SERVICE
  // ===============================================
  
  fastify.post('/webhooks/data-service', {
    schema: {
      description: 'Webhook para receber eventos do Data Service',
      tags: ['Webhooks'],
      headers: {
        type: 'object',
        properties: {
          'x-webhook-signature': { type: 'string' },
          'x-event-type': { type: 'string' },
          'x-event-id': { type: 'string' },
        },
        required: ['x-webhook-signature', 'x-event-type', 'x-event-id']
      },
      body: {
        type: 'object',
        properties: {
          event: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              source: { type: 'string' },
              timestamp: { type: 'string' },
              data: { type: 'object' }
            },
            required: ['id', 'type', 'source', 'timestamp', 'data']
          },
          timestamp: { type: 'string' },
          source: { type: 'string' }
        },
        required: ['event', 'timestamp', 'source']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                event_id: { type: 'string' },
                processed_at: { type: 'string' },
                processing_time_ms: { type: 'number' }
              }
            },
            timestamp: { type: 'string' },
            request_id: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            },
            timestamp: { type: 'string' },
            request_id: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            },
            timestamp: { type: 'string' },
            request_id: { type: 'string' }
          }
        }
      }
    }
  }, controller.handleDataServiceWebhook.bind(controller));

  // ===============================================
  // TESTE DE CONECTIVIDADE
  // ===============================================
  
  fastify.get('/webhooks/test', {
    schema: {
      description: 'Teste de conectividade do webhook',
      tags: ['Webhooks'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                test_event: { type: 'object' },
                server_time: { type: 'string' }
              }
            },
            timestamp: { type: 'string' },
            request_id: { type: 'string' }
          }
        }
      }
    }
  }, controller.testWebhook.bind(controller));

  // ===============================================
  // ESTATÍSTICAS DO WEBHOOK
  // ===============================================
  
  fastify.get('/webhooks/stats', {
    schema: {
      description: 'Obter estatísticas do webhook',
      tags: ['Webhooks'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total_events_received: { type: 'number' },
                events_by_type: { type: 'object' },
                last_event_received: { type: 'string' },
                average_processing_time_ms: { type: 'number' },
                failed_events: { type: 'number' },
                success_rate: { type: 'number' },
                recent_events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      type: { type: 'string' },
                      source: { type: 'string' },
                      timestamp: { type: 'string' },
                      processing_time_ms: { type: 'number' },
                      success: { type: 'boolean' },
                      error_message: { type: 'string' }
                    }
                  }
                }
              }
            },
            timestamp: { type: 'string' },
            request_id: { type: 'string' }
          }
        }
      }
    }
  }, controller.getWebhookStats.bind(controller));

  // ===============================================
  // REPROCESSAMENTO MANUAL
  // ===============================================
  
  fastify.post('/webhooks/reprocess/:eventId', {
    schema: {
      description: 'Reprocessar evento manualmente',
      tags: ['Webhooks'],
      params: {
        type: 'object',
        properties: {
          eventId: { type: 'string' }
        },
        required: ['eventId']
      },
      body: {
        type: 'object',
        properties: {
          event: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              source: { type: 'string' },
              timestamp: { type: 'string' },
              data: { type: 'object' }
            },
            required: ['id', 'type', 'source', 'timestamp', 'data']
          }
        },
        required: ['event']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                event_id: { type: 'string' },
                reprocessed_at: { type: 'string' },
                message: { type: 'string' }
              }
            },
            timestamp: { type: 'string' },
            request_id: { type: 'string' }
          }
        }
      }
    }
  }, controller.reprocessEvent.bind(controller));
}

