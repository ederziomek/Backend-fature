// ===============================================
// SERVIÇO PRINCIPAL - COMMISSION SIMULATOR
// ===============================================

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { 
  SimulationRequest, 
  SimulationResult, 
  SimulationSummary,
  ProgressionAnalysis,
  ComparisonAnalysis,
  OptimizationSuggestion,
  HistoricalData,
  MarketData
} from '../types/simulator.types';
import { CalculationEngine } from '../utils/calculation-engine';

export class SimulatorService {
  private prisma: PrismaClient;
  private redis: Redis;
  private calculationEngine: CalculationEngine;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.calculationEngine = new CalculationEngine();
  }

  /**
   * Executa simulação completa
   */
  async runSimulation(request: SimulationRequest): Promise<SimulationResult> {
    // Buscar dados históricos do afiliado
    const historicalData = await this.getHistoricalData(request.affiliateId);
    
    // Buscar dados de mercado
    const marketData = await this.getMarketData();

    // Calcular projeções principais
    const projections = this.calculationEngine.calculateProjections(
      request.parameters,
      request.timeframe,
      historicalData,
      marketData
    );

    // Calcular cenários se fornecidos
    const scenarios = request.scenarios ? 
      this.calculationEngine.calculateScenarioProjections(
        request.parameters,
        request.scenarios,
        request.timeframe
      ) : [];

    // Gerar resumo da simulação
    const summary = this.generateSimulationSummary(projections, scenarios);

    // Gerar recomendações
    const recommendations = await this.generateRecommendations(
      request,
      projections,
      scenarios,
      historicalData
    );

    // Calcular confiança geral
    const confidence = this.calculateOverallConfidence(projections, request.parameters);

    const result: SimulationResult = {
      id: uuidv4(),
      affiliateId: request.affiliateId,
      simulationType: request.simulationType,
      timeframe: request.timeframe,
      parameters: request.parameters,
      projections,
      scenarios,
      summary,
      recommendations,
      confidence,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    };

    // Salvar no cache
    await this.redis.setex(
      `simulation:${result.id}`,
      604800, // 7 dias
      JSON.stringify(result)
    );

    // Salvar referência por afiliado
    await this.redis.lpush(
      `simulations:affiliate:${request.affiliateId}`,
      result.id
    );
    await this.redis.expire(`simulations:affiliate:${request.affiliateId}`, 2592000); // 30 dias

    return result;
  }

  /**
   * Busca simulação por ID
   */
  async getSimulation(simulationId: string): Promise<SimulationResult | null> {
    const cached = await this.redis.get(`simulation:${simulationId}`);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Lista simulações de um afiliado
   */
  async getAffiliateSimulations(affiliateId: string, limit: number = 10): Promise<SimulationResult[]> {
    const simulationIds = await this.redis.lrange(`simulations:affiliate:${affiliateId}`, 0, limit - 1);
    const simulations: SimulationResult[] = [];

    for (const id of simulationIds) {
      const simulation = await this.getSimulation(id);
      if (simulation) {
        simulations.push(simulation);
      }
    }

    return simulations;
  }

  /**
   * Análise de progressão de nível
   */
  async analyzeProgression(
    affiliateId: string,
    currentLevel: number,
    targetLevel: number
  ): Promise<ProgressionAnalysis> {
    
    // Buscar dados históricos para calcular performance atual
    const historicalData = await this.getHistoricalData(affiliateId);
    const currentPerformance = this.calculateCurrentPerformance(historicalData);

    // Calcular requisitos para o nível alvo
    const requirements = this.calculateLevelRequirements(targetLevel);
    
    // Calcular gap atual
    const indicationsGap = Math.max(0, requirements.indications - currentPerformance.monthlyIndications);
    const revenueGap = Math.max(0, requirements.revenue - currentPerformance.monthlyRevenue);

    // Estimar tempo necessário baseado na performance atual
    const estimatedTimeToTarget = this.estimateTimeToTarget(
      currentPerformance,
      requirements,
      currentLevel,
      targetLevel
    );

    // Calcular benefícios da progressão
    const progressionBenefits = this.calculateProgressionBenefits(currentLevel, targetLevel);

    // Calcular investimento necessário
    const investmentRequired = this.calculateInvestmentRequired(indicationsGap, revenueGap);

    // Calcular ROI
    const monthlyIncrease = progressionBenefits.reduce((sum, benefit) => 
      sum + benefit.estimatedMonthlyIncrease, 0
    );
    const roi = investmentRequired > 0 ? (monthlyIncrease * 12) / investmentRequired : 0;

    return {
      currentLevel,
      targetLevel,
      requiredIndications: indicationsGap,
      requiredRevenue: revenueGap,
      estimatedTimeToTarget,
      progressionBenefits,
      investmentRequired,
      roi
    };
  }

  /**
   * Análise comparativa de estratégias
   */
  async compareStrategies(
    affiliateId: string,
    strategies: string[]
  ): Promise<ComparisonAnalysis> {
    
    const strategyComparisons = [];
    
    for (const strategy of strategies) {
      const comparison = await this.analyzeStrategy(affiliateId, strategy);
      strategyComparisons.push(comparison);
    }

    // Gerar recomendações baseadas na comparação
    const recommendations = this.generateStrategyRecommendations(strategyComparisons);

    // Determinar estratégia ótima
    const optimalStrategy = this.determineOptimalStrategy(strategyComparisons);

    // Análise de risco vs recompensa
    const riskVsReward = this.analyzeRiskVsReward(strategyComparisons);

    return {
      strategies: strategyComparisons,
      recommendations,
      optimalStrategy,
      riskVsReward
    };
  }

  /**
   * Gera sugestões de otimização
   */
  async generateOptimizationSuggestions(
    affiliateId: string,
    simulationResult: SimulationResult
  ): Promise<OptimizationSuggestion[]> {
    
    const suggestions: OptimizationSuggestion[] = [];
    const historicalData = await this.getHistoricalData(affiliateId);
    const currentPerformance = this.calculateCurrentPerformance(historicalData);

    // Sugestão de aumento de indicações
    if (currentPerformance.monthlyIndications < 50) {
      suggestions.push({
        type: 'indication_increase',
        title: 'Aumentar Número de Indicações',
        description: 'Foque em estratégias para aumentar o volume de indicações mensais',
        expectedImpact: this.calculateIndicationImpact(currentPerformance.monthlyIndications),
        implementationCost: 500,
        timeToImplement: 30,
        difficulty: 'medium',
        priority: 'high'
      });
    }

    // Sugestão de melhoria de conversão
    if (currentPerformance.conversionRate < 0.3) {
      suggestions.push({
        type: 'conversion_improvement',
        title: 'Melhorar Taxa de Conversão',
        description: 'Otimize a qualidade dos leads e processo de conversão',
        expectedImpact: this.calculateConversionImpact(currentPerformance.conversionRate),
        implementationCost: 300,
        timeToImplement: 15,
        difficulty: 'easy',
        priority: 'high'
      });
    }

    // Sugestão de boost de retenção
    if (currentPerformance.retentionRate < 0.7) {
      suggestions.push({
        type: 'retention_boost',
        title: 'Aumentar Retenção de Clientes',
        description: 'Implemente estratégias de follow-up e engajamento',
        expectedImpact: this.calculateRetentionImpact(currentPerformance.retentionRate),
        implementationCost: 200,
        timeToImplement: 20,
        difficulty: 'medium',
        priority: 'medium'
      });
    }

    // Sugestão de progressão de nível
    const nextLevel = this.getNextLevel(affiliateId);
    if (nextLevel) {
      suggestions.push({
        type: 'level_progression',
        title: `Progredir para Nível ${nextLevel}`,
        description: 'Foque nos requisitos para alcançar o próximo nível',
        expectedImpact: this.calculateLevelProgressionImpact(nextLevel),
        implementationCost: 1000,
        timeToImplement: 60,
        difficulty: 'hard',
        priority: 'medium'
      });
    }

    // Ordenar por prioridade e impacto
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.expectedImpact - a.expectedImpact;
    });
  }

  /**
   * Métodos auxiliares privados
   */
  private async getHistoricalData(affiliateId: string): Promise<HistoricalData[]> {
    // Implementação simplificada - em produção viria do banco
    return [
      {
        affiliateId,
        period: '2025-05',
        indications: 25,
        revenue: 12500,
        commissions: 3750,
        conversionRate: 0.28,
        retentionRate: 0.65,
        averagePlayerValue: 500
      },
      {
        affiliateId,
        period: '2025-04',
        indications: 22,
        revenue: 11000,
        commissions: 3300,
        conversionRate: 0.25,
        retentionRate: 0.62,
        averagePlayerValue: 500
      }
    ];
  }

  private async getMarketData(): Promise<MarketData[]> {
    // Implementação simplificada - em produção viria de APIs externas
    return [
      {
        period: '2025-06',
        marketTrend: 1.05,
        competitionLevel: 0.8,
        seasonalityFactor: 1.1,
        economicIndicators: {
          gdpGrowth: 2.5,
          inflationRate: 3.2,
          unemploymentRate: 5.8,
          consumerConfidence: 85,
          disposableIncome: 1.03
        }
      }
    ];
  }

  private generateSimulationSummary(projections: any[], scenarios: any[]): SimulationSummary {
    const totalCommissions = projections.reduce((sum, p) => sum + p.projectedCommissions.totalCommissions, 0);
    const averageMonthly = totalCommissions / projections.length;
    
    const scenarioCommissions = scenarios.map(s => s.projectedCommissions);
    const bestCase = scenarioCommissions.length > 0 ? Math.max(...scenarioCommissions) : totalCommissions * 1.2;
    const worstCase = scenarioCommissions.length > 0 ? Math.min(...scenarioCommissions) : totalCommissions * 0.8;
    const mostLikely = totalCommissions;

    return {
      totalProjectedCommissions: totalCommissions,
      averageMonthlyCommissions: averageMonthly,
      bestCaseScenario: bestCase,
      worstCaseScenario: worstCase,
      mostLikelyScenario: mostLikely,
      riskAssessment: {
        overallRisk: this.assessOverallRisk(projections, scenarios),
        volatility: this.calculateVolatility(scenarioCommissions),
        marketRisk: 0.3,
        competitionRisk: 0.4,
        retentionRisk: 0.2,
        riskFactors: ['Competição crescente', 'Volatilidade do mercado'],
        mitigationStrategies: ['Diversificar estratégias', 'Focar em qualidade']
      },
      keyInsights: [
        'Crescimento consistente projetado',
        'Oportunidade de otimização na conversão',
        'Potencial de expansão da rede'
      ],
      optimizationSuggestions: [
        'Aumentar foco em indicações de qualidade',
        'Implementar estratégias de retenção',
        'Considerar progressão de nível'
      ]
    };
  }

  private async generateRecommendations(
    request: SimulationRequest,
    projections: any[],
    scenarios: any[],
    historicalData: HistoricalData[]
  ): Promise<string[]> {
    
    const recommendations: string[] = [];
    
    // Análise de performance atual vs projetada
    const currentPerformance = this.calculateCurrentPerformance(historicalData);
    const projectedPerformance = projections[0];

    if (projectedPerformance.projectedCommissions.totalCommissions > currentPerformance.monthlyCommissions * 1.2) {
      recommendations.push('Excelente potencial de crescimento identificado - mantenha o foco na estratégia atual');
    }

    if (request.parameters.conversionRate && request.parameters.conversionRate < 0.3) {
      recommendations.push('Considere investir em melhorias na qualidade dos leads para aumentar a conversão');
    }

    if (request.simulationType === 'cpa' && request.parameters.expectedIndications && request.parameters.expectedIndications < 30) {
      recommendations.push('Para maximizar CPA, foque em aumentar o volume de indicações mensais');
    }

    if (request.simulationType === 'revshare') {
      recommendations.push('Para RevShare, priorize a retenção e valor de vida dos clientes indicados');
    }

    return recommendations;
  }

  private calculateOverallConfidence(projections: any[], parameters: any): number {
    // Confiança baseada na qualidade dos parâmetros e consistência das projeções
    const avgConfidence = projections.reduce((sum, p) => sum + p.confidence, 0) / projections.length;
    return Math.min(1.0, avgConfidence);
  }

  private calculateCurrentPerformance(historicalData: HistoricalData[]) {
    if (historicalData.length === 0) {
      return {
        monthlyIndications: 0,
        monthlyRevenue: 0,
        monthlyCommissions: 0,
        conversionRate: 0.3,
        retentionRate: 0.7
      };
    }

    const latest = historicalData[0];
    return {
      monthlyIndications: latest.indications,
      monthlyRevenue: latest.revenue,
      monthlyCommissions: latest.commissions,
      conversionRate: latest.conversionRate,
      retentionRate: latest.retentionRate
    };
  }

  private calculateLevelRequirements(level: number) {
    // Requisitos simplificados por nível
    const baseIndications = 10;
    const baseRevenue = 5000;
    
    return {
      indications: baseIndications * Math.pow(1.5, level - 1),
      revenue: baseRevenue * Math.pow(1.4, level - 1)
    };
  }

  private estimateTimeToTarget(current: any, requirements: any, currentLevel: number, targetLevel: number): number {
    const indicationsGap = Math.max(0, requirements.indications - current.monthlyIndications);
    const revenueGap = Math.max(0, requirements.revenue - current.monthlyRevenue);
    
    const indicationsTime = current.monthlyIndications > 0 ? indicationsGap / current.monthlyIndications : 12;
    const revenueTime = current.monthlyRevenue > 0 ? revenueGap / current.monthlyRevenue : 12;
    
    return Math.max(indicationsTime, revenueTime) * 30; // Converter para dias
  }

  private calculateProgressionBenefits(currentLevel: number, targetLevel: number) {
    const benefits = [];
    
    for (let level = currentLevel + 1; level <= targetLevel; level++) {
      benefits.push({
        level,
        cpaRateIncrease: level * 10, // R$ 10 por nível
        revshareIncrease: level * 0.5, // 0.5% por nível
        bonusUnlocked: level * 500, // R$ 500 por nível
        privilegesUnlocked: [`Acesso nível ${level}`, `Suporte prioritário nível ${level}`],
        estimatedMonthlyIncrease: level * 200 // R$ 200 por nível
      });
    }
    
    return benefits;
  }

  private calculateInvestmentRequired(indicationsGap: number, revenueGap: number): number {
    // Custo estimado por indicação: R$ 20
    // Custo estimado por R$ 1000 de receita: R$ 50
    return (indicationsGap * 20) + (revenueGap / 1000 * 50);
  }

  private async analyzeStrategy(affiliateId: string, strategy: string) {
    // Implementação simplificada de análise de estratégia
    const baseCommissions = 5000;
    const strategies: any = {
      'conservative': {
        strategyName: 'Conservadora',
        description: 'Foco em qualidade e baixo risco',
        projectedCommissions: baseCommissions * 0.8,
        requiredInvestment: 500,
        timeToBreakeven: 60,
        riskLevel: 'low' as const,
        pros: ['Baixo risco', 'Resultados previsíveis'],
        cons: ['Crescimento lento', 'Menor potencial']
      },
      'aggressive': {
        strategyName: 'Agressiva',
        description: 'Foco em volume e crescimento rápido',
        projectedCommissions: baseCommissions * 1.5,
        requiredInvestment: 2000,
        timeToBreakeven: 90,
        riskLevel: 'high' as const,
        pros: ['Alto potencial', 'Crescimento rápido'],
        cons: ['Alto risco', 'Investimento elevado']
      }
    };

    return strategies[strategy] || strategies['conservative'];
  }

  private generateStrategyRecommendations(comparisons: any[]) {
    return [
      {
        strategy: 'Híbrida',
        reasoning: 'Combinar elementos de diferentes estratégias',
        expectedOutcome: 'Equilibrio entre risco e retorno',
        timeframe: '3-6 meses',
        confidence: 0.8
      }
    ];
  }

  private determineOptimalStrategy(comparisons: any[]): string {
    // Lógica simplificada para determinar estratégia ótima
    return comparisons.reduce((best, current) => 
      current.projectedCommissions / current.requiredInvestment > 
      best.projectedCommissions / best.requiredInvestment ? current : best
    ).strategyName;
  }

  private analyzeRiskVsReward(comparisons: any[]) {
    const lowRisk = comparisons.find(c => c.riskLevel === 'low');
    const mediumRisk = comparisons.find(c => c.riskLevel === 'medium');
    const highRisk = comparisons.find(c => c.riskLevel === 'high');

    return {
      lowRiskLowReward: lowRisk || comparisons[0],
      mediumRiskMediumReward: mediumRisk || comparisons[0],
      highRiskHighReward: highRisk || comparisons[0],
      recommendedBalance: 'Estratégia híbrida com 70% conservadora e 30% agressiva'
    };
  }

  private assessOverallRisk(projections: any[], scenarios: any[]): 'low' | 'medium' | 'high' {
    const volatility = this.calculateVolatility(scenarios.map(s => s.projectedCommissions));
    if (volatility < 0.2) return 'low';
    if (volatility < 0.4) return 'medium';
    return 'high';
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }

  private calculateIndicationImpact(current: number): number {
    return (50 - current) * 150; // R$ 150 por indicação adicional
  }

  private calculateConversionImpact(current: number): number {
    return (0.35 - current) * 10000; // Impacto na receita
  }

  private calculateRetentionImpact(current: number): number {
    return (0.8 - current) * 5000; // Impacto na receita recorrente
  }

  private getNextLevel(affiliateId: string): number | null {
    // Implementação simplificada - em produção viria do banco
    return 3; // Próximo nível
  }

  private calculateLevelProgressionImpact(level: number): number {
    return level * 1000; // R$ 1000 por nível
  }
}

