import { EventEmitter } from 'events';
import { 
  UserCreatedEvent, 
  UserLoginEvent, 
  UserLogoutEvent,
  UserUpdatedEvent,
  SessionCreatedEvent,
  SessionExpiredEvent,
  SecurityAlertEvent
} from '@/types/events';

class EventServiceClass extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Aumentar limite de listeners
  }

  /**
   * Publica evento de usuário criado
   */
  async publishUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      this.emit('user.created', event);
      
      // Aqui seria integrado com sistema de mensageria (RabbitMQ, Kafka, etc.)
      // await this.publishToMessageBroker('user.created', event);
      
      console.log('Event published: user.created', { userId: event.userId });
    } catch (error) {
      console.error('Erro ao publicar evento user.created:', error);
    }
  }

  /**
   * Publica evento de login de usuário
   */
  async publishUserLogin(event: UserLoginEvent): Promise<void> {
    try {
      this.emit('user.login', event);
      
      // Integração com sistema de mensageria
      // await this.publishToMessageBroker('user.login', event);
      
      console.log('Event published: user.login', { userId: event.userId });
    } catch (error) {
      console.error('Erro ao publicar evento user.login:', error);
    }
  }

  /**
   * Publica evento de logout de usuário
   */
  async publishUserLogout(event: UserLogoutEvent): Promise<void> {
    try {
      this.emit('user.logout', event);
      
      // Integração com sistema de mensageria
      // await this.publishToMessageBroker('user.logout', event);
      
      console.log('Event published: user.logout', { userId: event.userId });
    } catch (error) {
      console.error('Erro ao publicar evento user.logout:', error);
    }
  }

  /**
   * Publica evento de usuário atualizado
   */
  async publishUserUpdated(event: UserUpdatedEvent): Promise<void> {
    try {
      this.emit('user.updated', event);
      
      // Integração com sistema de mensageria
      // await this.publishToMessageBroker('user.updated', event);
      
      console.log('Event published: user.updated', { userId: event.userId });
    } catch (error) {
      console.error('Erro ao publicar evento user.updated:', error);
    }
  }

  /**
   * Publica evento de sessão criada
   */
  async publishSessionCreated(event: SessionCreatedEvent): Promise<void> {
    try {
      this.emit('session.created', event);
      
      // Integração com sistema de mensageria
      // await this.publishToMessageBroker('session.created', event);
      
      console.log('Event published: session.created', { sessionId: event.sessionId });
    } catch (error) {
      console.error('Erro ao publicar evento session.created:', error);
    }
  }

  /**
   * Publica evento de sessão expirada
   */
  async publishSessionExpired(event: SessionExpiredEvent): Promise<void> {
    try {
      this.emit('session.expired', event);
      
      // Integração com sistema de mensageria
      // await this.publishToMessageBroker('session.expired', event);
      
      console.log('Event published: session.expired', { sessionId: event.sessionId });
    } catch (error) {
      console.error('Erro ao publicar evento session.expired:', error);
    }
  }

  /**
   * Publica alerta de segurança
   */
  async publishSecurityAlert(event: SecurityAlertEvent): Promise<void> {
    try {
      this.emit('security.alert', event);
      
      // Integração com sistema de mensageria
      // await this.publishToMessageBroker('security.alert', event);
      
      console.log('Event published: security.alert', { 
        type: event.alertType, 
        userId: event.userId 
      });
    } catch (error) {
      console.error('Erro ao publicar evento security.alert:', error);
    }
  }

  /**
   * Registra listener para eventos
   */
  onUserCreated(callback: (event: UserCreatedEvent) => void): void {
    this.on('user.created', callback);
  }

  onUserLogin(callback: (event: UserLoginEvent) => void): void {
    this.on('user.login', callback);
  }

  onUserLogout(callback: (event: UserLogoutEvent) => void): void {
    this.on('user.logout', callback);
  }

  onUserUpdated(callback: (event: UserUpdatedEvent) => void): void {
    this.on('user.updated', callback);
  }

  onSessionCreated(callback: (event: SessionCreatedEvent) => void): void {
    this.on('session.created', callback);
  }

  onSessionExpired(callback: (event: SessionExpiredEvent) => void): void {
    this.on('session.expired', callback);
  }

  onSecurityAlert(callback: (event: SecurityAlertEvent) => void): void {
    this.on('security.alert', callback);
  }

  /**
   * Método privado para integração futura com message broker
   */
  private async publishToMessageBroker(eventType: string, event: any): Promise<void> {
    // Implementação futura para RabbitMQ, Kafka, etc.
    // const message = {
    //   type: eventType,
    //   data: event,
    //   timestamp: new Date(),
    //   source: 'auth-service'
    // };
    // 
    // await messageBroker.publish(eventType, message);
  }

  /**
   * Limpa todos os listeners (útil para testes)
   */
  clearAllListeners(): void {
    this.removeAllListeners();
  }
}

// Singleton instance
export const EventService = new EventServiceClass();

