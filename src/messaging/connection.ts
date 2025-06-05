/**
 * Classe para gerenciar a conexão com o RabbitMQ
 */
import * as amqplib from 'amqplib';
import { messagingConfig } from './config';
import { Connection, Channel, connect } from './types/amqplib-types';

/**
 * Classe para gerenciar a conexão com o RabbitMQ
 */
export class RabbitMQConnection {
  private static instance: RabbitMQConnection;
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private connecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {}

  /**
   * Obtém a instância única da classe
   * @returns Instância da classe RabbitMQConnection
   */
  public static getInstance(): RabbitMQConnection {
    if (!RabbitMQConnection.instance) {
      RabbitMQConnection.instance = new RabbitMQConnection();
    }
    return RabbitMQConnection.instance;
  }

  /**
   * Estabelece uma conexão com o RabbitMQ
   * @returns Promise que resolve quando a conexão é estabelecida
   */
  public async connect(): Promise<Connection> {
    if (this.connection) {
      return this.connection;
    }

    if (this.connecting) {
      // Aguarda até que a conexão seja estabelecida
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.connection) {
            resolve(this.connection);
          } else if (!this.connecting) {
            reject(new Error('Falha ao conectar ao RabbitMQ'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    try {
      this.connecting = true;
      console.log(`Conectando ao RabbitMQ em ${messagingConfig.rabbitmq.url}...`);
      
      this.connection = await connect(messagingConfig.rabbitmq.url);
      this.reconnectAttempts = 0;
      
      console.log('Conexão com RabbitMQ estabelecida com sucesso');
      
      // Configura listeners para eventos de erro e fechamento
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.connection.on('close', this.handleConnectionClose.bind(this));
      
      this.connecting = false;
      return this.connection;
    } catch (error) {
      this.connecting = false;
      console.error('Erro ao conectar ao RabbitMQ:', error);
      
      // Tenta reconectar
      await this.attemptReconnect();
      
      throw error;
    }
  }

  /**
   * Cria um canal no RabbitMQ
   * @returns Promise que resolve com o canal criado
   */
  public async createChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    try {
      const connection = await this.connect();
      this.channel = await connection.createChannel() as Channel;
      
      console.log('Canal RabbitMQ criado com sucesso');
      
      // Configura listeners para eventos de erro e fechamento
      this.channel.on('error', this.handleChannelError.bind(this));
      this.channel.on('close', this.handleChannelClose.bind(this));
      
      // Configura os exchanges principais
      await this.setupExchanges();
      
      return this.channel;
    } catch (error) {
      console.error('Erro ao criar canal RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Configura os exchanges principais
   */
  private async setupExchanges(): Promise<void> {
    if (!this.channel) {
      throw new Error('Canal não está disponível');
    }

    // Configura o exchange principal
    await this.channel.assertExchange(
      messagingConfig.rabbitmq.exchange,
      'topic',
      { durable: true }
    );

    // Configura o exchange de dead letter
    await this.channel.assertExchange(
      messagingConfig.rabbitmq.deadLetterExchange,
      'topic',
      { durable: true }
    );

    console.log('Exchanges configurados com sucesso');
  }

  /**
   * Fecha a conexão com o RabbitMQ
   */
  public async closeConnection(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      
      console.log('Conexão com RabbitMQ fechada com sucesso');
    } catch (error) {
      console.error('Erro ao fechar conexão com RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Manipula erros de conexão
   * @param error Erro ocorrido
   */
  private handleConnectionError(error: any): void {
    console.error('Erro na conexão com RabbitMQ:', error);
    this.attemptReconnect();
  }

  /**
   * Manipula o fechamento da conexão
   */
  private handleConnectionClose(): void {
    console.log('Conexão com RabbitMQ fechada');
    this.connection = null;
    this.channel = null;
    this.attemptReconnect();
  }

  /**
   * Manipula erros de canal
   * @param error Erro ocorrido
   */
  private handleChannelError(error: any): void {
    console.error('Erro no canal RabbitMQ:', error);
    this.channel = null;
  }

  /**
   * Manipula o fechamento do canal
   */
  private handleChannelClose(): void {
    console.log('Canal RabbitMQ fechado');
    this.channel = null;
  }

  /**
   * Tenta reconectar ao RabbitMQ
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Número máximo de tentativas de reconexão (${this.maxReconnectAttempts}) atingido`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Tentando reconectar ao RabbitMQ em ${delay}ms (tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // Erro tratado no método connect
      }
    }, delay);
  }

  /**
   * Cria uma fila e a associa a um exchange
   * @param queueName Nome da fila
   * @param routingKey Chave de roteamento
   * @param exchangeName Nome do exchange
   * @param options Opções da fila
   * @returns Promise que resolve quando a fila é criada
   */
  public async assertQueue(
    queueName: string,
    routingKey: string,
    exchangeName: string = messagingConfig.rabbitmq.exchange,
    options: amqplib.Options.AssertQueue = {}
  ): Promise<amqplib.Replies.AssertQueue> {
    const channel = await this.createChannel();
    
    // Cria a fila
    const queue = await channel.assertQueue(queueName, {
      durable: true,
      ...options,
    });
    
    // Associa a fila ao exchange
    await channel.bindQueue(queue.queue, exchangeName, routingKey);
    
    console.log(`Fila ${queueName} criada e associada ao exchange ${exchangeName} com routing key ${routingKey}`);
    
    return queue;
  }

  /**
   * Cria uma fila de retry
   * @param originalQueue Nome da fila original
   * @param routingKey Chave de roteamento
   * @returns Promise que resolve quando a fila é criada
   */
  public async assertRetryQueue(
    originalQueue: string,
    routingKey: string
  ): Promise<amqplib.Replies.AssertQueue> {
    const channel = await this.createChannel();
    const retryQueueName = `${originalQueue}.retry`;
    
    // Cria a fila de retry
    const retryQueue = await channel.assertQueue(retryQueueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': messagingConfig.rabbitmq.exchange,
        'x-dead-letter-routing-key': routingKey,
        'x-message-ttl': messagingConfig.rabbitmq.initialRetryDelay,
      },
    });
    
    console.log(`Fila de retry ${retryQueueName} criada`);
    
    return retryQueue;
  }

  /**
   * Cria uma dead letter queue
   * @param originalQueue Nome da fila original
   * @returns Promise que resolve quando a fila é criada
   */
  public async assertDeadLetterQueue(
    originalQueue: string
  ): Promise<amqplib.Replies.AssertQueue> {
    const channel = await this.createChannel();
    const dlqName = `${originalQueue}.dlq`;
    
    // Cria a dead letter queue
    const dlq = await channel.assertQueue(dlqName, {
      durable: true,
    });
    
    // Associa a DLQ ao exchange de dead letter
    await channel.bindQueue(
      dlq.queue,
      messagingConfig.rabbitmq.deadLetterExchange,
      originalQueue
    );
    
    console.log(`Dead letter queue ${dlqName} criada`);
    
    return dlq;
  }
}

