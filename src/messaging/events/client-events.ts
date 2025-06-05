/**
 * Eventos relacionados a clientes
 */
import { Event } from '../types/event';
import { Publisher } from '../base-publisher';

/**
 * Evento de cliente criado
 */
export interface ClientCreatedEvent extends Event {
  subject: 'client:created';
  data: {
    id: string;
    name: string;
    document: string;
    email: string;
    phone?: string;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    createdAt: string;
  };
}

/**
 * Evento de cliente atualizado
 */
export interface ClientUpdatedEvent extends Event {
  subject: 'client:updated';
  data: {
    id: string;
    name?: string;
    document?: string;
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    updatedAt: string;
  };
}

/**
 * Evento de cliente excluído
 */
export interface ClientDeletedEvent extends Event {
  subject: 'client:deleted';
  data: {
    id: string;
    deletedAt: string;
  };
}

/**
 * Publisher para evento de cliente criado
 */
export class ClientCreatedPublisher extends Publisher<ClientCreatedEvent> {
  subject: ClientCreatedEvent['subject'] = 'client:created';
  protected override version: number = 1;
}

/**
 * Publisher para evento de cliente atualizado
 */
export class ClientUpdatedPublisher extends Publisher<ClientUpdatedEvent> {
  subject: ClientUpdatedEvent['subject'] = 'client:updated';
  protected override version: number = 1;
}

/**
 * Publisher para evento de cliente excluído
 */
export class ClientDeletedPublisher extends Publisher<ClientDeletedEvent> {
  subject: ClientDeletedEvent['subject'] = 'client:deleted';
  protected override version: number = 1;
}

