export interface DailyProgress {
  affiliateId: string;
  currentDay: number;
  cycleStartDate: Date;
  completedDays: boolean[];
  nextReward: number;
  cycleComplete: boolean;
  lastIndicationDate?: Date;
}

export interface WeeklyGoals {
  affiliateId: string;
  weekStartDate: Date;
  silver: ChestGoal;
  gold: ChestGoal;
  sapphire: ChestGoal;
  diamond: ChestGoal;
  resetDate: Date;
  createdAt: Date;
}

export interface ChestGoal {
  goal: number;
  reward: number;
  completed: boolean;
  completedAt?: Date;
}

export interface ChestReward {
  chestType: 'silver' | 'gold' | 'sapphire' | 'diamond';
  amount: number;
  affiliateId: string;
  goalAchieved: number;
  rewardedAt: Date;
}

export interface PotentialAnalysis {
  affiliateId: string;
  historicalAverage: number;
  trendDirection: 'up' | 'down' | 'stable';
  seasonalityFactor: number;
  confidenceLevel: number;
  recommendedGoals: {
    silver: number;
    gold: number;
    sapphire: number;
    diamond: number;
  };
  analysisDate: Date;
}

export interface PersonalizedGoals {
  affiliateId: string;
  weekStartDate: Date;
  goals: {
    silver: number;
    gold: number;
    sapphire: number;
    diamond: number;
  };
  rewards: {
    silver: number;
    gold: number;
    sapphire: number;
    diamond: number;
  };
  generatedAt: Date;
}

export interface WeekData {
  affiliateId: string;
  weekStartDate: Date;
  totalIndications: number;
  validIndications: number;
  revenue: number;
  conversionRate: number;
}

export interface DailyIndicationConfig {
  [day: string]: {
    base: number;
    bonus: number;
    total: number;
  };
}

export interface ChestConfig {
  [chestType: string]: {
    successRate: [number, number];
    type: 'financial';
  };
}

export interface AlgorithmConfig {
  historicalWindow: number;
  recentDataWeight: number;
  oldDataWeight: number;
  seasonalityFactor: number;
  trendFactor: number;
  minimumGoal: number;
}

