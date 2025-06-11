export interface ConfigurationSchema {
  categories: {
    [categoryName: string]: {
      levels: number;
      indicationRange: [number, number];
      revShareRange: [number, number];
      bonification: number;
      features: string[];
    };
  };
  cpa: {
    values: {
      level1: number;
      level2: number;
      level3: number;
      level4: number;
      level5: number;
    };
    validationCriteria: {
      option1: {
        minimumDeposit: number;
        minimumBets: number;
      };
      option2: {
        minimumDeposit: number;
        minimumGGR: number;
      };
    };
  };
  gamification: {
    dailyIndication: {
      [day: string]: {
        base: number;
        bonus: number;
        total: number;
      };
    };
    chests: {
      [chestType: string]: {
        successRate: [number, number];
        type: 'financial';
      };
    };
    algorithm: {
      historicalWindow: number;
      recentDataWeight: number;
      oldDataWeight: number;
      seasonalityFactor: number;
      trendFactor: number;
      minimumGoal: number;
    };
  };
  rankings: {
    active: {
      [rankingId: string]: {
        name: string;
        criteria: string;
        ngrPercentage: number;
        enabled: boolean;
      };
    };
    distribution: {
      weeklyPercentage: number;
      monthlyPercentage: number;
      positionRanges: {
        positions: string;
        percentage: number;
      }[];
    };
  };
  vault: {
    schedule: {
      frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
      dayOfWeek: number;
      hour: number;
      timezone: string;
    };
    limits: {
      minimumAmount: number;
      maximumAmount?: number;
    };
    distribution: {
      affiliatesPercentage: number;
      rankingsPercentage: number;
    };
  };
  security: {
    fraudDetection: {
      [categoryName: string]: {
        indicationsPerHour: number;
        flagEnabled: boolean;
      };
    };
    inactivityReduction: {
      schedule: {
        [period: string]: number; // percentage
      };
      reactivation: {
        [categoryName: string]: number; // required indications
      };
    };
  };
  system: {
    timezone: string;
    currency: string;
    language: string;
    cacheTTL: number;
    backupSchedule: string;
  };
}

export interface ConfigurationVersion {
  id: string;
  section: string;
  version: string;
  data: any;
  createdBy: string;
  createdAt: Date;
  reason: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ConfigurationUpdate {
  section: string;
  data: any;
  reason: string;
  userId: string;
}

