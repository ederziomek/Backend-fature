/**
 * Gerenciador de mensageria
 */
import { RabbitMQConnection } from '../connection';
import { Publisher } from '../base-publisher';
import { Subscriber } from '../base-subscriber';

/**
 * Classe para gerenciar o sistema de mensageria
 */
export class MessagingManager {
  private static instance: MessagingManager;
  private connection: RabbitMQConnection;
  private publishers: Map<string, Publisher<any>> = new Map();
  private subscribers: Map<string, Subscriber<any>> = new Map();
  private isInitialized = false;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    this.connection = RabbitMQConnection.getInstance();
  }

  /**
   * Obtém a instância única da classe
   * @returns Instância da classe MessagingManager
   */
  public static getInstance(): MessagingManager {
    if (!MessagingManager.instance) {
      MessagingManager.instance = new MessagingManager();
    }
    return MessagingManager.instance;
  }

  /**
   * Inicializa o sistema de mensageria
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Estabelece a conexão com o RabbitMQ
      await this.connection.connect();
      
      // Inicia todos os subscribers registrados
      for (const [name, subscriber] of this.subscribers.entries()) {
        try {
          await subscriber.listen();
          console.log(`Subscriber ${name} iniciado com sucesso`);
        } catch (error) {
          console.error(`Erro ao iniciar subscriber ${name}:`, error);
        }
      }
      
      this.isInitialized = true;
      console.log('Sistema de mensageria inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar sistema de mensageria:', error);
      throw error;
    }
  }

  /**
   * Registra um publisher
   * @param name Nome do publisher
   * @param publisher Instância do publisher
   */
  public registerPublisher<T extends Publisher<any>>(name: string, publisher: T): T {
    this.publishers.set(name, publisher);
    console.log(`Publisher ${name} registrado`);
    return publisher;
  }

  /**
   * Registra um subscriber
   * @param name Nome do subscriber
   * @param subscriber Instância do subscriber
   */
  public registerSubscriber<T extends Subscriber<any>>(name: string, subscriber: T): T {
    this.subscribers.set(name, subscriber);
    console.log(`Subscriber ${name} registrado`);
    
    // Se o sistema já estiver inicializado, inicia o subscriber imediatamente
    if (this.isInitialized) {
      subscriber.listen()
        .then(() => console.log(`Subscriber ${name} iniciado com sucesso`))
        .catch(error => console.error(`Erro ao iniciar subscriber ${name}:`, error));
    }
    
    return subscriber;
  }

  /**
   * Obtém um publisher registrado
   * @param name Nome do publisher
   * @returns Instância do publisher
   */
  public getPublisher<T extends Publisher<any>>(name: string): T {
    const publisher = this.publishers.get(name) as T;
    if (!publisher) {
      throw new Error(`Publisher ${name} não encontrado`);
    }
    return publisher;
  }

  /**
   * Obtém um subscriber registrado
   * @param name Nome do subscriber
   * @returns Instância do subscriber
   */
  public getSubscriber<T extends Subscriber<any>>(name: string): T {
    const subscriber = this.subscribers.get(name) as T;
    if (!subscriber) {
      throw new Error(`Subscriber ${name} não encontrado`);
    }
    return subscriber;
  }

  /**
   * Fecha todas as conexões e para todos os subscribers
   */
  public async shutdown(): Promise<void> {
    try {
      // Para todos os subscribers
      for (const [name, subscriber] of this.subscribers.entries()) {
        try {
          await subscriber.stop();
          console.log(`Subscriber ${name} parado com sucesso`);
        } catch (error) {
          console.error(`Erro ao parar subscriber ${name}:`, error);
        }
      }
      
      // Fecha a conexão com o RabbitMQ
      await this.connection.closeConnection();
      
      this.isInitialized = false;
      console.log('Sistema de mensageria encerrado com sucesso');
    } catch (error) {
      console.error('Erro ao encerrar sistema de mensageria:', error);
      throw error;
    }
  }
}

