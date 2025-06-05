/**
 * Configurações do sistema de mensageria
 */
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

/**
 * Configurações do sistema de mensageria
 */
export const messagingConfig = {
  /**
   * Configurações do RabbitMQ
   */
  rabbitmq: {
    /**
     * URL de conexão com o RabbitMQ
     */
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    
    /**
     * Nome do exchange principal
     */
    exchange: process.env.RABBITMQ_EXCHANGE || 'fature.events',
    
    /**
     * Nome do exchange de dead letter
     */
    deadLetterExchange: process.env.RABBITMQ_DEAD_LETTER_EXCHANGE || 'fature.events.dead-letter',
    
    /**
     * Número máximo de tentativas de retry
     */
    retryCount: parseInt(process.env.RABBITMQ_RETRY_COUNT || '5', 10),
    
    /**
     * Delay inicial para retry (em ms)
     */
    initialRetryDelay: parseInt(process.env.RABBITMQ_INITIAL_RETRY_DELAY || '5000', 10),
    
    /**
     * Fator de multiplicação para backoff exponencial
     */
    retryBackoffFactor: 2,
  },
  
  /**
   * Configurações gerais do sistema de mensageria
   */
  general: {
    /**
     * Prefixo para nomes de filas
     */
    queuePrefix: process.env.SERVICE_NAME || 'fature',
    
    /**
     * Tempo de expiração de mensagens (em ms)
     */
    messageExpiration: 1000 * 60 * 60 * 24, // 24 horas
  },
};

