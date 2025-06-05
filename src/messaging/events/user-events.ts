/**
 * Eventos relacionados a usuários
 */
import { Event } from '../types/event';
import { Publisher } from '../base-publisher';

/**
 * Evento de usuário criado
 */
export interface UserCreatedEvent extends Event {
  subject: 'user:created';
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
}

/**
 * Evento de usuário atualizado
 */
export interface UserUpdatedEvent extends Event {
  subject: 'user:updated';
  data: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
    updatedAt: string;
  };
}

/**
 * Evento de usuário excluído
 */
export interface UserDeletedEvent extends Event {
  subject: 'user:deleted';
  data: {
    id: string;
    deletedAt: string;
  };
}

/**
 * Publisher para evento de usuário criado
 */
export class UserCreatedPublisher extends Publisher<UserCreatedEvent> {
  subject: UserCreatedEvent['subject'] = 'user:created';
  protected override version: number = 1;
}

/**
 * Publisher para evento de usuário atualizado
 */
export class UserUpdatedPublisher extends Publisher<UserUpdatedEvent> {
  subject: UserUpdatedEvent['subject'] = 'user:updated';
  protected override version: number = 1;
}

/**
 * Publisher para evento de usuário excluído
 */
export class UserDeletedPublisher extends Publisher<UserDeletedEvent> {
  subject: UserDeletedEvent['subject'] = 'user:deleted';
  protected override version: number = 1;
}

