/**
 * Utilitários para cálculos de comissões de afiliados
 * Baseado na metodologia correta com categorias e sistema multinível
 */

// Configuração das categorias de afiliados
export const AFFILIATE_CATEGORIES = {
  JOGADOR: {
    revLevel1: 1,
    revLevels2to5: 1,
    minIndications: 0,
    commissionPercentage: 5
  },
  INICIANTE: {
    revLevel1: 6,
    revLevels2to5: 1,
    minIndications: 5,
    commissionPercentage: 10
  },
  REGULAR: {
    revLevel1: 12,
    revLevels2to5: 2,
    minIndications: 10,
    commissionPercentage: 20
  },
  PROFISSIONAL: {
    revLevel1: 18,
    revLevels2to5: 3,
    minIndications: 50,
    commissionPercentage: 30
  },
  EXPERT: {
    revLevel1: 30,
    revLevels2to5: 5,
    minIndications: 1000,
    commissionPercentage: 50
  },
  ELITE: {
    revLevel1: 24,
    revLevels2to5: 4,
    minIndications: 100,
    commissionPercentage: 40
  },
  MESTRE: {
    revLevel1: 36,
    revLevels2to5: 6,
    minIndications: 10000,
    commissionPercentage: 60
  },
  LENDÁRIO: {
    revLevel1: 42,
    revLevels2to5: 7,
    minIndications: 100000,
    commissionPercentage: 70
  }
} as const;

// CPA fixo por nível
export const CPA_VALUES = {
  1: 50.00,
  2: 20.00,
  3: 5.00,
  4: 5.00,
  5: 5.00
} as const;

// Valores corretos do sistema
export const CORRECT_METRICS = {
  totalClients: 23251,
  cacCPA: 1676115.00,
  cacREV: 241537.00,
  cacTotal: 1917652.00,
  ltvTotal: 1603225.00, // NGR real
  ngrCalculation: '(GGR - chargeback) × 0.8',
  period: '12/03/2025 - 20/07/2025'
} as const;

export type AffiliateCategory = keyof typeof AFFILIATE_CATEGORIES;

/**
 * Calcula o REV para um afiliado baseado na categoria e nível
 */
export function calculateREVForAffiliate(
  category: AffiliateCategory,
  ngrAmount: number,
  level: number
): number {
  const categoryConfig = AFFILIATE_CATEGORIES[category];
  if (!categoryConfig) return 0;

  let percentage: number;
  if (level === 1) {
    percentage = categoryConfig.revLevel1;
  } else if (level >= 2 && level <= 5) {
    percentage = categoryConfig.revLevels2to5;
  } else {
    return 0;
  }

  return (ngrAmount * percentage) / 100;
}

/**
 * Retorna o valor CPA fixo para o nível
 */
export function calculateCPAForLevel(level: number): number {
  return CPA_VALUES[level as keyof typeof CPA_VALUES] || 0;
}

/**
 * Calcula o score de fraude baseado em indicadores
 */
export function calculateFraudScore(affiliateData: {
  totalClients: number;
  ngrTotal: number;
  totalReceived: number;
  level1Clients: number;
}): number {
  let score = 0;
  const { totalClients, ngrTotal, totalReceived, level1Clients } = affiliateData;

  // NGR muito baixo por cliente
  if (totalClients > 0) {
    const ngrPerClient = ngrTotal / totalClients;
    if (ngrPerClient < 10) { // Menos de R$ 10 por cliente
      score += 30;
    }
  }

  // Comissão maior que NGR
  if (totalReceived > ngrTotal && ngrTotal > 0) {
    score += 50;
  }

  // Muitos clientes com NGR zero
  if (totalClients > 10 && ngrTotal === 0) {
    score += 40;
  }

  // Padrão suspeito de crescimento
  if (totalClients > 100 && level1Clients === totalClients) {
    score += 20; // Todos os clientes no nível 1
  }

  return Math.min(100, score);
}

/**
 * Processa dados de um afiliado aplicando a metodologia correta
 */
export function processAffiliateData(affiliateRaw: any) {
  const category = affiliateRaw.classification as AffiliateCategory;
  const affiliateData = {
    externalAffiliateId: affiliateRaw.external_affiliate_id,
    classification: category,
    totalClients: affiliateRaw.total_clients || 0,
    ngrTotal: affiliateRaw.ngr_total || 0,
    createdAt: new Date()
  };

  // Calcular comissões por nível
  let totalCPA = 0;
  let totalREV = 0;
  const levelData: any = {};

  for (let level = 1; level <= 5; level++) {
    const clientsLevel = affiliateRaw[`level_${level}_clients`] || 0;
    const ngrLevel = affiliateRaw[`level_${level}_ngr`] || 0;

    if (clientsLevel > 0) {
      // CPA por cliente
      const cpaLevel = clientsLevel * calculateCPAForLevel(level);
      totalCPA += cpaLevel;

      // REV baseado no NGR e categoria
      const revLevel = calculateREVForAffiliate(category, ngrLevel, level);
      totalREV += revLevel;

      // Armazenar dados por nível
      levelData[`level${level}Clients`] = clientsLevel;
      levelData[`level${level}CPA`] = cpaLevel;
      levelData[`level${level}REV`] = revLevel;
      levelData[`level${level}NGR`] = ngrLevel;
    }
  }

  const totalReceived = totalCPA + totalREV;
  const platformProfit = Math.max(0, affiliateData.ngrTotal - totalReceived);

  // Score de fraude
  const fraudScore = calculateFraudScore({
    totalClients: affiliateData.totalClients,
    ngrTotal: affiliateData.ngrTotal,
    totalReceived,
    level1Clients: levelData.level1Clients || 0
  });

  return {
    ...affiliateData,
    ...levelData,
    cpaTotal: totalCPA,
    revTotal: totalREV,
    totalReceived,
    platformProfit,
    fraudScore
  };
}

/**
 * Valida se uma categoria de afiliado é válida
 */
export function isValidAffiliateCategory(category: string): category is AffiliateCategory {
  return category in AFFILIATE_CATEGORIES;
}

/**
 * Retorna informações de uma categoria
 */
export function getCategoryInfo(category: AffiliateCategory) {
  return AFFILIATE_CATEGORIES[category];
}

/**
 * Lista todas as categorias disponíveis
 */
export function getAllCategories(): AffiliateCategory[] {
  return Object.keys(AFFILIATE_CATEGORIES) as AffiliateCategory[];
}

