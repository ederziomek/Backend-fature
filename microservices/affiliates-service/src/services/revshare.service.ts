// ===============================================
// REVSHARE SERVICE - SISTEMA DE REVENUE SHARE
// ===============================================

import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { 
  RevShareCalculationInput,
  RevShareCalculationResult,
  RevShareCommissionData,
  AffiliateData,
  CategoryConfig,
  RevSharePeriod,
  NGRData
} from '@/types';
import { AffiliateService } from './affiliate.service';
import { EventService } from './event.service';
import { AuditService } from './audit.service';

export class RevShareService {
  /**
   * Calcula RevShare para um período específico
   */
  static async calculateRevShare(input: RevShareCalculationInput): Promise<RevShareCalculationResult> {
    try {
      // 1. Calcular NGR (Net Gaming Revenue) do período
      const ngrData = await this.calculateNGR(input.affiliateId, input.period);
      
      if (ngrData.ngr <= 0) {
        return {
          commissions: [],
          totalDistributed: 0,
          ngrAmount: ngrData.ngr,
          negativeCarryover: 0,
          period: input.period
        };
      }

      // 2. Buscar hierarquia do afiliado (até 5 níveis)
      const hierarchy = await AffiliateService.getHierarchy(input.affiliateId, 5);
      
      // 3. Aplicar negative carryover se existir
      const carryoverAmount = await this.getCarryoverAmount(input.affiliateId);
      const adjustedNGR = Math.max(0, ngrData.ngr - carryoverAmount);
      
      if (adjustedNGR <= 0) {
        // Acumular negative carryover
        await this.updateCarryover(input.affiliateId, Math.abs(adjustedNGR));
        return {
          commissions: [],
          totalDistributed: 0,
          ngrAmount: ngrData.ngr,
          negativeCarryover: carryoverAmount + Math.abs(adjustedNGR),
          period: input.period
        };
      }

      // 4. Distribuir RevShare pelos níveis da hierarquia
      const commissions: RevShareCommissionData[] = [];
      
      for (let i = 0; i < Math.min(hierarchy.length, 5); i++) {
        const affiliate = hierarchy[i];
        const level = i + 1;
        
        // 5. Obter configuração da categoria/level do afiliado
        const categoryConfig = await this.getCategoryConfig(affiliate.category, affiliate.categoryLevel);
        const percentage = level === 1 ? categoryConfig.revShareLevel1 : categoryConfig.revShareLevels2to5;
        
        // 6. Calcular comissão RevShare
        const commissionAmount = (adjustedNGR * percentage) / 100;
        
        // 7. Aplicar reduções por inatividade se aplicável
        const inactivityReduction = await this.getInactivityReduction(affiliate.id);
        const finalAmount = commissionAmount * (1 - inactivityReduction / 100);
        
        // 8. Criar registro de comissão RevShare
        const commission = await prisma.commission.create({
          data: {
            affiliateId: affiliate.id,
            sourceAffiliateId: input.affiliateId,
            type: 'revshare',
            level: level,
            baseAmount: adjustedNGR,
            percentage: percentage,
            commissionAmount: commissionAmount,
            finalAmount: finalAmount,
            status: 'calculated',
            period: input.period,
            metadata: {
              ngrAmount: ngrData.ngr,
              carryoverApplied: carryoverAmount,
              inactivityReduction: inactivityReduction,
              deposits: ngrData.deposits,
              withdrawals: ngrData.withdrawals,
              bonuses: ngrData.bonuses
            }
          }
        });

        commissions.push(commission as RevShareCommissionData);

        // 9. Atualizar saldo do afiliado
        await this.updateAffiliateBalance(affiliate.id, finalAmount);

        // 10. Publicar evento de comissão RevShare
        await EventService.publishRevShareCalculated({
          commissionId: commission.id,
          affiliateId: affiliate.id,
          amount: finalAmount,
          level: level,
          period: input.period,
          ngrAmount: adjustedNGR,
          timestamp: new Date()
        });
      }

      // 11. Limpar carryover se NGR foi positivo
      if (carryoverAmount > 0) {
        await this.clearCarryover(input.affiliateId);
      }

      // 12. Log de auditoria
      await AuditService.log({
        action: 'commission.revshare.calculated',
        resource: 'commission',
        resourceId: input.affiliateId,
        details: {
          period: input.period,
          ngrAmount: ngrData.ngr,
          adjustedNGR: adjustedNGR,
          carryoverApplied: carryoverAmount,
          totalDistributed: commissions.reduce((sum, c) => sum + c.finalAmount, 0),
          commissionsCount: commissions.length
        },
        severity: 'info'
      });

      return {
        commissions,
        totalDistributed: commissions.reduce((sum, c) => sum + c.finalAmount, 0),
        ngrAmount: ngrData.ngr,
        negativeCarryover: 0,
        period: input.period
      };

    } catch (error: any) {
      await AuditService.log({
        action: 'commission.revshare.error',
        resource: 'commission',
        resourceId: input.affiliateId,
        details: {
          error: error.message,
          period: input.period
        },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Calcula NGR (Net Gaming Revenue) para um período
   */
  private static async calculateNGR(affiliateId: string, period: RevSharePeriod): Promise<NGRData> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    // Buscar todas as transações dos clientes indicados pelo afiliado
    const transactions = await prisma.transaction.findMany({
      where: {
        customer: {
          referredBy: affiliateId
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'completed'
      },
      select: {
        type: true,
        amount: true
      }
    });

    let deposits = 0;
    let withdrawals = 0;
    let bonuses = 0;

    transactions.forEach(transaction => {
      switch (transaction.type) {
        case 'deposit':
          deposits += transaction.amount;
          break;
        case 'withdrawal':
          withdrawals += transaction.amount;
          break;
        case 'bonus':
          bonuses += transaction.amount;
          break;
      }
    });

    // NGR = Depósitos - Saques - Bônus
    const ngr = deposits - withdrawals - bonuses;

    return {
      ngr,
      deposits,
      withdrawals,
      bonuses,
      period,
      startDate,
      endDate
    };
  }

  /**
   * Processa RevShare automaticamente para todos os afiliados
   */
  static async processAutomaticRevShare(period: RevSharePeriod): Promise<void> {
    try {
      // Buscar todos os afiliados ativos
      const affiliates = await prisma.affiliate.findMany({
        where: {
          status: 'active'
        },
        select: {
          id: true,
          affiliateCode: true
        }
      });

      let processedCount = 0;
      let totalDistributed = 0;

      for (const affiliate of affiliates) {
        try {
          const result = await this.calculateRevShare({
            affiliateId: affiliate.id,
            period: period
          });

          processedCount++;
          totalDistributed += result.totalDistributed;

        } catch (error: any) {
          await AuditService.log({
            action: 'revshare.automatic.error',
            resource: 'affiliate',
            resourceId: affiliate.id,
            details: {
              error: error.message,
              period: period
            },
            severity: 'error'
          });
        }
      }

      // Publicar evento de processamento concluído
      await EventService.publishRevShareProcessed({
        period: period,
        processedCount: processedCount,
        totalDistributed: totalDistributed,
        timestamp: new Date()
      });

      // Log de auditoria
      await AuditService.log({
        action: 'revshare.automatic.completed',
        resource: 'system',
        resourceId: 'revshare-processor',
        details: {
          period: period,
          processedCount: processedCount,
          totalDistributed: totalDistributed
        },
        severity: 'info'
      });

    } catch (error: any) {
      await AuditService.log({
        action: 'revshare.automatic.failed',
        resource: 'system',
        resourceId: 'revshare-processor',
        details: {
          error: error.message,
          period: period
        },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Obtém datas de início e fim do período
   */
  private static getPeriodDates(period: RevSharePeriod): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period.type) {
      case 'weekly':
        // Semana anterior (segunda a domingo)
        const lastMonday = new Date(now);
        lastMonday.setDate(now.getDate() - now.getDay() - 6);
        lastMonday.setHours(0, 0, 0, 0);
        
        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);
        lastSunday.setHours(23, 59, 59, 999);
        
        startDate = lastMonday;
        endDate = lastSunday;
        break;

      case 'monthly':
        // Mês anterior
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        lastDayOfMonth.setHours(23, 59, 59, 999);
        
        startDate = lastMonth;
        endDate = lastDayOfMonth;
        break;

      case 'custom':
        startDate = period.startDate!;
        endDate = period.endDate!;
        break;

      default:
        throw new Error('Tipo de período inválido');
    }

    return { startDate, endDate };
  }

  /**
   * Obtém valor de carryover negativo acumulado
   */
  private static async getCarryoverAmount(affiliateId: string): Promise<number> {
    const carryover = await redis.get(`carryover:${affiliateId}`);
    return carryover ? parseFloat(carryover) : 0;
  }

  /**
   * Atualiza valor de carryover negativo
   */
  private static async updateCarryover(affiliateId: string, amount: number): Promise<void> {
    await redis.set(`carryover:${affiliateId}`, amount.toString());
  }

  /**
   * Limpa carryover negativo
   */
  private static async clearCarryover(affiliateId: string): Promise<void> {
    await redis.del(`carryover:${affiliateId}`);
  }

  /**
   * Obtém configuração da categoria/level
   */
  private static async getCategoryConfig(category: string, level: number): Promise<CategoryConfig> {
    // Cache da configuração
    const cacheKey = `category:${category}:${level}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const config = await prisma.categoryLevel.findUnique({
      where: {
        category_level: {
          category: category,
          level: level
        }
      }
    });

    if (!config) {
      throw new Error(`Configuração não encontrada para categoria ${category} level ${level}`);
    }

    // Cache por 1 hora
    await redis.setex(cacheKey, 3600, JSON.stringify(config));
    
    return config as CategoryConfig;
  }

  /**
   * Obtém percentual de redução por inatividade
   */
  private static async getInactivityReduction(affiliateId: string): Promise<number> {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      select: { lastActivityAt: true }
    });

    if (!affiliate?.lastActivityAt) {
      return 0;
    }

    const daysSinceActivity = Math.floor(
      (Date.now() - affiliate.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Aplicar redução conforme regras de inatividade
    if (daysSinceActivity >= 90) {
      return 50; // 50% de redução após 90 dias
    } else if (daysSinceActivity >= 60) {
      return 25; // 25% de redução após 60 dias
    } else if (daysSinceActivity >= 30) {
      return 10; // 10% de redução após 30 dias
    }

    return 0;
  }

  /**
   * Atualiza saldo do afiliado
   */
  private static async updateAffiliateBalance(affiliateId: string, amount: number): Promise<void> {
    await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        availableBalance: {
          increment: amount
        },
        totalCommissions: {
          increment: amount
        }
      }
    });
  }
}

