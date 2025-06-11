import { PotentialAnalysis, WeekData, PersonalizedGoals, AlgorithmConfig } from '../types/gamification';

export class PotentialAnalysisService {
  private weeklyData: Map<string, WeekData[]> = new Map();
  private analysisCache: Map<string, PotentialAnalysis> = new Map();

  async analyzeAffiliatePotential(affiliateId: string): Promise<PotentialAnalysis> {
    // Verificar cache
    const cached = this.analysisCache.get(affiliateId);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const config = await this.getAlgorithmConfig();
    const historicalData = await this.getHistoricalData(affiliateId, config.historicalWindow);

    if (historicalData.length === 0) {
      return this.getDefaultAnalysis(affiliateId);
    }

    const analysis = await this.performAnalysis(affiliateId, historicalData, config);
    
    // Cache do resultado
    this.analysisCache.set(affiliateId, analysis);
    
    return analysis;
  }

  private async performAnalysis(
    affiliateId: string, 
    historicalData: WeekData[], 
    config: AlgorithmConfig
  ): Promise<PotentialAnalysis> {
    
    // 1. Calcular média histórica
    const historicalAverage = this.calculateHistoricalAverage(historicalData);
    
    // 2. Detectar tendência
    const trendDirection = this.detectTrend(historicalData);
    
    // 3. Calcular fator de sazonalidade
    const seasonalityFactor = this.calculateSeasonality(historicalData, config);
    
    // 4. Calcular nível de confiança
    const confidenceLevel = this.calculateConfidence(historicalData);
    
    // 5. Gerar metas recomendadas
    const recommendedGoals = this.generateRecommendedGoals(
      historicalAverage, 
      trendDirection, 
      seasonalityFactor, 
      config
    );

    return {
      affiliateId,
      historicalAverage,
      trendDirection,
      seasonalityFactor,
      confidenceLevel,
      recommendedGoals,
      analysisDate: new Date()
    };
  }

  private calculateHistoricalAverage(data: WeekData[]): number {
    if (data.length === 0) return 0;
    
    const total = data.reduce((sum, week) => sum + week.validIndications, 0);
    return total / data.length;
  }

  private detectTrend(data: WeekData[]): 'up' | 'down' | 'stable' {
    if (data.length < 3) return 'stable';

    // Análise de regressão linear simples
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map(d => d.validIndications);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    if (slope > 0.5) return 'up';
    if (slope < -0.5) return 'down';
    return 'stable';
  }

  private calculateSeasonality(data: WeekData[], config: AlgorithmConfig): number {
    // Análise simples de sazonalidade baseada na variabilidade
    if (data.length < 4) return config.seasonalityFactor;

    const values = data.map(d => d.validIndications);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Fator de sazonalidade baseado na variabilidade
    const variabilityFactor = stdDev / (mean || 1);
    
    return Math.max(0.8, Math.min(1.5, config.seasonalityFactor * (1 + variabilityFactor)));
  }

  private calculateConfidence(data: WeekData[]): number {
    if (data.length === 0) return 0.1;
    if (data.length < 3) return 0.3;
    if (data.length < 6) return 0.6;
    if (data.length < 10) return 0.8;
    return 0.95;
  }

  private generateRecommendedGoals(
    average: number, 
    trend: 'up' | 'down' | 'stable', 
    seasonality: number,
    config: AlgorithmConfig
  ): PotentialAnalysis['recommendedGoals'] {
    
    let baseGoal = Math.max(config.minimumGoal, average * seasonality);
    
    // Ajustar baseado na tendência
    switch (trend) {
      case 'up':
        baseGoal *= config.trendFactor;
        break;
      case 'down':
        baseGoal *= (2 - config.trendFactor); // Reduzir menos agressivamente
        break;
      case 'stable':
        // Manter baseGoal
        break;
    }

    return {
      silver: Math.max(1, Math.round(baseGoal * 0.7)), // 70% de chance
      gold: Math.max(1, Math.round(baseGoal * 1.0)),   // 50% de chance
      sapphire: Math.max(1, Math.round(baseGoal * 1.5)), // 20% de chance
      diamond: Math.max(1, Math.round(baseGoal * 2.2))   // 8% de chance
    };
  }

  async calculatePersonalizedGoals(affiliateId: string): Promise<PersonalizedGoals> {
    const analysis = await this.analyzeAffiliatePotential(affiliateId);
    const weekStartDate = this.getWeekStartDate();

    // Calcular recompensas baseadas nas metas
    const rewards = this.calculateRewards(analysis.recommendedGoals);

    return {
      affiliateId,
      weekStartDate,
      goals: analysis.recommendedGoals,
      rewards,
      generatedAt: new Date()
    };
  }

  private calculateRewards(goals: PotentialAnalysis['recommendedGoals']): PersonalizedGoals['rewards'] {
    // Recompensas baseadas na dificuldade das metas
    return {
      silver: Math.round(goals.silver * 2.5),   // R$ 2,50 por indicação
      gold: Math.round(goals.gold * 4.0),       // R$ 4,00 por indicação
      sapphire: Math.round(goals.sapphire * 6.0), // R$ 6,00 por indicação
      diamond: Math.round(goals.diamond * 10.0)   // R$ 10,00 por indicação
    };
  }

  async updateHistoricalData(affiliateId: string, weekData: WeekData): Promise<void> {
    if (!this.weeklyData.has(affiliateId)) {
      this.weeklyData.set(affiliateId, []);
    }

    const data = this.weeklyData.get(affiliateId)!;
    data.push(weekData);

    // Manter apenas as últimas 12 semanas
    if (data.length > 12) {
      data.splice(0, data.length - 12);
    }

    // Invalidar cache de análise
    this.analysisCache.delete(affiliateId);
  }

  private async getHistoricalData(affiliateId: string, weeks: number): Promise<WeekData[]> {
    const data = this.weeklyData.get(affiliateId) || [];
    return data.slice(-weeks);
  }

  private getDefaultAnalysis(affiliateId: string): PotentialAnalysis {
    return {
      affiliateId,
      historicalAverage: 1,
      trendDirection: 'stable',
      seasonalityFactor: 1.0,
      confidenceLevel: 0.1,
      recommendedGoals: {
        silver: 1,
        gold: 2,
        sapphire: 3,
        diamond: 5
      },
      analysisDate: new Date()
    };
  }

  private isCacheValid(analysis: PotentialAnalysis): boolean {
    const now = new Date();
    const cacheAge = now.getTime() - analysis.analysisDate.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    return cacheAge < maxAge;
  }

  private getWeekStartDate(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Segunda-feira
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private async getAlgorithmConfig(): Promise<AlgorithmConfig> {
    // TODO: Integrar com configuration-management-service
    return {
      historicalWindow: 8,
      recentDataWeight: 0.7,
      oldDataWeight: 0.3,
      seasonalityFactor: 1.1,
      trendFactor: 1.2,
      minimumGoal: 1
    };
  }

  async getAnalysisHistory(affiliateId: string): Promise<PotentialAnalysis[]> {
    // Por enquanto retorna apenas a análise atual
    const current = this.analysisCache.get(affiliateId);
    return current ? [current] : [];
  }
}

