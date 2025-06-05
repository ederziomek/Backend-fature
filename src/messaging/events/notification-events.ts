/**
 * Eventos relacionados a notificações
 */
import { Event } from '../types/event';
import { Publisher } from '../base-publisher';

/**
 * Tipo de notificação
 */
export type NotificationType = 
  | 'email'
  | 'sms'
  | 'push'
  | 'whatsapp'
  | 'in-app';

/**
 * Prioridade da notificação
 */
export type NotificationPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent';

/**
 * Evento de notificação criada
 */
export interface NotificationCreatedEvent extends Event {
  subject: 'notification:created';
  data: {
    id: string;
    userId?: string;
    clientId?: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    content: string;
    metadata?: Record<string, any>;
    createdAt: string;
  };
}

/**
 * Evento de notificação enviada
 */
export interface NotificationSentEvent extends Event {
  subject: 'notification:sent';
  data: {
    id: string;
    userId?: string;
    clientId?: string;
    type: NotificationType;
    sentAt: string;
    deliveryStatus: 'sent' | 'delivered' | 'failed';
    errorMessage?: string;
  };
}

/**
 * Evento de notificação lida
 */
export interface NotificationReadEvent extends Event {
  subject: 'notification:read';
  data: {
    id: string;
    userId?: string;
    clientId?: string;
    readAt: string;
  };
}

/**
 * Publisher para evento de notificação criada
 */
export class NotificationCreatedPublisher extends Publisher<NotificationCreatedEvent> {
  subject: NotificationCreatedEvent['subject'] = 'notification:created';
  protected override version: number = 1;
}

/**
 * Publisher para evento de notificação enviada
 */
export class NotificationSentPublisher extends Publisher<NotificationSentEvent> {
  subject: NotificationSentEvent['subject'] = 'notification:sent';
  protected override version: number = 1;
}

/**
 * Publisher para evento de notificação lida
 */
export class NotificationReadPublisher extends Publisher<NotificationReadEvent> {
  subject: NotificationReadEvent['subject'] = 'notification:read';
  protected override version: number = 1;
}

