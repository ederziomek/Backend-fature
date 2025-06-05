/**
 * Sistema de Mensageria - Fature
 * 
 * Este módulo fornece uma abstração para comunicação assíncrona entre microserviços
 * utilizando RabbitMQ como broker de mensagens.
 */

// Configurações
export { messagingConfig } from './config';

// Classes principais
export { RabbitMQConnection } from './connection';
export { Publisher } from './base-publisher';
export { Subscriber } from './base-subscriber';

// Tipos
export { Event } from './types/event';

// Utilitários
import { MessagingManager } from './utils/messaging-manager';
export { MessagingManager };

/**
 * Obtém a instância do gerenciador de mensageria
 * @returns Instância do gerenciador de mensageria
 */
export function getMessagingManager() {
  return MessagingManager.getInstance();
}

/**
 * Inicializa o sistema de mensageria
 * @returns Promise que resolve quando o sistema é inicializado
 */
export async function initializeMessaging(): Promise<void> {
  const manager = MessagingManager.getInstance();
  await manager.initialize();
}

/**
 * Encerra o sistema de mensageria
 * @returns Promise que resolve quando o sistema é encerrado
 */
export async function shutdownMessaging(): Promise<void> {
  const manager = MessagingManager.getInstance();
  await manager.shutdown();
}

