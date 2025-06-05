/**
 * Tipos personalizados para o amqplib
 * 
 * Este arquivo contém tipos personalizados para o amqplib para resolver problemas de tipagem.
 */

import * as amqp from 'amqplib';

/**
 * Extensão da interface Connection do amqplib
 */
export interface Connection extends amqp.Connection {
  /**
   * Cria um canal
   */
  createChannel(): Promise<amqp.Channel>;
  
  /**
   * Fecha a conexão
   */
  close(): Promise<void>;
}

/**
 * Extensão da interface Channel do amqplib
 */
export interface Channel extends amqp.Channel {
  /**
   * Fecha o canal
   */
  close(): Promise<void>;
}

/**
 * Função para conectar ao RabbitMQ
 */
export function connect(url: string): Promise<Connection> {
  return amqp.connect(url) as unknown as Promise<Connection>;
}

