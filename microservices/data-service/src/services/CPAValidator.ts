// ===============================================
// CPA VALIDATOR - ORQUESTRAÇÃO DE VALIDAÇÕES
// ===============================================

import { PlatformDataService } from './PlatformDataService';
import { EventPublisher } from './EventPublisher';
import { config } from '../config';
import { 
  CPAValidationResult, 
  CPACommissionData, 
  CPAValidationEvent,
  CommissionCalculationEvent 
} from '../types';
import { Logger } from '../utils/logger';

export class CPAValidator {
  private dataService: PlatformDataService;
  private eventPublisher: EventPublisher;
  private logger: Logger;

  constructor(dataService: PlatformDataService, eventPublisher: EventPublisher) {
    this.dataService = dataService;
    this.eventPublisher = eventPublisher;
    this.logger = new Logger('CPAValidator');
  }

  /**
   * Valida um cliente para ambos os modelos CPA
   */
  async validateCustomer(customerId: string): Promise<CPAValidationResult[]> {
    this.logger.info('Starting CPA validation for customer', { customer_id: customerId });

    const results: CPAValidationResult[] = [];

    try {
      // Validar Modelo 1.1 (se habilitado)
      if (config.cpa_models.model_1_1.enabled) {
        const result11 = await this.validateModel11(customerId);
        if (result11) {
          results.push(result11);
        }
      }

      // Validar Modelo 1.2 (se habilitado)
      if (config.cpa_models.model_1_2.enabled) {
        const result12 = await this.validateModel12(customerId);
        if (result12) {
          results.push(result12);
        }
      }

      // Processar resultados válidos
      for (const result of results) {
        if (result.validation_passed && result.commission_eligible) {
          await this.processValidationResult(result);
        }
      }

      this.logger.info('CPA validation completed', {
        customer_id: customerId,
        results_count: results.length,
        valid_results: results.filter(r => r.validation_passed).length,
      });

      return results;

    } catch (error) {
      this.logger.error('Error during CPA validation', { customer_id: customerId, error });
      throw error;
    }
  }

  /**
   * Valida Modelo 1.1: Primeiro depósito >= valor mínimo
   */
  private async validateModel11(customerId: string): Promise<CPAValidationResult | null> {
    try {
      this.logger.debug('Validating CPA Model 1.1', { customer_id: customerId });

      const result = await this.dataService.validateCPAModel11(customerId);
      
      if (result) {
        this.logger.info('CPA Model 1.1 validation passed', {
          customer_id: customerId,
          affiliate_id: result.affiliate_id,
          deposit_amount: result.first_deposit?.amount,
        });

        // Verificar se já foi processado anteriormente
        const alreadyProcessed = await this.checkIfAlreadyProcessed(customerId, '1.1');
        if (alreadyProcessed) {
          this.logger.warn('CPA Model 1.1 already processed for customer', { customer_id: customerId });
          result.commission_eligible = false;
        }

        return result;
      }

      this.logger.debug('CPA Model 1.1 validation failed', { customer_id: customerId });
      return null;

    } catch (error) {
      this.logger.error('Error validating CPA Model 1.1', { customer_id: customerId, error });
      throw error;
    }
  }

  /**
   * Valida Modelo 1.2: Primeiro depósito + atividade mínima
   */
  private async validateModel12(customerId: string): Promise<CPAValidationResult | null> {
    try {
      this.logger.debug('Validating CPA Model 1.2', { customer_id: customerId });

      const result = await this.dataService.validateCPAModel12(customerId);
      
      if (result && result.validation_passed) {
        this.logger.info('CPA Model 1.2 validation passed', {
          customer_id: customerId,
          affiliate_id: result.affiliate_id,
          deposit_amount: result.first_deposit?.amount,
          bet_count: result.activity_metrics?.bet_count,
          total_ggr: result.activity_metrics?.total_ggr,
        });

        // Verificar se já foi processado anteriormente
        const alreadyProcessed = await this.checkIfAlreadyProcessed(customerId, '1.2');
        if (alreadyProcessed) {
          this.logger.warn('CPA Model 1.2 already processed for customer', { customer_id: customerId });
          result.commission_eligible = false;
        }

        return result;
      }

      this.logger.debug('CPA Model 1.2 validation failed', { customer_id: customerId });
      return null;

    } catch (error) {
      this.logger.error('Error validating CPA Model 1.2', { customer_id: customerId, error });
      throw error;
    }
  }

  /**
   * Processa resultado de validação válido
   */
  private async processValidationResult(result: CPAValidationResult): Promise<void> {
    try {
      this.logger.info('Processing validation result', {
        customer_id: result.customer_id,
        affiliate_id: result.affiliate_id,
        model: result.model,
      });

      // Publicar evento de validação concluída
      const validationEvent: CPAValidationEvent = {
        id: `cpa_validation_${result.customer_id}_${result.model}_${Date.now()}`,
        type: 'cpa.validation.completed',
        source: 'data-service',
        timestamp: new Date(),
        data: result,
      };

      await this.eventPublisher.publishEvent(validationEvent);

      // Calcular dados de comissão
      const commissionData = await this.calculateCommissionData(result);

      // Publicar evento de cálculo de comissão
      const commissionEvent: CommissionCalculationEvent = {
        id: `commission_calc_${result.customer_id}_${result.model}_${Date.now()}`,
        type: 'commission.calculation.requested',
        source: 'data-service',
        timestamp: new Date(),
        data: commissionData,
      };

      await this.eventPublisher.publishEvent(commissionEvent);

      // Marcar como processado
      await this.markAsProcessed(result.customer_id, result.model);

      this.logger.info('Validation result processed successfully', {
        customer_id: result.customer_id,
        model: result.model,
        commission_amount: commissionData.commission_amount,
      });

    } catch (error) {
      this.logger.error('Error processing validation result', {
        customer_id: result.customer_id,
        model: result.model,
        error,
      });
      throw error;
    }
  }

  /**
   * Calcula dados de comissão baseado no resultado da validação
   */
  private async calculateCommissionData(result: CPAValidationResult): Promise<CPACommissionData> {
    // Valores padrão de comissão CPA
    const BASE_COMMISSION = 60.00; // R$ 60 distribuídos em 5 níveis
    const BONUS_AMOUNT = 5.00;     // R$ 5 de bônus direto

    // Distribuição MLM: R$ 35 + R$ 10 + R$ 5 + R$ 5 + R$ 5
    const MLM_DISTRIBUTION = [35.00, 10.00, 5.00, 5.00, 5.00];

    try {
      // Buscar afiliado
      const affiliate = await this.dataService.getAffiliateById(result.affiliate_id);
      if (!affiliate) {
        throw new Error(`Affiliate not found: ${result.affiliate_id}`);
      }

      // Buscar hierarquia MLM (implementar método no PlatformDataService se necessário)
      // Por enquanto, usar apenas o afiliado direto
      const hierarchyLevels = [
        {
          affiliate_id: result.affiliate_id,
          level: 1,
          commission_amount: MLM_DISTRIBUTION[0] || 0,
        }
      ];

      const totalDistributed = hierarchyLevels.reduce(
        (sum, level) => sum + level.commission_amount, 
        0
      ) + BONUS_AMOUNT;

      return {
        customer_id: result.customer_id,
        affiliate_id: result.affiliate_id,
        validation_result: result,
        commission_amount: BASE_COMMISSION,
        bonus_amount: BONUS_AMOUNT,
        hierarchy_levels: hierarchyLevels,
        total_distributed: totalDistributed,
      };

    } catch (error) {
      this.logger.error('Error calculating commission data', {
        customer_id: result.customer_id,
        affiliate_id: result.affiliate_id,
        error,
      });
      throw error;
    }
  }

  /**
   * Verifica se um cliente já foi processado para um modelo específico
   */
  private async checkIfAlreadyProcessed(customerId: string, model: '1.1' | '1.2'): Promise<boolean> {
    try {
      // Implementar verificação no cache Redis ou banco de dados
      // Por enquanto, retornar false (não processado)
      return false;
    } catch (error) {
      this.logger.error('Error checking if already processed', { customer_id: customerId, model, error });
      return false;
    }
  }

  /**
   * Marca um cliente como processado para um modelo específico
   */
  private async markAsProcessed(customerId: string, model: '1.1' | '1.2'): Promise<void> {
    try {
      // Implementar marcação no cache Redis ou banco de dados
      const key = `cpa_processed:${customerId}:${model}`;
      // await this.dataService.redisClient.set(key, 'true', 'EX', 86400 * 30); // 30 dias
      
      this.logger.debug('Customer marked as processed', { customer_id: customerId, model });
    } catch (error) {
      this.logger.error('Error marking as processed', { customer_id: customerId, model, error });
    }
  }

  /**
   * Valida um cliente específico manualmente
   */
  async validateCustomerManual(customerId: string, model?: '1.1' | '1.2'): Promise<CPAValidationResult[]> {
    this.logger.info('Manual CPA validation requested', { customer_id: customerId, model });

    if (model) {
      // Validar modelo específico
      if (model === '1.1') {
        const result = await this.validateModel11(customerId);
        return result ? [result] : [];
      } else {
        const result = await this.validateModel12(customerId);
        return result ? [result] : [];
      }
    } else {
      // Validar ambos os modelos
      return await this.validateCustomer(customerId);
    }
  }

  /**
   * Reprocessa um cliente (ignora verificação de já processado)
   */
  async reprocessCustomer(customerId: string): Promise<CPAValidationResult[]> {
    this.logger.info('Reprocessing customer CPA validation', { customer_id: customerId });

    // Limpar marcações de processado
    await this.clearProcessedMarkers(customerId);

    // Executar validação normal
    return await this.validateCustomer(customerId);
  }

  /**
   * Limpa marcações de processado para um cliente
   */
  private async clearProcessedMarkers(customerId: string): Promise<void> {
    try {
      // Implementar limpeza no cache Redis
      const keys = [
        `cpa_processed:${customerId}:1.1`,
        `cpa_processed:${customerId}:1.2`,
      ];
      
      // await Promise.all(keys.map(key => this.dataService.redisClient.del(key)));
      
      this.logger.debug('Processed markers cleared', { customer_id: customerId });
    } catch (error) {
      this.logger.error('Error clearing processed markers', { customer_id: customerId, error });
    }
  }

  /**
   * Retorna estatísticas do validador
   */
  getStats(): {
    model_1_1_enabled: boolean;
    model_1_2_enabled: boolean;
    model_1_1_config: any;
    model_1_2_config: any;
  } {
    return {
      model_1_1_enabled: config.cpa_models.model_1_1.enabled,
      model_1_2_enabled: config.cpa_models.model_1_2.enabled,
      model_1_1_config: config.cpa_models.model_1_1,
      model_1_2_config: config.cpa_models.model_1_2,
    };
  }
}

