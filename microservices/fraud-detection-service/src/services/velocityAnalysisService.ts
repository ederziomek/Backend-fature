import { ConfigurationClient } from '../../shared/configurationClient';

export class VelocityAnalysisService {
  private configClient: ConfigurationClient;
  private indicationHistory: Map<string, IndicationRecord[]> = new Map();

  constructor() {
    this.configClient = new ConfigurationClient();
  }

  async analyzeIndicationVelocity(affiliateId: string): Promise<VelocityAnalysis> {
    const securityConfig = await this.configClient.getSecurityConfig();
    const categoriesConfig = await this.configClient.getCategoriesConfig();
    
    // Obter categoria do afiliado (TODO: integrar com affiliates-service)
    const affiliateCategory = await this.getAffiliateCategory(affiliateId);
    
    const categoryLimits = securityConfig.fraudDetection[affiliateCategory];
    if (!categoryLimits) {
      throw new Error(`No fraud detection config found for category: ${affiliateCategory}`);
    }

    const indicationsLastHour = await this.getIndicationsLastHour(affiliateId);
    
    const analysis: VelocityAnalysis = {
      indicationsLastHour,
      categoryLimit: categoryLimits.indicationsPerHour,
      flagEnabled: categoryLimits.flagEnabled,
      riskLevel: this.calculateRiskLevel(indicationsLastHour, categoryLimits.indicationsPerHour),
      recommendedAction: this.getRecommendedAction(indicationsLastHour, categoryLimits)
    };

    return analysis;
  }

  async checkCategoryLimits(affiliateId: string, category: string): Promise<boolean> {
    const securityConfig = await this.configClient.getSecurityConfig();
    const categoryLimits = securityConfig.fraudDetection[category];
    
    if (!categoryLimits) {
      return true; // Se não há configuração, permitir
    }

    const indicationsLastHour = await this.getIndicationsLastHour(affiliateId);
    
    return indicationsLastHour <= categoryLimits.indicationsPerHour;
  }

  async applyAutomaticBlock(affiliateId: string, reason: string): Promise<void> {
    console.log(`Applying automatic block for affiliate ${affiliateId}: ${reason}`);
    
    // TODO: Integrar com affiliates-service para aplicar bloqueio
    // await this.affiliatesService.blockAffiliate(affiliateId, reason);
  }

  async flagForManualReview(affiliateId: string, reason: string): Promise<void> {
    console.log(`Flagging affiliate ${affiliateId} for manual review: ${reason}`);
    
    // TODO: Integrar com sistema de alertas/notificações
    // await this.alertService.createAlert(affiliateId, reason);
  }

  async recordIndication(affiliateId: string): Promise<void> {
    const now = new Date();
    
    if (!this.indicationHistory.has(affiliateId)) {
      this.indicationHistory.set(affiliateId, []);
    }

    const history = this.indicationHistory.get(affiliateId)!;
    history.push({
      timestamp: now,
      affiliateId
    });

    // Manter apenas as últimas 24 horas
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const filtered = history.filter(record => record.timestamp > oneDayAgo);
    this.indicationHistory.set(affiliateId, filtered);

    // Analisar velocidade após registro
    const analysis = await this.analyzeIndicationVelocity(affiliateId);
    
    if (analysis.recommendedAction === 'block') {
      await this.applyAutomaticBlock(affiliateId, 'Velocity limit exceeded');
    } else if (analysis.recommendedAction === 'flag') {
      await this.flagForManualReview(affiliateId, 'High velocity detected');
    }
  }

  private async getIndicationsLastHour(affiliateId: string): Promise<number> {
    const history = this.indicationHistory.get(affiliateId) || [];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return history.filter(record => record.timestamp > oneHourAgo).length;
  }

  private calculateRiskLevel(current: number, limit: number): 'low' | 'medium' | 'high' {
    const ratio = current / limit;
    
    if (ratio <= 0.5) return 'low';
    if (ratio <= 0.8) return 'medium';
    return 'high';
  }

  private getRecommendedAction(current: number, limits: any): 'allow' | 'flag' | 'block' {
    if (current > limits.indicationsPerHour) {
      return limits.flagEnabled ? 'flag' : 'block';
    }
    
    if (current > limits.indicationsPerHour * 0.8) {
      return 'flag';
    }
    
    return 'allow';
  }

  private async getAffiliateCategory(affiliateId: string): Promise<string> {
    // TODO: Integrar com affiliates-service para obter categoria real
    // Por enquanto, retornar categoria padrão
    return 'afiliado';
  }

  async updateConfiguration(): Promise<void> {
    this.configClient.invalidateCache('security');
    console.log('Fraud detection configuration updated');
  }
}

export interface VelocityAnalysis {
  indicationsLastHour: number;
  categoryLimit: number;
  flagEnabled: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedAction: 'allow' | 'flag' | 'block';
}

interface IndicationRecord {
  timestamp: Date;
  affiliateId: string;
}

