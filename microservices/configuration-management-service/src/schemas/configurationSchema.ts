import { z } from 'zod';

export const CategoryConfigSchema = z.object({
  levels: z.number().min(1),
  indicationRange: z.tuple([z.number().min(0), z.number().min(0)]),
  revShareRange: z.tuple([z.number().min(0), z.number().max(100)]),
  bonification: z.number().min(0),
  features: z.array(z.string())
});

export const CPAConfigSchema = z.object({
  values: z.object({
    level1: z.number().min(0),
    level2: z.number().min(0),
    level3: z.number().min(0),
    level4: z.number().min(0),
    level5: z.number().min(0)
  }),
  validationCriteria: z.object({
    option1: z.object({
      minimumDeposit: z.number().min(0),
      minimumBets: z.number().min(0)
    }),
    option2: z.object({
      minimumDeposit: z.number().min(0),
      minimumGGR: z.number().min(0)
    })
  })
});

export const GamificationConfigSchema = z.object({
  dailyIndication: z.record(z.object({
    base: z.number().min(0),
    bonus: z.number().min(0),
    total: z.number().min(0)
  })),
  chests: z.record(z.object({
    successRate: z.tuple([z.number().min(0), z.number().max(100)]),
    type: z.literal('financial')
  })),
  algorithm: z.object({
    historicalWindow: z.number().min(1),
    recentDataWeight: z.number().min(0).max(1),
    oldDataWeight: z.number().min(0).max(1),
    seasonalityFactor: z.number().min(0),
    trendFactor: z.number().min(0),
    minimumGoal: z.number().min(0)
  })
});

export const RankingsConfigSchema = z.object({
  active: z.record(z.object({
    name: z.string(),
    criteria: z.string(),
    ngrPercentage: z.number().min(0).max(100),
    enabled: z.boolean()
  })),
  distribution: z.object({
    weeklyPercentage: z.number().min(0).max(100),
    monthlyPercentage: z.number().min(0).max(100),
    positionRanges: z.array(z.object({
      positions: z.string(),
      percentage: z.number().min(0).max(100)
    }))
  })
});

export const VaultConfigSchema = z.object({
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
    dayOfWeek: z.number().min(0).max(6),
    hour: z.number().min(0).max(23),
    timezone: z.string()
  }),
  limits: z.object({
    minimumAmount: z.number().min(0),
    maximumAmount: z.number().min(0).optional()
  }),
  distribution: z.object({
    affiliatesPercentage: z.number().min(0).max(100),
    rankingsPercentage: z.number().min(0).max(100)
  })
});

export const SecurityConfigSchema = z.object({
  fraudDetection: z.record(z.object({
    indicationsPerHour: z.number().min(0),
    flagEnabled: z.boolean()
  })),
  inactivityReduction: z.object({
    schedule: z.record(z.number().min(0).max(100)),
    reactivation: z.record(z.number().min(0))
  })
});

export const SystemConfigSchema = z.object({
  timezone: z.string(),
  currency: z.string(),
  language: z.string(),
  cacheTTL: z.number().min(0),
  backupSchedule: z.string()
});

export const ConfigurationSchemaValidator = z.object({
  categories: z.record(CategoryConfigSchema),
  cpa: CPAConfigSchema,
  gamification: GamificationConfigSchema,
  rankings: RankingsConfigSchema,
  vault: VaultConfigSchema,
  security: SecurityConfigSchema,
  system: SystemConfigSchema
});

export const ConfigurationUpdateSchema = z.object({
  section: z.string(),
  data: z.any(),
  reason: z.string(),
  userId: z.string()
});

