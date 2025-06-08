// ===============================================
// EXTENSÕES PARA COMMISSION SERVICE - CPA AUTOMÁTICO
// ===============================================

import { 
  CPAValidationResult, 
  CPACommissionData, 
  PlatformTransaction,
  CommissionData 
} from '../types';

// Extensão da classe CommissionService existente
export class CommissionServiceExtensions {
  
  /**
   * Prepara comissão CPA baseada no resultado de validação
   */
  static async prepareCPACommission(validationResult: CPAValidationResult): Promise<void> {
    try {
      console.log('Preparing CPA commission', {
        customer_id: validationResult.customer_id,
        affiliate_id: validationResult.affiliate_id,
        model: validationResult.model,
      });

      // Verificar se já foi processado
      const existingCommission = await this.checkExistingCPACommission(
        validationResult.customer_id,
        validationResult.model
      );

      if (existingCommission) {
        console.log('CPA commission already exists', {
          customer_id: validationResult.customer_id,
          model: validationResult.model,
        });
        return;
      }

      // Marcar como preparado para processamento
      await this.markCPACommissionPrepared(validationResult);

    } catch (error) {
      console.error('Error preparing CPA commission:', error);
      throw error;
    }
  }

  /**
   * Processa comissões CPA completas
   */
  static async processCPACommissions(commissionData: CPACommissionData): Promise<{
    total_distributed: number;
    commissions_created: number;
    bonus_applied: boolean;
  }> {
    try {
      console.log('Processing CPA commissions', {
        customer_id: commissionData.customer_id,
        affiliate_id: commissionData.affiliate_id,
        commission_amount: commissionData.commission_amount,
        hierarchy_levels: commissionData.hierarchy_levels.length,
      });

      let totalDistributed = 0;
      let commissionsCreated = 0;
      let bonusApplied = false;

      // 1. Processar comissões da hierarquia MLM
      for (const level of commissionData.hierarchy_levels) {
        const commission = await this.createCPACommission({
          affiliate_id: level.affiliate_id,
          customer_id: commissionData.customer_id,
          amount: level.commission_amount,
          level: level.level,
          model: commissionData.validation_result.model,
          source_transaction_id: commissionData.validation_result.first_deposit?.transaction_id,
        });

        if (commission) {
          totalDistributed += level.commission_amount;
          commissionsCreated++;
        }
      }

      // 2. Aplicar bônus direto ao afiliado principal
      if (commissionData.bonus_amount > 0) {
        const bonusCommission = await this.createCPABonus({
          affiliate_id: commissionData.affiliate_id,
          customer_id: commissionData.customer_id,
          amount: commissionData.bonus_amount,
          model: commissionData.validation_result.model,
        });

        if (bonusCommission) {
          totalDistributed += commissionData.bonus_amount;
          bonusApplied = true;
        }
      }

      // 3. Atualizar métricas do afiliado
      await this.updateAffiliateMetricsForCPA(
        commissionData.affiliate_id,
        totalDistributed
      );

      // 4. Registrar evento de comissão processada
      await this.recordCPACommissionEvent(commissionData, {
        total_distributed: totalDistributed,
        commissions_created: commissionsCreated,
        bonus_applied: bonusApplied,
      });

      console.log('CPA commissions processed successfully', {
        customer_id: commissionData.customer_id,
        total_distributed: totalDistributed,
        commissions_created: commissionsCreated,
        bonus_applied: bonusApplied,
      });

      return {
        total_distributed: totalDistributed,
        commissions_created: commissionsCreated,
        bonus_applied: bonusApplied,
      };

    } catch (error) {
      console.error('Error processing CPA commissions:', error);
      throw error;
    }
  }

  /**
   * Atualiza métricas do afiliado baseado em transação
   */
  static async updateAffiliateMetrics(
    affiliateId: string,
    transaction: PlatformTransaction
  ): Promise<void> {
    try {
      console.log('Updating affiliate metrics', {
        affiliate_id: affiliateId,
        transaction_id: transaction.id,
        transaction_type: transaction.type,
        amount: transaction.amount,
      });

      // Buscar afiliado atual
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
      });

      if (!affiliate) {
        console.warn('Affiliate not found for metrics update', { affiliate_id: affiliateId });
        return;
      }

      // Calcular atualizações baseadas no tipo de transação
      const updates: any = {
        updated_at: new Date(),
        last_activity_at: new Date(),
      };

      switch (transaction.type) {
        case 'deposit':
          // Atualizar volume de depósitos
          updates.current_month_volume = {
            increment: transaction.amount,
          };
          updates.lifetime_volume = {
            increment: transaction.amount,
          };
          break;

        case 'bet':
          // Atualizar atividade de apostas (se necessário)
          break;

        case 'ggr':
          // Atualizar GGR (se necessário)
          break;
      }

      // Aplicar atualizações
      await prisma.affiliate.update({
        where: { id: affiliateId },
        data: updates,
      });

      console.log('Affiliate metrics updated successfully', {
        affiliate_id: affiliateId,
        updates: Object.keys(updates),
      });

    } catch (error) {
      console.error('Error updating affiliate metrics:', error);
      throw error;
    }
  }

  /**
   * Verifica se já existe comissão CPA para o cliente
   */
  private static async checkExistingCPACommission(
    customerId: string,
    model: '1.1' | '1.2'
  ): Promise<boolean> {
    try {
      const existing = await prisma.commission.findFirst({
        where: {
          customer_id: customerId,
          type: 'CPA',
          metadata: {
            path: ['cpa_model'],
            equals: model,
          },
        },
      });

      return existing !== null;
    } catch (error) {
      console.error('Error checking existing CPA commission:', error);
      return false;
    }
  }

  /**
   * Marca comissão CPA como preparada
   */
  private static async markCPACommissionPrepared(
    validationResult: CPAValidationResult
  ): Promise<void> {
    try {
      // Implementar marcação no cache ou banco
      const key = `cpa_prepared:${validationResult.customer_id}:${validationResult.model}`;
      await redis.setex(key, 3600, JSON.stringify(validationResult)); // 1 hora
    } catch (error) {
      console.error('Error marking CPA commission as prepared:', error);
    }
  }

  /**
   * Cria comissão CPA individual
   */
  private static async createCPACommission(data: {
    affiliate_id: string;
    customer_id: string;
    amount: number;
    level: number;
    model: '1.1' | '1.2';
    source_transaction_id?: string;
  }): Promise<CommissionData | null> {
    try {
      const commission = await prisma.commission.create({
        data: {
          id: `cpa_${data.customer_id}_${data.model}_${data.level}_${Date.now()}`,
          affiliate_id: data.affiliate_id,
          customer_id: data.customer_id,
          type: 'CPA',
          amount: data.amount,
          status: 'PENDING',
          level: data.level,
          source_transaction_id: data.source_transaction_id,
          metadata: {
            cpa_model: data.model,
            hierarchy_level: data.level,
            processed_at: new Date().toISOString(),
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      return commission as CommissionData;
    } catch (error) {
      console.error('Error creating CPA commission:', error);
      return null;
    }
  }

  /**
   * Cria bônus CPA
   */
  private static async createCPABonus(data: {
    affiliate_id: string;
    customer_id: string;
    amount: number;
    model: '1.1' | '1.2';
  }): Promise<CommissionData | null> {
    try {
      const bonus = await prisma.commission.create({
        data: {
          id: `cpa_bonus_${data.customer_id}_${data.model}_${Date.now()}`,
          affiliate_id: data.affiliate_id,
          customer_id: data.customer_id,
          type: 'BONUS',
          amount: data.amount,
          status: 'PENDING',
          level: 0, // Bônus direto
          metadata: {
            cpa_model: data.model,
            bonus_type: 'CPA_DIRECT',
            processed_at: new Date().toISOString(),
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      return bonus as CommissionData;
    } catch (error) {
      console.error('Error creating CPA bonus:', error);
      return null;
    }
  }

  /**
   * Atualiza métricas do afiliado para CPA
   */
  private static async updateAffiliateMetricsForCPA(
    affiliateId: string,
    totalCommission: number
  ): Promise<void> {
    try {
      await prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          current_month_commissions: {
            increment: totalCommission,
          },
          lifetime_commissions: {
            increment: totalCommission,
          },
          total_referrals: {
            increment: 1, // Novo referral validado
          },
          active_referrals: {
            increment: 1, // Referral ativo
          },
          updated_at: new Date(),
          last_activity_at: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating affiliate metrics for CPA:', error);
    }
  }

  /**
   * Registra evento de comissão CPA processada
   */
  private static async recordCPACommissionEvent(
    commissionData: CPACommissionData,
    result: {
      total_distributed: number;
      commissions_created: number;
      bonus_applied: boolean;
    }
  ): Promise<void> {
    try {
      // Usar EventService para registrar evento
      await EventService.recordEvent({
        type: 'CPA_COMMISSION_PROCESSED',
        affiliate_id: commissionData.affiliate_id,
        customer_id: commissionData.customer_id,
        data: {
          commission_data: commissionData,
          processing_result: result,
        },
        source: 'affiliate-service',
      });
    } catch (error) {
      console.error('Error recording CPA commission event:', error);
    }
  }
}

