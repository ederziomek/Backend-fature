/**
 * Eventos relacionados a produtos
 */
import { Event } from '../types/event';
import { Publisher } from '../base-publisher';

/**
 * Evento de produto criado
 */
export interface ProductCreatedEvent extends Event {
  subject: 'product:created';
  data: {
    id: string;
    name: string;
    description?: string;
    price: number;
    sku?: string;
    barcode?: string;
    category?: string;
    stock?: number;
    unit?: string;
    createdAt: string;
  };
}

/**
 * Evento de produto atualizado
 */
export interface ProductUpdatedEvent extends Event {
  subject: 'product:updated';
  data: {
    id: string;
    name?: string;
    description?: string;
    price?: number;
    sku?: string;
    barcode?: string;
    category?: string;
    stock?: number;
    unit?: string;
    updatedAt: string;
  };
}

/**
 * Evento de produto excluído
 */
export interface ProductDeletedEvent extends Event {
  subject: 'product:deleted';
  data: {
    id: string;
    deletedAt: string;
  };
}

/**
 * Evento de estoque atualizado
 */
export interface ProductStockUpdatedEvent extends Event {
  subject: 'product:stock-updated';
  data: {
    id: string;
    previousStock: number;
    currentStock: number;
    operation: 'add' | 'subtract' | 'set';
    reason?: string;
    updatedAt: string;
  };
}

/**
 * Publisher para evento de produto criado
 */
export class ProductCreatedPublisher extends Publisher<ProductCreatedEvent> {
  subject: ProductCreatedEvent['subject'] = 'product:created';
  protected override version: number = 1;
}

/**
 * Publisher para evento de produto atualizado
 */
export class ProductUpdatedPublisher extends Publisher<ProductUpdatedEvent> {
  subject: ProductUpdatedEvent['subject'] = 'product:updated';
  protected override version: number = 1;
}

/**
 * Publisher para evento de produto excluído
 */
export class ProductDeletedPublisher extends Publisher<ProductDeletedEvent> {
  subject: ProductDeletedEvent['subject'] = 'product:deleted';
  protected override version: number = 1;
}

/**
 * Publisher para evento de estoque atualizado
 */
export class ProductStockUpdatedPublisher extends Publisher<ProductStockUpdatedEvent> {
  subject: ProductStockUpdatedEvent['subject'] = 'product:stock-updated';
  protected override version: number = 1;
}

