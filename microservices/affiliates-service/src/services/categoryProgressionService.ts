import { ConfigurationClient } from '../../shared/configurationClient';

export class CategoryProgressionService {
  private configClient: ConfigurationClient;

  constructor() {
    this.configClient = new ConfigurationClient();
  }

  async checkProgression(affiliateId: string): Promise<void> {
    const affiliate = await this.getAffiliate(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const categoriesConfig = await this.configClient.getCategoriesConfig();
    const currentCategory = affiliate.category;
    const totalIndications = affiliate.totalIndications;

    // Verificar se deve progredir para nova categoria
    const newCategory = this.calculateNewCategory(totalIndications, categoriesConfig);
    
    if (newCategory !== currentCategory) {
      await this.progressToCategory(affiliateId, currentCategory, newCategory, categoriesConfig);
    }

    // Verificar progressão de level dentro da categoria atual
    await this.checkLevelProgression(affiliateId, newCategory, categoriesConfig);
  }

  private calculateNewCategory(totalIndications: number, categoriesConfig: any): string {
    for (const [categoryName, categoryConfig] of Object.entries(categoriesConfig)) {
      const [minIndications, maxIndications] = categoryConfig.indicationRange;
      
      if (totalIndications >= minIndications && totalIndications <= maxIndications) {
        return categoryName;
      }
    }
    
    return 'jogador'; // Categoria padrão
  }

  private async progressToCategory(
    affiliateId: string, 
    oldCategory: string, 
    newCategory: string, 
    categoriesConfig: any
  ): Promise<void> {
    const bonification = categoriesConfig[newCategory]?.bonification || 0;
    
    // Atualizar categoria do afiliado
    await this.updateAffiliateCategory(affiliateId, newCategory);
    
    // Aplicar bonificação
    if (bonification > 0) {
      await this.applyBonification(affiliateId, bonification);
    }

    // Registrar progressão
    await this.recordProgression(affiliateId, oldCategory, newCategory, bonification);

    // Enviar notificação
    // TODO: Integrar com notification-service
    console.log(`Affiliate ${affiliateId} progressed from ${oldCategory} to ${newCategory}, bonification: R$ ${bonification}`);
  }

  private async checkLevelProgression(affiliateId: string, category: string, categoriesConfig: any): Promise<void> {
    const affiliate = await this.getAffiliate(affiliateId);
    const categoryConfig = categoriesConfig[category];
    
    if (!categoryConfig) return;

    const currentLevel = affiliate.currentLevel || 1;
    const totalIndications = affiliate.totalIndications;
    const [minIndications, maxIndications] = categoryConfig.indicationRange;
    
    // Calcular level baseado na progressão dentro da categoria
    const categoryRange = maxIndications - minIndications;
    const indicationsInCategory = totalIndications - minIndications;
    const progressPercentage = indicationsInCategory / categoryRange;
    
    const newLevel = Math.min(categoryConfig.levels, Math.floor(progressPercentage * categoryConfig.levels) + 1);
    
    if (newLevel > currentLevel) {
      await this.updateAffiliateLevel(affiliateId, newLevel);
      await this.updateRevSharePercentage(affiliateId);
    }
  }

  async calculateBonification(category: string, level: number): Promise<number> {
    const categoriesConfig = await this.configClient.getCategoriesConfig();
    const categoryConfig = categoriesConfig[category];
    
    if (!categoryConfig) return 0;
    
    // Bonificação base da categoria multiplicada pelo level
    return categoryConfig.bonification * level;
  }

  async applyBonification(affiliateId: string, amount: number): Promise<void> {
    // TODO: Integrar com sistema de carteira/pagamentos
    console.log(`Applying bonification of R$ ${amount} to affiliate ${affiliateId}`);
  }

  async updateRevSharePercentage(affiliateId: string): Promise<void> {
    const affiliate = await this.getAffiliate(affiliateId);
    const categoriesConfig = await this.configClient.getCategoriesConfig();
    
    const categoryConfig = categoriesConfig[affiliate.category];
    if (!categoryConfig) return;

    const [minRevShare, maxRevShare] = categoryConfig.revShareRange;
    const currentLevel = affiliate.currentLevel || 1;
    const maxLevels = categoryConfig.levels;
    
    // Calcular RevShare baseado no level
    const levelProgress = (currentLevel - 1) / (maxLevels - 1);
    const revSharePercentage = minRevShare + (levelProgress * (maxRevShare - minRevShare));
    
    await this.updateAffiliateRevShare(affiliateId, revSharePercentage);
  }

  async getAvailableFeatures(category: string): Promise<string[]> {
    const categoriesConfig = await this.configClient.getCategoriesConfig();
    const categoryConfig = categoriesConfig[category];
    
    return categoryConfig?.features || [];
  }

  async checkInactivityReduction(affiliateId: string): Promise<void> {
    const affiliate = await this.getAffiliate(affiliateId);
    const securityConfig = await this.configClient.getSecurityConfig();
    
    const daysSinceLastActivity = this.calculateDaysSinceLastActivity(affiliate.lastActivityDate);
    
    if (daysSinceLastActivity > 30) {
      const weeksInactive = Math.floor((daysSinceLastActivity - 30) / 7);
      const reductionSchedule = securityConfig.inactivityReduction.schedule;
      
      let reductionPercentage = 0;
      for (const [period, percentage] of Object.entries(reductionSchedule)) {
        const weekNumber = parseInt(period.split('_')[0]);
        if (weeksInactive >= weekNumber) {
          reductionPercentage = percentage;
        }
      }
      
      if (reductionPercentage > 0) {
        await this.applyInactivityReduction(affiliateId, reductionPercentage);
      }
    }
  }

  async reactivateAffiliate(affiliateId: string, indicationsCount: number): Promise<void> {
    const affiliate = await this.getAffiliate(affiliateId);
    const securityConfig = await this.configClient.getSecurityConfig();
    
    const requiredIndications = securityConfig.inactivityReduction.reactivation[affiliate.category] || 1;
    
    if (indicationsCount >= requiredIndications) {
      await this.removeInactivityReduction(affiliateId);
      await this.updateLastActivity(affiliateId);
    }
  }

  // Métodos auxiliares (TODO: implementar integração com banco de dados)
  private async getAffiliate(affiliateId: string): Promise<any> {
    // TODO: Buscar do banco de dados
    return {
      id: affiliateId,
      category: 'afiliado',
      currentLevel: 1,
      totalIndications: 0,
      lastActivityDate: new Date()
    };
  }

  private async updateAffiliateCategory(affiliateId: string, category: string): Promise<void> {
    // TODO: Atualizar no banco de dados
    console.log(`Updating affiliate ${affiliateId} category to ${category}`);
  }

  private async updateAffiliateLevel(affiliateId: string, level: number): Promise<void> {
    // TODO: Atualizar no banco de dados
    console.log(`Updating affiliate ${affiliateId} level to ${level}`);
  }

  private async updateAffiliateRevShare(affiliateId: string, percentage: number): Promise<void> {
    // TODO: Atualizar no banco de dados
    console.log(`Updating affiliate ${affiliateId} RevShare to ${percentage}%`);
  }

  private async recordProgression(affiliateId: string, oldCategory: string, newCategory: string, bonification: number): Promise<void> {
    // TODO: Registrar no banco de dados
    console.log(`Recording progression for affiliate ${affiliateId}: ${oldCategory} -> ${newCategory}`);
  }

  private async applyInactivityReduction(affiliateId: string, percentage: number): Promise<void> {
    // TODO: Aplicar redução no banco de dados
    console.log(`Applying ${percentage}% inactivity reduction to affiliate ${affiliateId}`);
  }

  private async removeInactivityReduction(affiliateId: string): Promise<void> {
    // TODO: Remover redução no banco de dados
    console.log(`Removing inactivity reduction for affiliate ${affiliateId}`);
  }

  private async updateLastActivity(affiliateId: string): Promise<void> {
    // TODO: Atualizar no banco de dados
    console.log(`Updating last activity for affiliate ${affiliateId}`);
  }

  private calculateDaysSinceLastActivity(lastActivityDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastActivityDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async updateConfiguration(): Promise<void> {
    this.configClient.invalidateCache();
    console.log('Affiliates service configuration updated');
  }
}

