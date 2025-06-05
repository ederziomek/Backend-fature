/**
 * Classe base para publishers de eventos
 */
import { v4 as uuidv4 } from 'uuid';
import { Event } from './types/event';
import { RabbitMQConnection } from './connection';
import { messagingConfig } from './config';
import { Channel } from './types/amqplib-types';

/**
 * Classe base para publishers de eventos
 */
export abstract class Publisher<T extends Event> {
  /**
   * Assunto/tópico do evento
   */
  abstract subject: T['subject'];
  
  /**
   * Versão do evento
   */
  protected version: number = 1;
  
  /**
   * Nome do serviço de origem
   */
  protected source: string = process.env.SERVICE_NAME || 'unknown';
  
  /**
   * Conexão com o RabbitMQ
   */
  private connection: RabbitMQConnection;

  /**
   * Construtor
   */
  constructor() {
    this.connection = RabbitMQConnection.getInstance();
  }

  /**
   * Publica um evento
   * @param data Dados do evento
   * @param options Opções de publicação
   * @returns Promise que resolve quando o evento é publicado
   */
  async publish(
    data: T['data'],
    options: {
      correlationId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      const channel = await this.connection.createChannel();
      
      const event: Event = {
        id: uuidv4(),
        subject: this.subject,
        version: this.version,
        timestamp: new Date().toISOString(),
        data,
        metadata: {
          correlationId: options.correlationId || uuidv4(),
          source: this.source,
          ...options.metadata,
        },
      };
      
      await this.publishToChannel(channel, event);
      
      console.log(`Evento ${this.subject} publicado com sucesso. ID: ${event.id}`);
    } catch (error) {
      console.error(`Erro ao publicar evento ${this.subject}:`, error);
      throw error;
    }
  }

  /**
   * Publica um evento em um canal específico
   * @param channel Canal do RabbitMQ
   * @param event Evento a ser publicado
   */
  private async publishToChannel(channel: Channel, event: Event): Promise<boolean> {
    return channel.publish(
      messagingConfig.rabbitmq.exchange,
      event.subject,
      Buffer.from(JSON.stringify(event)),
      {
        persistent: true,
        contentType: 'application/json',
        headers: {
          'x-version': event.version,
          'x-source': event.metadata?.source || this.source,
          'x-correlation-id': event.metadata?.correlationId,
        },
      }
    );
  }
}

