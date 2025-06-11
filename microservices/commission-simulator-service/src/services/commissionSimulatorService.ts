import { ConfigurationClient } from '../../shared/configurationClient';

export class CommissionSimulatorService {
  private configClient: ConfigurationClient;

  constructor() {
    this.configClient = new ConfigurationClient();
  }

  async simulateCPA(params: CPASimulationParams): Promise<CPASimulationResult> {
    const cpaConfig = await this.configClient.getCPAConfig();
    const categoriesConfig = await this.configClient.getCategoriesConfig();
    
    const results: CPASimulationResult = {
      totalIndications: params.indicationsCount,
      validIndications: Math.round(params.indicationsCount * (params.conversionRate / 100)),
      commissionsByLevel: {},
      totalCommission: 0,
      categoryProgression: this.simulateCategoryProgression(params.indicationsCount, categoriesConfig)
    };

    // Calcular comissões por nível da rede
    for (let level = 1; level <= 5; level++) {
      const levelKey = `level${level}` as keyof typeof cpaConfig.values;
      const commission = results.validIndications * cpaConfig.values[levelKey];
      results.commissionsByLevel[level] = commission;
      results.totalCommission += commission;
    }

    return results;
  }

  async simulateRevShare(params: RevShareSimulationParams): Promise<RevShareSimulationResult> {
    const categoriesConfig = await this.configClient.getCategoriesConfig();
    const vaultConfig = await this.configClient.getVaultConfig();
    
    // Calcular NGR baseado no GGR estimado
    const estimatedNGR = params.estimatedGGR * 0.96; // 96% para afiliados
    
    const results: RevShareSimulationResult = {
      estimatedGGR: params.estimatedGGR,
      estimatedNGR: estimatedNGR,
      commissionsByCategory: {},
      totalCommission: 0,
      distributionSchedule: vaultConfig.schedule
    };

    // Simular comissões para diferentes categorias
    for (const [categoryName, categoryConfig] of Object.entries(categoriesConfig)) {
      const avgRevShare = (categoryConfig.revShareRange[0] + categoryConfig.revShareRange[1]) / 2;
      const commission = estimatedNGR * (avgRevShare / 100);
      
      results.commissionsByCategory[categoryName] = {
        revSharePercentage: avgRevShare,
        commission: commission
      };
      
      results.totalCommission += commission;
    }

    return results;
  }

  async simulateGamification(params: GamificationSimulationParams): Promise<GamificationSimulationResult> {
    const gamificationConfig = await this.configClient.getGamificationConfig();
    
    const results: GamificationSimulationResult = {
      dailyIndicationRewards: 0,
      chestRewards: 0,
      totalGamificationRewards: 0
    };

    // Simular recompensas de indicação diária
    if (params.dailyConsistency > 0) {
      const dailyConfig = gamificationConfig.dailyIndication;
      const avgDailyReward = Object.values(dailyConfig).reduce((sum: number, day: any) => sum + day.total, 0) / 7;
      results.dailyIndicationRewards = avgDailyReward * params.dailyConsistency * 4; // 4 semanas
    }

    // Simular recompensas de baús (estimativa baseada em performance)
    if (params.weeklyPerformance > 0) {
      const baseChestReward = params.weeklyPerformance * 5; // R$ 5 por indicação média
      results.chestRewards = baseChestReward * 4; // 4 semanas
    }

    results.totalGamificationRewards = results.dailyIndicationRewards + results.chestRewards;

    return results;
  }

  async simulateNetworkGrowth(params: NetworkSimulationParams): Promise<NetworkSimulationResult> {
    const categoriesConfig = await this.configClient.getCategoriesConfig();
    
    const results: NetworkSimulationResult = {
      networkLevels: {},
      totalNetworkCommission: 0,
      projectedGrowth: []
    };

    // Simular crescimento da rede por nível
    for (let level = 1; level <= params.networkDepth; level++) {
      const affiliatesAtLevel = Math.pow(params.averageRecruitment, level - 1);
      const indicationsPerAffiliate = params.averageIndicationsPerAffiliate / level; // Reduzir por nível
      const totalIndications = affiliatesAtLevel * indicationsPerAffiliate;
      
      results.networkLevels[level] = {
        affiliatesCount: Math.round(affiliatesAtLevel),
        totalIndications: Math.round(totalIndications),
        estimatedCommission: totalIndications * 25 // Estimativa baseada em CPA médio
      };
      
      results.totalNetworkCommission += results.networkLevels[level].estimatedCommission;
    }

    // Projeção de crescimento mensal
    for (let month = 1; month <= 12; month++) {
      const growthFactor = Math.pow(1 + params.monthlyGrowthRate / 100, month);
      results.projectedGrowth.push({
        month,
        estimatedCommission: results.totalNetworkCommission * growthFactor,
        networkSize: Object.values(results.networkLevels).reduce((sum, level) => sum + level.affiliatesCount, 0) * growthFactor
      });
    }

    return results;
  }

  async simulateVaultDistribution(params: VaultSimulationParams): Promise<VaultSimulationResult> {
    const vaultConfig = await this.configClient.getVaultConfig();
    
    const affiliatesShare = params.totalNGR * (vaultConfig.distribution.affiliatesPercentage / 100);
    const rankingsShare = params.totalNGR * (vaultConfig.distribution.rankingsPercentage / 100);
    
    return {
      totalNGR: params.totalNGR,
      affiliatesShare,
      rankingsShare,
      distributionFrequency: vaultConfig.schedule.frequency,
      nextDistribution: this.calculateNextDistribution(vaultConfig.schedule)
    };
  }

  private simulateCategoryProgression(totalIndications: number, categoriesConfig: any): any {
    const progression = [];
    
    for (const [categoryName, categoryConfig] of Object.entries(categoriesConfig)) {
      const minIndications = categoryConfig.indicationRange[0];
      const maxIndications = categoryConfig.indicationRange[1];
      
      if (totalIndications >= minIndications && totalIndications <= maxIndications) {
        progression.push({
          currentCategory: categoryName,
          indicationsToNext: maxIndications - totalIndications + 1,
          bonificationReceived: categoryConfig.bonification
        });
      }
    }
    
    return progression;
  }

  private calculateNextDistribution(schedule: any): Date {
    const now = new Date();
    const nextDistribution = new Date(now);
    
    switch (schedule.frequency) {
      case 'weekly':
        nextDistribution.setDate(now.getDate() + (7 - now.getDay() + schedule.dayOfWeek) % 7);
        break;
      case 'monthly':
        nextDistribution.setMonth(now.getMonth() + 1, 1);
        break;
      default:
        nextDistribution.setDate(now.getDate() + 7);
    }
    
    nextDistribution.setHours(schedule.hour, 0, 0, 0);
    return nextDistribution;
  }

  async updateConfiguration(): Promise<void> {
    this.configClient.invalidateCache();
    console.log('Commission simulator configuration updated');
  }
}

// Interfaces para simulação
export interface CPASimulationParams {
  indicationsCount: number;
  conversionRate: number;
}

export interface CPASimulationResult {
  totalIndications: number;
  validIndications: number;
  commissionsByLevel: { [level: number]: number };
  totalCommission: number;
  categoryProgression: any;
}

export interface RevShareSimulationParams {
  estimatedGGR: number;
}

export interface RevShareSimulationResult {
  estimatedGGR: number;
  estimatedNGR: number;
  commissionsByCategory: { [category: string]: { revSharePercentage: number; commission: number } };
  totalCommission: number;
  distributionSchedule: any;
}

export interface GamificationSimulationParams {
  dailyConsistency: number; // dias por semana
  weeklyPerformance: number; // indicações por semana
}

export interface GamificationSimulationResult {
  dailyIndicationRewards: number;
  chestRewards: number;
  totalGamificationRewards: number;
}

export interface NetworkSimulationParams {
  networkDepth: number;
  averageRecruitment: number;
  averageIndicationsPerAffiliate: number;
  monthlyGrowthRate: number;
}

export interface NetworkSimulationResult {
  networkLevels: { [level: number]: { affiliatesCount: number; totalIndications: number; estimatedCommission: number } };
  totalNetworkCommission: number;
  projectedGrowth: { month: number; estimatedCommission: number; networkSize: number }[];
}

export interface VaultSimulationParams {
  totalNGR: number;
}

export interface VaultSimulationResult {
  totalNGR: number;
  affiliatesShare: number;
  rankingsShare: number;
  distributionFrequency: string;
  nextDistribution: Date;
}

