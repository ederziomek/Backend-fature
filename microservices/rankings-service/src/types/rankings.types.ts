// ===============================================
// TIPOS - RANKINGS SERVICE
// ===============================================

export interface Competition {
  id: string;
  name: string;
  description: string;
  type: 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  rules: CompetitionRules;
  prizes: Prize[];
  participants: string[]; // affiliate IDs
  rankings: RankingEntry[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CompetitionRules {
  eligibilityCriteria: EligibilityCriteria;
  scoringCriteria: ScoringCriteria[];
  rankingMethod: 'points' | 'revenue' | 'indications' | 'composite';
  updateFrequency: 'realtime' | 'hourly' | 'daily';
  tieBreakingRules: TieBreakingRule[];
  minimumRequirements?: MinimumRequirements;
}

export interface EligibilityCriteria {
  minimumLevel?: number;
  minimumIndications?: number;
  minimumRevenue?: number;
  excludedCategories?: string[];
  includedRegions?: string[];
  accountAgeMinimum?: number; // days
}

export interface ScoringCriteria {
  metric: 'indications' | 'revenue' | 'network_growth' | 'retention' | 'quality_score';
  weight: number; // 0-1
  multiplier?: number;
  bonusThresholds?: BonusThreshold[];
}

export interface BonusThreshold {
  threshold: number;
  bonusMultiplier: number;
  description: string;
}

export interface TieBreakingRule {
  priority: number;
  criteria: 'total_revenue' | 'indications_count' | 'account_age' | 'quality_score';
  order: 'asc' | 'desc';
}

export interface MinimumRequirements {
  minimumIndications?: number;
  minimumRevenue?: number;
  minimumActiveTime?: number; // hours
}

export interface Prize {
  id: string;
  position: number | { from: number; to: number };
  type: 'cash' | 'bonus' | 'commission_boost' | 'special_privilege';
  value: number;
  currency?: string;
  description: string;
  conditions?: string[];
  distributionMethod: 'automatic' | 'manual';
  distributedAt?: Date;
  recipients?: string[]; // affiliate IDs
}

export interface RankingEntry {
  affiliateId: string;
  position: number;
  score: number;
  metrics: RankingMetrics;
  previousPosition?: number;
  positionChange?: number;
  lastUpdated: Date;
  isEligible: boolean;
  disqualificationReason?: string;
}

export interface RankingMetrics {
  totalPoints: number;
  indications: number;
  revenue: number;
  networkGrowth: number;
  qualityScore: number;
  retentionRate: number;
  bonusPoints: number;
  penaltyPoints: number;
}

export interface AffiliateScore {
  affiliateId: string;
  competitionId: string;
  totalScore: number;
  breakdown: ScoreBreakdown;
  calculatedAt: Date;
  isValid: boolean;
  validationErrors?: string[];
}

export interface ScoreBreakdown {
  baseScore: number;
  bonusScore: number;
  penaltyScore: number;
  multiplierApplied: number;
  components: ScoreComponent[];
}

export interface ScoreComponent {
  metric: string;
  rawValue: number;
  normalizedValue: number;
  weight: number;
  contribution: number;
  bonuses: number;
  penalties: number;
}

export interface RankingHistory {
  id: string;
  competitionId: string;
  affiliateId: string;
  position: number;
  score: number;
  timestamp: Date;
  snapshot: RankingMetrics;
}

export interface PrizeDistribution {
  id: string;
  competitionId: string;
  prizeId: string;
  recipientId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  distributedAt?: Date;
  transactionId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompetitionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'standard' | 'seasonal' | 'special' | 'custom';
  defaultRules: CompetitionRules;
  defaultPrizes: Omit<Prize, 'id' | 'recipients' | 'distributedAt'>[];
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RankingConfiguration {
  globalSettings: {
    defaultUpdateFrequency: 'realtime' | 'hourly' | 'daily';
    maxActiveCompetitions: number;
    defaultCompetitionDuration: number; // days
    autoArchiveAfter: number; // days
  };
  scoringDefaults: {
    indicationsWeight: number;
    revenueWeight: number;
    networkGrowthWeight: number;
    qualityWeight: number;
    retentionWeight: number;
  };
  prizeDefaults: {
    cashPrizePercentage: number;
    bonusPrizePercentage: number;
    commissionBoostPercentage: number;
  };
}

export interface CompetitionStats {
  competitionId: string;
  totalParticipants: number;
  activeParticipants: number;
  totalPrizePool: number;
  averageScore: number;
  topScore: number;
  participationRate: number;
  completionRate: number;
  lastUpdated: Date;
}

export interface LeaderboardEntry {
  position: number;
  affiliateId: string;
  affiliateName: string;
  score: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  metrics: RankingMetrics;
  badges?: string[];
  isCurrentUser?: boolean;
}

export interface CompetitionRequest {
  name: string;
  description: string;
  type: 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  startDate: Date;
  endDate: Date;
  rules: CompetitionRules;
  prizes: Omit<Prize, 'id' | 'recipients' | 'distributedAt'>[];
  templateId?: string;
}

export interface ScoreUpdateRequest {
  competitionId: string;
  affiliateId: string;
  metrics: Partial<RankingMetrics>;
  reason?: string;
}

export interface PrizeDistributionRequest {
  competitionId: string;
  prizeId: string;
  recipientIds: string[];
  distributionMethod: 'automatic' | 'manual';
  notes?: string;
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

