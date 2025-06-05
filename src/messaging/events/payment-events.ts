/**
 * Eventos relacionados a pagamentos
 */
import { Event } from '../types/event';
import { Publisher } from '../base-publisher';

/**
 * Status possíveis para um pagamento
 */
export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

/**
 * Evento de pagamento criado
 */
export interface PaymentCreatedEvent extends Event {
  subject: 'payment:created';
  data: {
    id: string;
    orderId: string;
    clientId: string;
    amount: number;
    paymentMethod: string;
    status: PaymentStatus;
    externalReference?: string;
    createdAt: string;
  };
}

/**
 * Evento de status de pagamento atualizado
 */
export interface PaymentStatusUpdatedEvent extends Event {
  subject: 'payment:status-updated';
  data: {
    id: string;
    orderId: string;
    previousStatus: PaymentStatus;
    currentStatus: PaymentStatus;
    updatedAt: string;
    reason?: string;
  };
}

/**
 * Evento de pagamento confirmado
 */
export interface PaymentConfirmedEvent extends Event {
  subject: 'payment:confirmed';
  data: {
    id: string;
    orderId: string;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    confirmedAt: string;
  };
}

/**
 * Evento de pagamento falhou
 */
export interface PaymentFailedEvent extends Event {
  subject: 'payment:failed';
  data: {
    id: string;
    orderId: string;
    errorCode?: string;
    errorMessage?: string;
    failedAt: string;
  };
}

/**
 * Evento de pagamento reembolsado
 */
export interface PaymentRefundedEvent extends Event {
  subject: 'payment:refunded';
  data: {
    id: string;
    orderId: string;
    amount: number;
    reason?: string;
    refundedAt: string;
  };
}

/**
 * Publisher para evento de pagamento criado
 */
export class PaymentCreatedPublisher extends Publisher<PaymentCreatedEvent> {
  subject: PaymentCreatedEvent['subject'] = 'payment:created';
  protected override version: number = 1;
}

/**
 * Publisher para evento de status de pagamento atualizado
 */
export class PaymentStatusUpdatedPublisher extends Publisher<PaymentStatusUpdatedEvent> {
  subject: PaymentStatusUpdatedEvent['subject'] = 'payment:status-updated';
  protected override version: number = 1;
}

/**
 * Publisher para evento de pagamento confirmado
 */
export class PaymentConfirmedPublisher extends Publisher<PaymentConfirmedEvent> {
  subject: PaymentConfirmedEvent['subject'] = 'payment:confirmed';
  protected override version: number = 1;
}

/**
 * Publisher para evento de pagamento falhou
 */
export class PaymentFailedPublisher extends Publisher<PaymentFailedEvent> {
  subject: PaymentFailedEvent['subject'] = 'payment:failed';
  protected override version: number = 1;
}

/**
 * Publisher para evento de pagamento reembolsado
 */
export class PaymentRefundedPublisher extends Publisher<PaymentRefundedEvent> {
  subject: PaymentRefundedEvent['subject'] = 'payment:refunded';
  protected override version: number = 1;
}

