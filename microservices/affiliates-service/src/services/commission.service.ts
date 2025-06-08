import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { 
  CPACalculationInput, 
  CPACalculationResult, 
  CommissionData, 
  CommissionType,
  CommissionStatus,
  AffiliateData,
  CategoryConfig,
  ValidationModel,
  TransactionType
} from '@/types';
import { AffiliateService } from './affiliate.service';
import { EventService } from './event.service';
import { AuditService } from './audit.service';

export class CommissionService {
  /**
   * Calcula comissões CPA conforme documentação
   */
  static async calculateCPACommissions(input: CPACalculationInput): Promise<CPACalculationResult> {
    try {
      // 1. Validar transação conforme modelo
      const isValid = await this.validateTransaction(input);
      if (!isValid) {
        return {
          commissions: [],
          totalDistributed: 0,
          validationPassed: false,
          bonusTriggered: false,
          levelUpTriggered: false
        };
      }

      // 2. Buscar hierarquia do afiliado (até 5 níveis)
      const hierarchy = await AffiliateService.getHierarchy(input.affiliateId, 5);
      
      // 3. Distribuir R$ 60,00 pelos níveis conforme documentação
      const baseDistribution = [35.00, 10.00, 5.00, 5.00, 5.00]; // Total: R$ 60,00
      const commissions: CommissionData[] = [];
      
      for (let i = 0; i < Math.min(hierarchy.length, 5); i++) {
        const affiliate = hierarchy[i];
        const level = i + 1;
        const baseAmount = baseDistribution[i];
        
        // 4. Aplicar percentual da categoria/level do afiliado
        const categoryConfig = await this.getCategoryConfig(affiliate.category, affiliate.categoryLevel);
        const percentage = level === 1 ? categoryConfig.revShareLevel1 : categoryConfig.revShareLevels2to5;
        
        // 5. Calcular comissão final
        const commissionAmount = (baseAmount * percentage) / 100;
        
        // 6. Aplicar reduções por inatividade se aplicável
        const inactivityReduction = await this.getInactivityReduction(affiliate.id);
        const finalAmount = commissionAmount * (1 - inactivityReduction / 100);
        
        // 7. Criar registro de comissão
        const commission = await prisma.commission.create({
          data: {
            affiliateId: affiliate.id,
            sourceAffiliateId: input.affiliateId,
            customerId: input.customerId,
            transactionId: input.transactionId,
            type: 'cpa',
            level: level,
            baseAmount: baseAmount,
            percentage: percentage,
            commissionAmount: commissionAmount,
            finalAmount: finalAmount,
            status: 'calculated',
            metadata: {
              validationModel: input.validationModel,
              transactionType: input.transactionType,
              transactionAmount: input.transactionAmount,
              inactivityReduction: inactivityReduction
            }
          }
        });

        commissions.push(commission as CommissionData);

        // 8. Atualizar saldo do afiliado
        await this.updateAffiliateBalance(affiliate.id, finalAmount);

        // 9. Publicar evento de comissão calculada
        await EventService.publishCommissionCalculated({
          commissionId: commission.id,
          affiliateId: affiliate.id,
          amount: finalAmount,
          type: 'cpa',
          level: level,
          timestamp: new Date(),
          metadata: input.metadata
        });
      }

      // 10. Processar bonificação R$ 5,00 por indicação
      const bonusResult = await this.processIndicationBonus({
        sourceAffiliateId: input.affiliateId,
        customerId: input.customerId,
        validatedAt: new Date()
      });

      // 11. Verificar progressão de nível
      const levelUpResult = await this.checkLevelUpProgression(input.affiliateId);

      // 12. Log de auditoria
      await AuditService.log({
        action: 'commission.cpa.calculated',
        resource: 'commission',
        resourceId: input.transactionId,
        details: {
          affiliateId: input.affiliateId,
          customerId: input.customerId,
          totalDistributed: commissions.reduce((sum, c) => sum + c.finalAmount, 0),
          commissionsCount: commissions.length,
          validationModel: input.validationModel
        },
        severity: 'info'
      });

      return {
        commissions,
        totalDistributed: commissions.reduce((sum, c) => sum + c.finalAmount, 0),
        validationPassed: true,
        bonusTriggered: bonusResult.bonusTriggered,
        levelUpTriggered: levelUpResult.levelUpTriggered,
        newCategory: levelUpResult.newCategory,
        newCategoryLevel: levelUpResult.newCategoryLevel
      };

    } catch (error: any) {
      await AuditService.log({
        action: 'commission.cpa.error',
        resource: 'commission',
        resourceId: input.transactionId,
        details: {
          error: error.message,
          affiliateId: input.affiliateId,
          customerId: input.customerId
        },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Valida transação conforme modelo especificado
   */
  private static async validateTransaction(input: CPACalculationInput): Promise<boolean> {
    switch (input.validationModel) {
      case '1.1':
        return this.validateTransactionModel11(input);
      case '1.2':
        return this.validateTransactionModel12(input);
      default:
        return false;
    }
  }

  /**
   * Modelo 1.1 - Validação imediata após primeiro depósito
   */
  private static async validateTransactionModel11(input: CPACalculationInput): Promise<boolean> {
    if (input.transactionType === 'deposit') {
      // Verificar se é o primeiro depósito do cliente
      const isFirstDeposit = await this.isCustomerFirstDeposit(input.customerId);
      
      // Valor mínimo de R$ 50,00 conforme documentação
      if (isFirstDeposit && input.transactionAmount >= 50.00) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Modelo 1.2 - Validação por atividade nos últimos 30 dias
   */
  private static async validateTransactionModel12(input: CPACalculationInput): Promise<boolean> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Buscar atividade do cliente nos últimos 30 dias
    const activity = await prisma.transaction.aggregate({
      where: {
        customerId: input.customerId,
        createdAt: {
          gte: thirtyDaysAgo
        },
        status: 'completed'
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    });

    // Critérios: mínimo 3 depósitos OU volume total > R$ 200
    const hasMinimumDeposits = (activity._count.id || 0) >= 3;
    const hasMinimumVolume = (activity._sum.amount || 0) >= 200.00;
    
    return hasMinimumDeposits || hasMinimumVolume;
  }

  /**
   * Verifica se é o primeiro depósito do cliente
   */
  private static async isCustomerFirstDeposit(customerId: string): Promise<boolean> {
    const depositCount = await prisma.transaction.count({
      where: {
        customerId,
        type: 'deposit',
        status: 'completed'
      }
    });

    return depositCount === 1; // Considerando que a transação atual já foi salva
  }

  /**
   * Processa bonificação de R$ 5,00 por indicação
   */
  private static async processIndicationBonus(data: {
    sourceAffiliateId: string;
    customerId: string;
    validatedAt: Date;
  }) {
    try {
      // Verificar se bonificação já foi processada
      const existingBonus = await prisma.indication.findFirst({
        where: {
          sourceAffiliateId: data.sourceAffiliateId,
          customerId: data.customerId,
          status: {
            in: ['validated', 'paid']
          }
        }
      });

      if (existingBonus) {
        return {
          bonusTriggered: false,
          bonusAmount: 0
        };
      }

      // Criar bonificação de R$ 5,00
      const indication = await prisma.indication.create({
        data: {
          sourceAffiliateId: data.sourceAffiliateId,
          customerId: data.customerId,
          status: 'validated',
          bonusAmount: 5.00,
          validatedAt: data.validatedAt
        }
      });

      // Atualizar saldo do afiliado
      await this.updateAffiliateBalance(data.sourceAffiliateId, 5.00);

      // Incrementar contador de indicações diretas
      await prisma.affiliate.update({
        where: { id: data.sourceAffiliateId },
        data: {
          directIndications: {
            increment: 1
          }
        }
      });

      // Publicar evento
      await EventService.publishIndicationValidated({
        indicationId: indication.id,
        sourceAffiliateId: data.sourceAffiliateId,
        customerId: data.customerId,
        bonusAmount: 5.00,
        timestamp: new Date()
      });

      return {
        bonusTriggered: true,
        bonusAmount: 5.00
      };

    } catch (error: any) {
      console.error('Erro ao processar bonificação de indicação:', error);
      return {
        bonusTriggered: false,
        bonusAmount: 0
      };
    }
  }

  /**
   * Verifica progressão de nível do afiliado
   */
  private static async checkLevelUpProgression(affiliateId: string) {
    try {
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId }
      });

      if (!affiliate) {
        return { levelUpTriggered: false };
      }

      // Buscar próxima configuração de categoria
      const nextConfig = await this.getNextCategoryConfig(
        affiliate.category as any,
        affiliate.categoryLevel
      );

      if (!nextConfig) {
        return { levelUpTriggered: false };
      }

      // Verificar se atende aos requisitos
      const meetsRequirements = await this.checkCategoryRequirements(affiliateId, nextConfig);

      if (meetsRequirements) {
        // Atualizar categoria/nível do afiliado
        const updatedAffiliate = await prisma.affiliate.update({
          where: { id: affiliateId },
          data: {
            category: nextConfig.category,
            categoryLevel: nextConfig.level
          }
        });

        // Publicar evento de level up
        await EventService.publishLevelUp({
          affiliateId,
          oldCategory: affiliate.category as any,
          newCategory: nextConfig.category,
          oldLevel: affiliate.categoryLevel,
          newLevel: nextConfig.level,
          timestamp: new Date()
        });

        return {
          levelUpTriggered: true,
          newCategory: nextConfig.category,
          newCategoryLevel: nextConfig.level
        };
      }

      return { levelUpTriggered: false };

    } catch (error: any) {
      console.error('Erro ao verificar progressão de nível:', error);
      return { levelUpTriggered: false };
    }
  }

  /**
   * Atualiza saldo disponível do afiliado
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

  /**
   * Obtém configuração de categoria conforme documentação oficial
   */
  private static async getCategoryConfig(category: string, level: number): Promise<CategoryConfig> {
    // Configurações baseadas na documentação oficial do Sistema Fature 100x
    const configs: Record<string, any> = {
      'jogador': {
        levels: 2,
        indicationRange: { min: 0, max: 10 },
        levelConfigs: [
          { 
            level: 1, 
            min: 0, 
            max: 4, 
            revShareLevel1: 1.00, 
            revShareLevels2to5: 3.00, 
            levelUpBonus: 0,
            description: "Jogador iniciante"
          },
          { 
            level: 2, 
            min: 5, 
            max: 10, 
            revShareLevel1: 6.00, 
            revShareLevels2to5: 3.00, 
            levelUpBonus: 25,
            description: "Jogador experiente"
          }
        ]
      },
      'iniciante': {
        levels: 2,
        indicationRange: { min: 11, max: 30 },
        levelConfigs: [
          { 
            level: 1, 
            min: 11, 
            max: 20, 
            revShareLevel1: 12.00, 
            revShareLevels2to5: 3.00, 
            levelUpBonus: 50,
            description: "Iniciante básico"
          },
          { 
            level: 2, 
            min: 21, 
            max: 30, 
            revShareLevel1: 12.00, 
            revShareLevels2to5: 3.00, 
            levelUpBonus: 75,
            description: "Iniciante avançado"
          }
        ]
      },
      'afiliado': {
        levels: 7,
        indicationRange: { min: 31, max: 100 },
        levelConfigs: [
          { level: 1, min: 31, max: 40, revShareLevel1: 12.00, revShareLevels2to5: 3.00, levelUpBonus: 100 },
          { level: 2, min: 41, max: 50, revShareLevel1: 14.00, revShareLevels2to5: 3.00, levelUpBonus: 125 },
          { level: 3, min: 51, max: 60, revShareLevel1: 14.00, revShareLevels2to5: 3.00, levelUpBonus: 150 },
          { level: 4, min: 61, max: 70, revShareLevel1: 16.00, revShareLevels2to5: 3.00, levelUpBonus: 175 },
          { level: 5, min: 71, max: 80, revShareLevel1: 16.00, revShareLevels2to5: 3.00, levelUpBonus: 200 },
          { level: 6, min: 81, max: 90, revShareLevel1: 18.00, revShareLevels2to5: 3.00, levelUpBonus: 225 },
          { level: 7, min: 91, max: 100, revShareLevel1: 18.00, revShareLevels2to5: 3.00, levelUpBonus: 250 }
        ]
      },
      'profissional': {
        levels: 90,
        indicationRange: { min: 101, max: 1000 },
        baseRevShare: { level1: 18.00, levels2to5: 4.00 },
        progressionRate: { level1: 0.067, levels2to5: 0 }, // Incremento por level
        baseLevelUpBonus: 300,
        bonusIncrement: 10
      },
      'expert': {
        levels: 90,
        indicationRange: { min: 1001, max: 10000 },
        baseRevShare: { level1: 24.00, levels2to5: 5.00 },
        progressionRate: { level1: 0.067, levels2to5: 0 },
        baseLevelUpBonus: 1200,
        bonusIncrement: 20
      },
      'mestre': {
        levels: 90,
        indicationRange: { min: 10001, max: 100000 },
        baseRevShare: { level1: 30.00, levels2to5: 6.00 },
        progressionRate: { level1: 0.133, levels2to5: 0.011 },
        baseLevelUpBonus: 10200,
        bonusIncrement: 100
      },
      'lenda': {
        levels: 90,
        indicationRange: { min: 100001, max: Infinity },
        baseRevShare: { level1: 42.00, levels2to5: 7.00 },
        progressionRate: { level1: 0, levels2to5: 0 }, // Sem progressão adicional
        baseLevelUpBonus: 19200,
        bonusIncrement: 200
      }
    };

    const categoryConfig = configs[category];
    if (!categoryConfig) {
      // Fallback para jogador nível 1
      return {
        category: 'jogador' as AffiliateCategory,
        level: 1,
        minDirectIndications: 0,
        minTotalIndications: 0,
        minCommissions: 0,
        revShareLevel1: 1.00,
        revShareLevels2to5: 3.00,
        bonusMultiplier: 1.0,
        requirements: []
      };
    }

    // Para categorias com levelConfigs específicos (jogador, iniciante, afiliado)
    if (categoryConfig.levelConfigs) {
      const levelConfig = categoryConfig.levelConfigs.find((lc: any) => lc.level === level);
      if (levelConfig) {
        return {
          category: category as AffiliateCategory,
          level: level,
          minDirectIndications: levelConfig.min,
          minTotalIndications: levelConfig.min,
          minCommissions: 0,
          revShareLevel1: levelConfig.revShareLevel1,
          revShareLevels2to5: levelConfig.revShareLevels2to5,
          bonusMultiplier: 1.0,
          requirements: []
        };
      }
    }

    // Para categorias com progressão (profissional, expert, mestre, lenda)
    if (categoryConfig.baseRevShare && categoryConfig.progressionRate) {
      const levelIncrement = level - 1;
      const revShareLevel1 = categoryConfig.baseRevShare.level1 + (levelIncrement * categoryConfig.progressionRate.level1);
      const revShareLevels2to5 = categoryConfig.baseRevShare.levels2to5 + (levelIncrement * categoryConfig.progressionRate.levels2to5);
      
      return {
        category: category as AffiliateCategory,
        level: level,
        minDirectIndications: categoryConfig.indicationRange.min,
        minTotalIndications: categoryConfig.indicationRange.min,
        minCommissions: 0,
        revShareLevel1: Math.min(revShareLevel1, 50), // Limite máximo de 50%
        revShareLevels2to5: Math.min(revShareLevels2to5, 10), // Limite máximo de 10%
        bonusMultiplier: 1.0,
        requirements: []
      };
    }

    // Fallback
    return {
      category: 'jogador' as AffiliateCategory,
      level: 1,
      minDirectIndications: 0,
      minTotalIndications: 0,
      minCommissions: 0,
      revShareLevel1: 1.00,
      revShareLevels2to5: 3.00,
      bonusMultiplier: 1.0,
      requirements: []
    };
  }

  /**
   * Obtém próxima configuração de categoria
   */
  private static async getNextCategoryConfig(
    currentCategory: string, 
    currentLevel: number
  ): Promise<CategoryConfig | null> {
    const categoryOrder = ['jogador', 'iniciante', 'afiliado', 'profissional', 'expert', 'mestre', 'lenda'];
    const currentIndex = categoryOrder.indexOf(currentCategory);
    
    // Verificar se pode avançar de nível na categoria atual
    const currentConfig = await this.getCategoryConfig(currentCategory, currentLevel);
    const nextLevelConfig = await this.getCategoryConfig(currentCategory, currentLevel + 1);
    
    // Se existe próximo nível na categoria atual, retornar ele
    if (nextLevelConfig && nextLevelConfig.level === currentLevel + 1) {
      return nextLevelConfig;
    }
    
    // Se não, verificar próxima categoria
    if (currentIndex < categoryOrder.length - 1) {
      const nextCategory = categoryOrder[currentIndex + 1];
      return this.getCategoryConfig(nextCategory, 1);
    }
    
    return null;
  }

  /**
   * Verifica se afiliado atende aos requisitos da categoria
   */
  private static async checkCategoryRequirements(
    affiliateId: string, 
    config: CategoryConfig
  ): Promise<boolean> {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId }
    });

    if (!affiliate) return false;

    // Verificar requisitos básicos
    const meetsDirectIndications = affiliate.directIndications >= config.minDirectIndications;
    const meetsTotalIndications = affiliate.totalIndications >= config.minTotalIndications;
    const meetsCommissions = affiliate.totalCommissions >= config.minCommissions;

    return meetsDirectIndications && meetsTotalIndications && meetsCommissions;
  }

  /**
   * Calcula redução por inatividade
   */
  private static async getInactivityReduction(affiliateId: string): Promise<number> {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      select: { lastActivityAt: true }
    });

    if (!affiliate?.lastActivityAt) return 0;

    const daysSinceActivity = Math.floor(
      (Date.now() - affiliate.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Redução progressiva por inatividade
    if (daysSinceActivity > 90) return 50; // 50% de redução após 90 dias
    if (daysSinceActivity > 60) return 30; // 30% de redução após 60 dias
    if (daysSinceActivity > 30) return 15; // 15% de redução após 30 dias

    return 0;
  }
}

