/**
 * Eventos relacionados a pedidos
 */
import { Event } from '../types/event';
import { Publisher } from '../base-publisher';

/**
 * Status possíveis para um pedido
 */
export type OrderStatus = 
  | 'created'
  | 'pending'
  | 'processing'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

/**
 * Item de um pedido
 */
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Evento de pedido criado
 */
export interface OrderCreatedEvent extends Event {
  subject: 'order:created';
  data: {
    id: string;
    clientId: string;
    items: OrderItem[];
    subtotal: number;
    discount?: number;
    shipping?: number;
    tax?: number;
    total: number;
    status: OrderStatus;
    paymentMethod?: string;
    notes?: string;
    createdAt: string;
  };
}

/**
 * Evento de status de pedido atualizado
 */
export interface OrderStatusUpdatedEvent extends Event {
  subject: 'order:status-updated';
  data: {
    id: string;
    previousStatus: OrderStatus;
    currentStatus: OrderStatus;
    updatedAt: string;
    reason?: string;
  };
}

/**
 * Evento de pedido pago
 */
export interface OrderPaidEvent extends Event {
  subject: 'order:paid';
  data: {
    id: string;
    paymentId: string;
    paymentMethod: string;
    amount: number;
    paidAt: string;
  };
}

/**
 * Evento de pedido cancelado
 */
export interface OrderCancelledEvent extends Event {
  subject: 'order:cancelled';
  data: {
    id: string;
    reason?: string;
    cancelledAt: string;
  };
}

/**
 * Publisher para evento de pedido criado
 */
export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
  subject: OrderCreatedEvent['subject'] = 'order:created';
  protected override version: number = 1;
}

/**
 * Publisher para evento de status de pedido atualizado
 */
export class OrderStatusUpdatedPublisher extends Publisher<OrderStatusUpdatedEvent> {
  subject: OrderStatusUpdatedEvent['subject'] = 'order:status-updated';
  protected override version: number = 1;
}

/**
 * Publisher para evento de pedido pago
 */
export class OrderPaidPublisher extends Publisher<OrderPaidEvent> {
  subject: OrderPaidEvent['subject'] = 'order:paid';
  protected override version: number = 1;
}

/**
 * Publisher para evento de pedido cancelado
 */
export class OrderCancelledPublisher extends Publisher<OrderCancelledEvent> {
  subject: OrderCancelledEvent['subject'] = 'order:cancelled';
  protected override version: number = 1;
}

