// ===============================================
// TRANSACTION MONITOR - MONITORAMENTO EM TEMPO REAL
// ===============================================

import cron from 'node-cron';
import { PlatformDataService } from './PlatformDataService';
import { CPAValidator } from './CPAValidator';
import { EventPublisher } from './EventPublisher';
import { config } from '../config';
import { PlatformTransaction, TransactionProcessedEvent } from '../types';
import { Logger } from '../utils/logger';

export class TransactionMonitor {
  private dataService: PlatformDataService;
  private cpaValidator: CPAValidator;
  private eventPublisher: EventPublisher;
  private logger: Logger;
  private isRunning: boolean = false;
  private lastProcessedTimestamp: Date;
  private cronJob: any;

  constructor(
    dataService: PlatformDataService,
    cpaValidator: CPAValidator,
    eventPublisher: EventPublisher
  ) {
    this.dataService = dataService;
    this.cpaValidator = cpaValidator;
    this.eventPublisher = eventPublisher;
    this.logger = new Logger('TransactionMonitor');
    this.lastProcessedTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h atrás
  }

  /**
   * Inicia o monitoramento de transações
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Transaction monitor is already running');
      return;
    }

    this.logger.info('Starting transaction monitor', {
      polling_interval_ms: config.monitor.polling_interval_ms,
      batch_size: config.monitor.batch_size,
    });

    this.isRunning = true;

    // Configurar cron job para execução periódica
    const intervalSeconds = Math.floor(config.monitor.polling_interval_ms / 1000);
    const cronExpression = `*/${intervalSeconds} * * * * *`;

    this.cronJob = cron.schedule(cronExpression, async () => {
      if (this.isRunning) {
        await this.processNewTransactions();
      }
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.logger.info('Transaction monitor started successfully');
  }

  /**
   * Para o monitoramento de transações
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Transaction monitor is not running');
      return;
    }

    this.logger.info('Stopping transaction monitor');
    this.isRunning = false;

    if (this.cronJob) {
      this.cronJob.stop();
    }

    this.logger.info('Transaction monitor stopped successfully');
  }

  /**
   * Processa novas transações desde a última execução
   */
  private async processNewTransactions(): Promise<void> {
    try {
      this.logger.debug('Processing new transactions', {
        since: this.lastProcessedTimestamp,
        batch_size: config.monitor.batch_size,
      });

      // Buscar transações recentes
      const transactions = await this.dataService.getRecentTransactions(
        config.monitor.batch_size,
        this.lastProcessedTimestamp
      );

      if (transactions.length === 0) {
        this.logger.debug('No new transactions found');
        return;
      }

      this.logger.info(`Processing ${transactions.length} new transactions`);

      // Processar cada transação
      for (const transaction of transactions) {
        await this.processTransaction(transaction);
      }

      // Atualizar timestamp da última execução
      if (transactions.length > 0) {
        const latestTransaction = transactions.reduce((latest, current) => 
          current.created_at > latest.created_at ? current : latest
        );
        this.lastProcessedTimestamp = latestTransaction.created_at;
      }

      this.logger.info('Batch processing completed', {
        processed_count: transactions.length,
        last_timestamp: this.lastProcessedTimestamp,
      });

    } catch (error) {
      this.logger.error('Error processing new transactions', { error });
    }
  }

  /**
   * Processa uma transação individual
   */
  private async processTransaction(transaction: PlatformTransaction): Promise<void> {
    try {
      this.logger.debug('Processing transaction', {
        transaction_id: transaction.id,
        customer_id: transaction.customer_id,
        type: transaction.type,
        amount: transaction.amount,
      });

      let validationTriggered = false;

      // Verificar se é uma transação que pode disparar validação CPA
      if (this.shouldTriggerCPAValidation(transaction)) {
        this.logger.info('Transaction triggers CPA validation', {
          transaction_id: transaction.id,
          customer_id: transaction.customer_id,
        });

        // Executar validação CPA
        await this.cpaValidator.validateCustomer(transaction.customer_id);
        validationTriggered = true;
      }

      // Publicar evento de transação processada
      const event: TransactionProcessedEvent = {
        id: `tx_processed_${transaction.id}_${Date.now()}`,
        type: 'transaction.processed',
        source: 'data-service',
        timestamp: new Date(),
        data: {
          transaction,
          validation_triggered: validationTriggered,
        },
      };

      await this.eventPublisher.publishEvent(event);

      this.logger.debug('Transaction processed successfully', {
        transaction_id: transaction.id,
        validation_triggered: validationTriggered,
      });

    } catch (error) {
      this.logger.error('Error processing transaction', {
        transaction_id: transaction.id,
        error,
      });

      // Implementar retry logic se necessário
      await this.retryTransactionProcessing(transaction);
    }
  }

  /**
   * Determina se uma transação deve disparar validação CPA
   */
  private shouldTriggerCPAValidation(transaction: PlatformTransaction): boolean {
    // Validação CPA é disparada por:
    // 1. Depósitos processados (para modelo 1.1)
    // 2. Apostas processadas (para modelo 1.2)
    // 3. GGR processado (para modelo 1.2)
    
    if (transaction.status !== 'processed') {
      return false;
    }

    const triggerTypes = ['deposit', 'bet', 'ggr'];
    return triggerTypes.includes(transaction.type);
  }

  /**
   * Implementa retry logic para transações com falha
   */
  private async retryTransactionProcessing(
    transaction: PlatformTransaction,
    attempt: number = 1
  ): Promise<void> {
    if (attempt > config.monitor.max_retries) {
      this.logger.error('Max retries exceeded for transaction', {
        transaction_id: transaction.id,
        attempts: attempt,
      });
      return;
    }

    this.logger.warn('Retrying transaction processing', {
      transaction_id: transaction.id,
      attempt,
      max_retries: config.monitor.max_retries,
    });

    // Aguardar antes do retry
    await new Promise(resolve => 
      setTimeout(resolve, config.monitor.retry_delay_ms * attempt)
    );

    try {
      await this.processTransaction(transaction);
    } catch (error) {
      this.logger.error('Retry failed for transaction', {
        transaction_id: transaction.id,
        attempt,
        error,
      });

      // Tentar novamente
      await this.retryTransactionProcessing(transaction, attempt + 1);
    }
  }

  /**
   * Processa transações em lote manualmente
   */
  async processBatch(transactionIds: string[]): Promise<void> {
    this.logger.info('Processing manual batch', {
      transaction_count: transactionIds.length,
    });

    for (const transactionId of transactionIds) {
      try {
        // Buscar transação por ID (implementar método no PlatformDataService se necessário)
        // const transaction = await this.dataService.getTransactionById(transactionId);
        // if (transaction) {
        //   await this.processTransaction(transaction);
        // }
        
        this.logger.debug('Manual batch item processed', { transaction_id: transactionId });
      } catch (error) {
        this.logger.error('Error processing manual batch item', {
          transaction_id: transactionId,
          error,
        });
      }
    }

    this.logger.info('Manual batch processing completed');
  }

  /**
   * Retorna estatísticas do monitor
   */
  getStats(): {
    is_running: boolean;
    last_processed_timestamp: Date;
    polling_interval_ms: number;
    batch_size: number;
  } {
    return {
      is_running: this.isRunning,
      last_processed_timestamp: this.lastProcessedTimestamp,
      polling_interval_ms: config.monitor.polling_interval_ms,
      batch_size: config.monitor.batch_size,
    };
  }

  /**
   * Atualiza o timestamp da última execução (útil para testes)
   */
  setLastProcessedTimestamp(timestamp: Date): void {
    this.lastProcessedTimestamp = timestamp;
    this.logger.info('Last processed timestamp updated', { timestamp });
  }
}

