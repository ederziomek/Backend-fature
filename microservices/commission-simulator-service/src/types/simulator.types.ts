// ===============================================
// TIPOS - COMMISSION SIMULATOR SERVICE
// ===============================================

export interface SimulationRequest {
  affiliateId: string;
  simulationType: 'cpa' | 'revshare' | 'hybrid' | 'progression';
  timeframe: 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  parameters: SimulationParameters;
  scenarios?: Scenario[];
}

export interface SimulationParameters {
  // Parâmetros CPA
  cpaRate?: number;
  expectedIndications?: number;
  conversionRate?: number;
  
  // Parâmetros RevShare
  revsharePercentage?: number;
  expectedRevenue?: number;
  playerRetentionRate?: number;
  averagePlayerValue?: number;
  
  // Parâmetros de Progressão
  currentLevel?: number;
  targetLevel?: number;
  progressionBonus?: number;
  
  // Parâmetros de Tempo
  startDate?: Date;
  endDate?: Date;
  customPeriodDays?: number;
  
  // Fatores de Crescimento
  growthRate?: number;
  seasonalityFactor?: number;
  marketTrends?: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-1
  parameters: SimulationParameters;
  adjustments: ScenarioAdjustments;
}

export interface ScenarioAdjustments {
  indicationsMultiplier?: number;
  revenueMultiplier?: number;
  conversionRateAdjustment?: number;
  retentionRateAdjustment?: number;
  marketConditions?: 'bull' | 'bear' | 'stable';
  competitionLevel?: 'low' | 'medium' | 'high';
}

export interface SimulationResult {
  id: string;
  affiliateId: string;
  simulationType: string;
  timeframe: string;
  parameters: SimulationParameters;
  projections: CommissionProjection[];
  scenarios: ScenarioResult[];
  summary: SimulationSummary;
  recommendations: string[];
  confidence: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface CommissionProjection {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  projectedIndications: number;
  projectedRevenue: number;
  projectedCommissions: CommissionBreakdown;
  cumulativeCommissions: number;
  confidence: number;
  factors: ProjectionFactors;
}

export interface CommissionBreakdown {
  cpaCommissions: number;
  revshareCommissions: number;
  bonusCommissions: number;
  progressionBonus: number;
  totalCommissions: number;
}

export interface ProjectionFactors {
  baseRate: number;
  growthFactor: number;
  seasonalityFactor: number;
  marketFactor: number;
  competitionFactor: number;
  retentionFactor: number;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  probability: number;
  projectedCommissions: number;
  projectedRevenue: number;
  projectedIndications: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
}

export interface SimulationSummary {
  totalProjectedCommissions: number;
  averageMonthlyCommissions: number;
  bestCaseScenario: number;
  worstCaseScenario: number;
  mostLikelyScenario: number;
  riskAssessment: RiskAssessment;
  keyInsights: string[];
  optimizationSuggestions: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  volatility: number;
  marketRisk: number;
  competitionRisk: number;
  retentionRisk: number;
  riskFactors: string[];
  mitigationStrategies: string[];
}

export interface ProgressionAnalysis {
  currentLevel: number;
  targetLevel: number;
  requiredIndications: number;
  requiredRevenue: number;
  estimatedTimeToTarget: number; // days
  progressionBenefits: ProgressionBenefit[];
  investmentRequired: number;
  roi: number;
}

export interface ProgressionBenefit {
  level: number;
  cpaRateIncrease: number;
  revshareIncrease: number;
  bonusUnlocked: number;
  privilegesUnlocked: string[];
  estimatedMonthlyIncrease: number;
}

export interface ComparisonAnalysis {
  strategies: StrategyComparison[];
  recommendations: StrategyRecommendation[];
  optimalStrategy: string;
  riskVsReward: RiskRewardAnalysis;
}

export interface StrategyComparison {
  strategyName: string;
  description: string;
  projectedCommissions: number;
  requiredInvestment: number;
  timeToBreakeven: number;
  riskLevel: 'low' | 'medium' | 'high';
  pros: string[];
  cons: string[];
}

export interface StrategyRecommendation {
  strategy: string;
  reasoning: string;
  expectedOutcome: string;
  timeframe: string;
  confidence: number;
}

export interface RiskRewardAnalysis {
  lowRiskLowReward: StrategyComparison;
  mediumRiskMediumReward: StrategyComparison;
  highRiskHighReward: StrategyComparison;
  recommendedBalance: string;
}

export interface HistoricalData {
  affiliateId: string;
  period: string;
  indications: number;
  revenue: number;
  commissions: number;
  conversionRate: number;
  retentionRate: number;
  averagePlayerValue: number;
}

export interface MarketData {
  period: string;
  marketTrend: number;
  competitionLevel: number;
  seasonalityFactor: number;
  economicIndicators: EconomicIndicators;
}

export interface EconomicIndicators {
  gdpGrowth: number;
  inflationRate: number;
  unemploymentRate: number;
  consumerConfidence: number;
  disposableIncome: number;
}

export interface SimulationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'conservative' | 'moderate' | 'aggressive' | 'custom';
  defaultParameters: SimulationParameters;
  defaultScenarios: Omit<Scenario, 'id'>[];
  isPublic: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OptimizationSuggestion {
  type: 'indication_increase' | 'conversion_improvement' | 'retention_boost' | 'level_progression';
  title: string;
  description: string;
  expectedImpact: number;
  implementationCost: number;
  timeToImplement: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'low' | 'medium' | 'high';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp: Date;
  };
}

