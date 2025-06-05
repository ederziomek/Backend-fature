/**
 * Classe base para subscribers de eventos
 */
import * as amqplib from 'amqplib';
import { Event } from './types/event';
import { RabbitMQConnection } from './connection';
import { messagingConfig } from './config';
import { Channel } from './types/amqplib-types';

/**
 * Classe base para subscribers de eventos
 */
export abstract class Subscriber<T extends Event> {
  /**
   * Assunto/tópico do evento
   */
  abstract subject: T['subject'];
  
  /**
   * Nome do grupo de filas
   */
  abstract queueGroupName: string;
  
  /**
   * Método para processar a mensagem
   * @param data Dados do evento
   * @param msg Mensagem original
   */
  abstract onMessage(data: T['data'], msg: amqplib.ConsumeMessage, event: T): Promise<void>;
  
  /**
   * Conexão com o RabbitMQ
   */
  private connection: RabbitMQConnection;
  
  /**
   * Canal do RabbitMQ
   */
  private channel: Channel | null = null;
  
  /**
   * Nome da fila
   */
  private queueName: string = '';
  
  /**
   * Nome da fila de retry
   */
  private retryQueueName: string = '';
  
  /**
   * Nome da dead letter queue
   */
  private deadLetterQueueName: string = '';

  /**
   * Construtor
   */
  constructor() {
    this.connection = RabbitMQConnection.getInstance();
  }

  /**
   * Inicializa os nomes das filas
   */
  private initializeQueueNames(): void {
    this.queueName = `${messagingConfig.general.queuePrefix}.${this.queueGroupName}.${this.subject.replace(':', '.')}`;
    this.retryQueueName = `${this.queueName}.retry`;
    this.deadLetterQueueName = `${this.queueName}.dlq`;
  }

  /**
   * Inicia a escuta de eventos
   */
  async listen(): Promise<void> {
    try {
      // Inicializa os nomes das filas
      this.initializeQueueNames();
      
      this.channel = await this.connection.createChannel();
      
      // Configura as filas
      await this.setupQueues();
      
      // Configura o consumo de mensagens
      await this.channel.consume(
        this.queueName,
        this.processMessage.bind(this),
        { noAck: false }
      );
      
      console.log(`Subscriber iniciado para ${this.subject} na fila ${this.queueName}`);
    } catch (error) {
      console.error(`Erro ao iniciar subscriber para ${this.subject}:`, error);
      throw error;
    }
  }

  /**
   * Configura as filas necessárias
   */
  private async setupQueues(): Promise<void> {
    if (!this.channel) {
      throw new Error('Canal não está disponível');
    }

    // Cria a fila principal
    await this.connection.assertQueue(
      this.queueName,
      this.subject,
      messagingConfig.rabbitmq.exchange,
      {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': messagingConfig.rabbitmq.deadLetterExchange,
          'x-dead-letter-routing-key': this.queueName,
        },
      }
    );

    // Cria a fila de retry
    await this.connection.assertRetryQueue(this.queueName, this.subject);

    // Cria a dead letter queue
    await this.connection.assertDeadLetterQueue(this.queueName);
  }

  /**
   * Processa uma mensagem recebida
   * @param msg Mensagem recebida
   */
  private async processMessage(msg: amqplib.ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) {
      return;
    }

    try {
      // Parse da mensagem
      const content = msg.content.toString();
      const event = JSON.parse(content) as T;
      
      // Extrai os headers
      const retryCount = this.getRetryCount(msg);
      
      console.log(`Processando evento ${event.subject} (ID: ${event.id}, Retry: ${retryCount})`);
      
      // Processa a mensagem
      await this.onMessage(event.data, msg, event);
      
      // Confirma o processamento
      this.channel.ack(msg);
      
      console.log(`Evento ${event.subject} (ID: ${event.id}) processado com sucesso`);
    } catch (error) {
      console.error(`Erro ao processar evento:`, error);
      
      // Trata o erro
      await this.handleProcessingError(msg, error);
    }
  }

  /**
   * Obtém o número de tentativas de retry
   * @param msg Mensagem
   * @returns Número de tentativas
   */
  private getRetryCount(msg: amqplib.ConsumeMessage): number {
    const headers = msg.properties.headers || {};
    return headers['x-retry-count'] || 0;
  }

  /**
   * Manipula um erro de processamento
   * @param msg Mensagem
   * @param error Erro ocorrido
   */
  private async handleProcessingError(msg: amqplib.ConsumeMessage, error: any): Promise<void> {
    if (!this.channel) {
      return;
    }

    const retryCount = this.getRetryCount(msg);
    
    if (retryCount < messagingConfig.rabbitmq.retryCount) {
      // Incrementa o contador de retry
      const headers = msg.properties.headers || {};
      headers['x-retry-count'] = retryCount + 1;
      
      // Calcula o delay com backoff exponencial
      const delay = messagingConfig.rabbitmq.initialRetryDelay * 
        Math.pow(messagingConfig.rabbitmq.retryBackoffFactor, retryCount);
      
      // Publica na fila de retry com TTL
      await this.channel.assertQueue(this.retryQueueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': messagingConfig.rabbitmq.exchange,
          'x-dead-letter-routing-key': this.subject,
          'x-message-ttl': delay,
        },
      });
      
      // Publica a mensagem na fila de retry
      this.channel.publish(
        '',
        this.retryQueueName,
        msg.content,
        {
          persistent: true,
          headers,
        }
      );
      
      console.log(`Evento enviado para retry (${retryCount + 1}/${messagingConfig.rabbitmq.retryCount}) com delay de ${delay}ms`);
      
      // Confirma a mensagem original
      this.channel.ack(msg);
    } else {
      // Envia para a dead letter queue
      this.channel.publish(
        messagingConfig.rabbitmq.deadLetterExchange,
        this.queueName,
        msg.content,
        {
          persistent: true,
          headers: {
            ...msg.properties.headers,
            'x-error': error.message,
            'x-failed-at': new Date().toISOString(),
          },
        }
      );
      
      console.log(`Evento enviado para dead letter queue após ${retryCount} tentativas`);
      
      // Confirma a mensagem original
      this.channel.ack(msg);
    }
  }

  /**
   * Para a escuta de eventos
   */
  async stop(): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.close();
        console.log(`Subscriber para ${this.subject} parado`);
      } catch (error) {
        // Ignora o erro se o canal já estiver fechado
        if (error instanceof Error && error.message.includes('Channel closed')) {
          console.log(`Subscriber para ${this.subject} já estava parado`);
        } else {
          console.error(`Erro ao parar subscriber para ${this.subject}:`, error);
          throw error;
        }
      } finally {
        this.channel = null;
      }
    }
  }
}

