// ===============================================
// MOTOR DE CÁLCULO - COMMISSION SIMULATOR
// ===============================================

import { 
  SimulationParameters, 
  CommissionProjection, 
  CommissionBreakdown,
  ProjectionFactors,
  Scenario,
  ScenarioResult,
  HistoricalData,
  MarketData
} from '../types/simulator.types';

export class CalculationEngine {
  
  /**
   * Calcula projeções de comissão baseado nos parâmetros
   */
  calculateProjections(
    parameters: SimulationParameters,
    timeframe: string,
    historicalData?: HistoricalData[],
    marketData?: MarketData[]
  ): CommissionProjection[] {
    
    const projections: CommissionProjection[] = [];
    const periods = this.generatePeriods(timeframe, parameters);
    
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const factors = this.calculateProjectionFactors(parameters, i, historicalData, marketData);
      
      const projectedIndications = this.calculateProjectedIndications(parameters, factors, i);
      const projectedRevenue = this.calculateProjectedRevenue(parameters, factors, projectedIndications);
      const projectedCommissions = this.calculateCommissionBreakdown(
        parameters, 
        projectedIndications, 
        projectedRevenue,
        factors
      );
      
      const cumulativeCommissions = i === 0 ? 
        projectedCommissions.totalCommissions :
        projections[i-1].cumulativeCommissions + projectedCommissions.totalCommissions;
      
      projections.push({
        period: period.name,
        periodStart: period.start,
        periodEnd: period.end,
        projectedIndications,
        projectedRevenue,
        projectedCommissions,
        cumulativeCommissions,
        confidence: this.calculateConfidence(parameters, factors, i),
        factors
      });
    }
    
    return projections;
  }

  /**
   * Calcula projeções para múltiplos cenários
   */
  calculateScenarioProjections(
    baseParameters: SimulationParameters,
    scenarios: Scenario[],
    timeframe: string
  ): ScenarioResult[] {
    
    const results: ScenarioResult[] = [];
    
    for (const scenario of scenarios) {
      const adjustedParameters = this.applyScenarioAdjustments(baseParameters, scenario);
      const projections = this.calculateProjections(adjustedParameters, timeframe);
      
      const totalCommissions = projections.reduce((sum, p) => sum + p.projectedCommissions.totalCommissions, 0);
      const totalRevenue = projections.reduce((sum, p) => sum + p.projectedRevenue, 0);
      const totalIndications = projections.reduce((sum, p) => sum + p.projectedIndications, 0);
      
      results.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        probability: scenario.probability,
        projectedCommissions: totalCommissions,
        projectedRevenue: totalRevenue,
        projectedIndications: totalIndications,
        riskLevel: this.assessScenarioRisk(scenario),
        description: scenario.description
      });
    }
    
    return results;
  }

  /**
   * Gera períodos baseado no timeframe
   */
  private generatePeriods(timeframe: string, parameters: SimulationParameters): Array<{name: string, start: Date, end: Date}> {
    const periods = [];
    const startDate = parameters.startDate || new Date();
    let currentDate = new Date(startDate);
    
    const periodCount = this.getPeriodCount(timeframe);
    const periodDuration = this.getPeriodDuration(timeframe);
    
    for (let i = 0; i < periodCount; i++) {
      const periodStart = new Date(currentDate);
      const periodEnd = new Date(currentDate.getTime() + periodDuration);
      
      periods.push({
        name: this.getPeriodName(timeframe, i),
        start: periodStart,
        end: periodEnd
      });
      
      currentDate = new Date(periodEnd);
    }
    
    return periods;
  }

  /**
   * Calcula fatores de projeção para um período
   */
  private calculateProjectionFactors(
    parameters: SimulationParameters,
    periodIndex: number,
    historicalData?: HistoricalData[],
    marketData?: MarketData[]
  ): ProjectionFactors {
    
    // Fator base (sempre 1.0)
    const baseRate = 1.0;
    
    // Fator de crescimento (baseado na taxa de crescimento especificada)
    const growthFactor = parameters.growthRate ? 
      Math.pow(1 + parameters.growthRate, periodIndex) : 1.0;
    
    // Fator de sazonalidade (simplificado - pode ser expandido)
    const seasonalityFactor = parameters.seasonalityFactor || 1.0;
    
    // Fator de mercado (baseado em tendências)
    const marketFactor = parameters.marketTrends || 1.0;
    
    // Fator de competição (simplificado)
    const competitionFactor = 1.0; // Pode ser calculado baseado em dados de mercado
    
    // Fator de retenção (afeta principalmente RevShare)
    const retentionFactor = parameters.playerRetentionRate || 0.8;
    
    return {
      baseRate,
      growthFactor,
      seasonalityFactor,
      marketFactor,
      competitionFactor,
      retentionFactor
    };
  }

  /**
   * Calcula indicações projetadas para um período
   */
  private calculateProjectedIndications(
    parameters: SimulationParameters,
    factors: ProjectionFactors,
    periodIndex: number
  ): number {
    
    const baseIndications = parameters.expectedIndications || 0;
    
    // Aplicar todos os fatores
    const projectedIndications = baseIndications * 
      factors.baseRate * 
      factors.growthFactor * 
      factors.seasonalityFactor * 
      factors.marketFactor * 
      factors.competitionFactor;
    
    // Adicionar variação aleatória pequena para realismo
    const variation = 0.1; // 10% de variação
    const randomFactor = 1 + (Math.random() - 0.5) * variation;
    
    return Math.round(projectedIndications * randomFactor);
  }

  /**
   * Calcula receita projetada baseada nas indicações
   */
  private calculateProjectedRevenue(
    parameters: SimulationParameters,
    factors: ProjectionFactors,
    projectedIndications: number
  ): number {
    
    const conversionRate = parameters.conversionRate || 0.3;
    const averagePlayerValue = parameters.averagePlayerValue || 500;
    
    // Calcular jogadores convertidos
    const convertedPlayers = projectedIndications * conversionRate;
    
    // Calcular receita base
    const baseRevenue = convertedPlayers * averagePlayerValue;
    
    // Aplicar fatores de retenção e mercado
    const projectedRevenue = baseRevenue * 
      factors.retentionFactor * 
      factors.marketFactor;
    
    return Math.round(projectedRevenue);
  }

  /**
   * Calcula breakdown detalhado das comissões
   */
  private calculateCommissionBreakdown(
    parameters: SimulationParameters,
    projectedIndications: number,
    projectedRevenue: number,
    factors: ProjectionFactors
  ): CommissionBreakdown {
    
    // Comissões CPA
    const cpaRate = parameters.cpaRate || 0;
    const cpaCommissions = projectedIndications * cpaRate;
    
    // Comissões RevShare
    const revsharePercentage = parameters.revsharePercentage || 0;
    const revshareCommissions = projectedRevenue * (revsharePercentage / 100);
    
    // Bônus de progressão
    const progressionBonus = parameters.progressionBonus || 0;
    
    // Bônus adicionais (baseado em performance)
    const bonusCommissions = this.calculateBonusCommissions(
      cpaCommissions + revshareCommissions,
      factors
    );
    
    const totalCommissions = cpaCommissions + revshareCommissions + bonusCommissions + progressionBonus;
    
    return {
      cpaCommissions: Math.round(cpaCommissions),
      revshareCommissions: Math.round(revshareCommissions),
      bonusCommissions: Math.round(bonusCommissions),
      progressionBonus: Math.round(progressionBonus),
      totalCommissions: Math.round(totalCommissions)
    };
  }

  /**
   * Calcula bônus adicionais baseado em performance
   */
  private calculateBonusCommissions(baseCommissions: number, factors: ProjectionFactors): number {
    // Bônus baseado em crescimento excepcional
    if (factors.growthFactor > 1.2) {
      return baseCommissions * 0.1; // 10% de bônus
    }
    
    // Bônus baseado em fatores de mercado favoráveis
    if (factors.marketFactor > 1.1) {
      return baseCommissions * 0.05; // 5% de bônus
    }
    
    return 0;
  }

  /**
   * Calcula confiança da projeção
   */
  private calculateConfidence(
    parameters: SimulationParameters,
    factors: ProjectionFactors,
    periodIndex: number
  ): number {
    
    // Confiança diminui com o tempo
    const timeDecay = Math.max(0.5, 1 - (periodIndex * 0.1));
    
    // Confiança baseada na qualidade dos parâmetros
    const parameterQuality = this.assessParameterQuality(parameters);
    
    // Confiança baseada na estabilidade dos fatores
    const factorStability = this.assessFactorStability(factors);
    
    return Math.min(1.0, timeDecay * parameterQuality * factorStability);
  }

  /**
   * Aplica ajustes de cenário aos parâmetros base
   */
  private applyScenarioAdjustments(
    baseParameters: SimulationParameters,
    scenario: Scenario
  ): SimulationParameters {
    
    const adjusted = { ...baseParameters, ...scenario.parameters };
    const adjustments = scenario.adjustments;
    
    // Aplicar multiplicadores
    if (adjustments.indicationsMultiplier) {
      adjusted.expectedIndications = (adjusted.expectedIndications || 0) * adjustments.indicationsMultiplier;
    }
    
    if (adjustments.revenueMultiplier) {
      adjusted.expectedRevenue = (adjusted.expectedRevenue || 0) * adjustments.revenueMultiplier;
    }
    
    // Aplicar ajustes de taxa
    if (adjustments.conversionRateAdjustment) {
      adjusted.conversionRate = (adjusted.conversionRate || 0.3) + adjustments.conversionRateAdjustment;
    }
    
    if (adjustments.retentionRateAdjustment) {
      adjusted.playerRetentionRate = (adjusted.playerRetentionRate || 0.8) + adjustments.retentionRateAdjustment;
    }
    
    return adjusted;
  }

  /**
   * Avalia o risco de um cenário
   */
  private assessScenarioRisk(scenario: Scenario): 'low' | 'medium' | 'high' {
    const adjustments = scenario.adjustments;
    
    // Cenários com grandes multiplicadores são mais arriscados
    const indicationsRisk = (adjustments.indicationsMultiplier || 1) > 1.5 ? 1 : 0;
    const revenueRisk = (adjustments.revenueMultiplier || 1) > 1.5 ? 1 : 0;
    
    // Condições de mercado afetam o risco
    const marketRisk = adjustments.marketConditions === 'bear' ? 1 : 0;
    const competitionRisk = adjustments.competitionLevel === 'high' ? 1 : 0;
    
    const totalRisk = indicationsRisk + revenueRisk + marketRisk + competitionRisk;
    
    if (totalRisk >= 3) return 'high';
    if (totalRisk >= 2) return 'medium';
    return 'low';
  }

  /**
   * Utilitários para geração de períodos
   */
  private getPeriodCount(timeframe: string): number {
    switch (timeframe) {
      case 'weekly': return 12; // 3 meses
      case 'monthly': return 12; // 1 ano
      case 'quarterly': return 4; // 1 ano
      case 'annual': return 3; // 3 anos
      default: return 12;
    }
  }

  private getPeriodDuration(timeframe: string): number {
    const day = 24 * 60 * 60 * 1000;
    switch (timeframe) {
      case 'weekly': return 7 * day;
      case 'monthly': return 30 * day;
      case 'quarterly': return 90 * day;
      case 'annual': return 365 * day;
      default: return 30 * day;
    }
  }

  private getPeriodName(timeframe: string, index: number): string {
    switch (timeframe) {
      case 'weekly': return `Semana ${index + 1}`;
      case 'monthly': return `Mês ${index + 1}`;
      case 'quarterly': return `Trimestre ${index + 1}`;
      case 'annual': return `Ano ${index + 1}`;
      default: return `Período ${index + 1}`;
    }
  }

  /**
   * Avalia qualidade dos parâmetros fornecidos
   */
  private assessParameterQuality(parameters: SimulationParameters): number {
    let quality = 0.5; // Base
    
    // Parâmetros essenciais aumentam a qualidade
    if (parameters.expectedIndications && parameters.expectedIndications > 0) quality += 0.1;
    if (parameters.conversionRate && parameters.conversionRate > 0) quality += 0.1;
    if (parameters.cpaRate && parameters.cpaRate > 0) quality += 0.1;
    if (parameters.revsharePercentage && parameters.revsharePercentage > 0) quality += 0.1;
    if (parameters.playerRetentionRate && parameters.playerRetentionRate > 0) quality += 0.1;
    if (parameters.averagePlayerValue && parameters.averagePlayerValue > 0) quality += 0.1;
    
    return Math.min(1.0, quality);
  }

  /**
   * Avalia estabilidade dos fatores
   */
  private assessFactorStability(factors: ProjectionFactors): number {
    // Fatores mais próximos de 1.0 são mais estáveis
    const growthStability = 1 - Math.abs(factors.growthFactor - 1.0) * 0.5;
    const marketStability = 1 - Math.abs(factors.marketFactor - 1.0) * 0.5;
    const seasonalityStability = 1 - Math.abs(factors.seasonalityFactor - 1.0) * 0.3;
    
    return Math.max(0.3, (growthStability + marketStability + seasonalityStability) / 3);
  }
}

