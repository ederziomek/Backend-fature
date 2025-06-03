// Utilitário para cálculo dinâmico de categoria de afiliado
// Sistema Fature - Baseado em validated_referrals

export enum AffiliateCategory {
  JOGADOR = 'jogador',
  INICIANTE = 'iniciante', 
  AFILIADO = 'afiliado',
  PROFISSIONAL = 'profissional',
  EXPERT = 'expert',
  MESTRE = 'mestre',
  LENDA = 'lenda'
}

export interface CategoryConfig {
  category: AffiliateCategory;
  level: number;
  minReferrals: number;
  maxReferrals: number;
  revTotal: number;
  revLevel1: number;
  revLevels2to5: number;
}

// Estrutura completa de categorias baseada no commission-structure.ts
const CATEGORY_STRUCTURE: CategoryConfig[] = [
  // JOGADOR
  { category: AffiliateCategory.JOGADOR, level: 1, minReferrals: 0, maxReferrals: 4, revTotal: 5.00, revLevel1: 1.00, revLevels2to5: 1.00 },
  { category: AffiliateCategory.JOGADOR, level: 2, minReferrals: 5, maxReferrals: 10, revTotal: 10.00, revLevel1: 6.00, revLevels2to5: 1.00 },
  
  // INICIANTE
  { category: AffiliateCategory.INICIANTE, level: 1, minReferrals: 11, maxReferrals: 20, revTotal: 14.00, revLevel1: 6.00, revLevels2to5: 2.00 },
  { category: AffiliateCategory.INICIANTE, level: 2, minReferrals: 21, maxReferrals: 30, revTotal: 20.00, revLevel1: 12.00, revLevels2to5: 2.00 },
  
  // AFILIADO
  { category: AffiliateCategory.AFILIADO, level: 1, minReferrals: 31, maxReferrals: 40, revTotal: 24.00, revLevel1: 12.00, revLevels2to5: 3.00 },
  { category: AffiliateCategory.AFILIADO, level: 2, minReferrals: 41, maxReferrals: 50, revTotal: 25.00, revLevel1: 13.00, revLevels2to5: 3.00 },
  { category: AffiliateCategory.AFILIADO, level: 3, minReferrals: 51, maxReferrals: 60, revTotal: 26.00, revLevel1: 14.00, revLevels2to5: 3.00 },
  { category: AffiliateCategory.AFILIADO, level: 4, minReferrals: 61, maxReferrals: 70, revTotal: 27.00, revLevel1: 15.00, revLevels2to5: 3.00 },
  { category: AffiliateCategory.AFILIADO, level: 5, minReferrals: 71, maxReferrals: 80, revTotal: 28.00, revLevel1: 16.00, revLevels2to5: 3.00 },
  { category: AffiliateCategory.AFILIADO, level: 6, minReferrals: 81, maxReferrals: 90, revTotal: 29.00, revLevel1: 17.00, revLevels2to5: 3.00 },
  { category: AffiliateCategory.AFILIADO, level: 7, minReferrals: 91, maxReferrals: 100, revTotal: 30.00, revLevel1: 18.00, revLevels2to5: 3.00 },
  
  // PROFISSIONAL (30 levels)
  { category: AffiliateCategory.PROFISSIONAL, level: 1, minReferrals: 101, maxReferrals: 130, revTotal: 34.00, revLevel1: 18.00, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 2, minReferrals: 131, maxReferrals: 160, revTotal: 34.21, revLevel1: 18.21, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 3, minReferrals: 161, maxReferrals: 190, revTotal: 34.41, revLevel1: 18.41, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 4, minReferrals: 191, maxReferrals: 220, revTotal: 34.62, revLevel1: 18.62, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 5, minReferrals: 221, maxReferrals: 250, revTotal: 34.83, revLevel1: 18.83, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 6, minReferrals: 251, maxReferrals: 280, revTotal: 35.03, revLevel1: 19.03, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 7, minReferrals: 281, maxReferrals: 310, revTotal: 35.24, revLevel1: 19.24, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 8, minReferrals: 311, maxReferrals: 340, revTotal: 35.45, revLevel1: 19.45, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 9, minReferrals: 341, maxReferrals: 370, revTotal: 35.66, revLevel1: 19.66, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 10, minReferrals: 371, maxReferrals: 400, revTotal: 35.86, revLevel1: 19.86, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 11, minReferrals: 401, maxReferrals: 430, revTotal: 36.07, revLevel1: 20.07, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 12, minReferrals: 431, maxReferrals: 460, revTotal: 36.28, revLevel1: 20.28, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 13, minReferrals: 461, maxReferrals: 490, revTotal: 36.48, revLevel1: 20.48, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 14, minReferrals: 491, maxReferrals: 520, revTotal: 36.69, revLevel1: 20.69, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 15, minReferrals: 521, maxReferrals: 550, revTotal: 36.90, revLevel1: 20.90, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 16, minReferrals: 551, maxReferrals: 580, revTotal: 37.10, revLevel1: 21.10, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 17, minReferrals: 581, maxReferrals: 610, revTotal: 37.31, revLevel1: 21.31, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 18, minReferrals: 611, maxReferrals: 640, revTotal: 37.52, revLevel1: 21.52, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 19, minReferrals: 641, maxReferrals: 670, revTotal: 37.72, revLevel1: 21.72, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 20, minReferrals: 671, maxReferrals: 700, revTotal: 37.93, revLevel1: 21.93, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 21, minReferrals: 701, maxReferrals: 730, revTotal: 38.14, revLevel1: 22.14, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 22, minReferrals: 731, maxReferrals: 760, revTotal: 38.34, revLevel1: 22.34, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 23, minReferrals: 761, maxReferrals: 790, revTotal: 38.55, revLevel1: 22.55, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 24, minReferrals: 791, maxReferrals: 820, revTotal: 38.76, revLevel1: 22.76, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 25, minReferrals: 821, maxReferrals: 850, revTotal: 38.97, revLevel1: 22.97, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 26, minReferrals: 851, maxReferrals: 880, revTotal: 39.17, revLevel1: 23.17, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 27, minReferrals: 881, maxReferrals: 910, revTotal: 39.38, revLevel1: 23.38, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 28, minReferrals: 911, maxReferrals: 940, revTotal: 39.59, revLevel1: 23.59, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 29, minReferrals: 941, maxReferrals: 970, revTotal: 39.79, revLevel1: 23.79, revLevels2to5: 4.00 },
  { category: AffiliateCategory.PROFISSIONAL, level: 30, minReferrals: 971, maxReferrals: 1000, revTotal: 40.00, revLevel1: 24.00, revLevels2to5: 4.00 },
  
  // EXPERT (exemplo de alguns níveis)
  { category: AffiliateCategory.EXPERT, level: 1, minReferrals: 1001, maxReferrals: 1100, revTotal: 44.00, revLevel1: 24.00, revLevels2to5: 5.00 },
  { category: AffiliateCategory.EXPERT, level: 2, minReferrals: 1101, maxReferrals: 1200, revTotal: 44.07, revLevel1: 24.07, revLevels2to5: 5.00 },
  { category: AffiliateCategory.EXPERT, level: 90, minReferrals: 9901, maxReferrals: 10000, revTotal: 50.00, revLevel1: 30.00, revLevels2to5: 5.00 },
  
  // MESTRE (exemplo de alguns níveis)
  { category: AffiliateCategory.MESTRE, level: 1, minReferrals: 10001, maxReferrals: 11000, revTotal: 54.00, revLevel1: 30.00, revLevels2to5: 6.00 },
  { category: AffiliateCategory.MESTRE, level: 2, minReferrals: 11001, maxReferrals: 12000, revTotal: 54.07, revLevel1: 30.07, revLevels2to5: 6.00 },
  { category: AffiliateCategory.MESTRE, level: 90, minReferrals: 99001, maxReferrals: 100000, revTotal: 69.33, revLevel1: 41.33, revLevels2to5: 7.00 },
  
  // LENDA (exemplo de alguns níveis)
  { category: AffiliateCategory.LENDA, level: 1, minReferrals: 100001, maxReferrals: 110000, revTotal: 60.00, revLevel1: 36.00, revLevels2to5: 6.00 },
  { category: AffiliateCategory.LENDA, level: 2, minReferrals: 110001, maxReferrals: 120000, revTotal: 60.07, revLevel1: 36.07, revLevels2to5: 6.00 },
  { category: AffiliateCategory.LENDA, level: 90, minReferrals: 990001, maxReferrals: 999999999, revTotal: 70.00, revLevel1: 42.00, revLevels2to5: 7.00 },
];

/**
 * Calcula a categoria e nível do afiliado baseado no número de referrals validados
 * @param validatedReferrals Número de referrals validados do afiliado
 * @returns Configuração da categoria encontrada
 */
export function calculateAffiliateCategory(validatedReferrals: number): CategoryConfig {
  for (const config of CATEGORY_STRUCTURE) {
    if (validatedReferrals >= config.minReferrals && validatedReferrals <= config.maxReferrals) {
      return config;
    }
  }
  
  // Se não encontrar, retorna a configuração inicial (Jogador Level 1)
  return CATEGORY_STRUCTURE[0] || {
    category: AffiliateCategory.JOGADOR,
    level: 1,
    minReferrals: 0,
    maxReferrals: 4,
    revTotal: 5.00,
    revLevel1: 1.00,
    revLevels2to5: 1.00
  };
}

/**
 * Obtém apenas a categoria do afiliado
 * @param validatedReferrals Número de referrals validados do afiliado
 * @returns Categoria do afiliado
 */
export function getAffiliateCategory(validatedReferrals: number): AffiliateCategory {
  const config = calculateAffiliateCategory(validatedReferrals);
  return config.category;
}

/**
 * Obtém o nível do afiliado dentro da categoria
 * @param validatedReferrals Número de referrals validados do afiliado
 * @returns Nível do afiliado
 */
export function getAffiliateCategoryLevel(validatedReferrals: number): number {
  const config = calculateAffiliateCategory(validatedReferrals);
  return config.level;
}

/**
 * Obtém as configurações de RevShare para o afiliado
 * @param validatedReferrals Número de referrals validados do afiliado
 * @returns Configurações de RevShare
 */
export function getRevShareConfig(validatedReferrals: number): {
  revTotal: number;
  revLevel1: number;
  revLevels2to5: number;
} {
  const config = calculateAffiliateCategory(validatedReferrals);
  return {
    revTotal: config.revTotal,
    revLevel1: config.revLevel1,
    revLevels2to5: config.revLevels2to5
  };
}

/**
 * Calcula a comissão RevShare baseada no nível e NGR
 * @param validatedReferrals Número de referrals validados do afiliado
 * @param level Nível na hierarquia (1-5)
 * @param ngrAmount Valor do NGR
 * @returns Valor da comissão
 */
export function calculateRevShare(validatedReferrals: number, level: number, ngrAmount: number): number {
  const config = getRevShareConfig(validatedReferrals);
  
  if (level === 1) {
    return (ngrAmount * config.revLevel1) / 100;
  } else if (level >= 2 && level <= 5) {
    return (ngrAmount * config.revLevels2to5) / 100;
  }
  
  return 0;
}

/**
 * Tipo auxiliar para incluir categoria calculada em objetos Affiliate
 */
export interface AffiliateWithCategory {
  id: string;
  validatedReferrals: number;
  category: AffiliateCategory;
  categoryLevel: number;
  // ... outros campos do Affiliate
}

/**
 * Adiciona informações de categoria a um objeto affiliate
 * @param affiliate Objeto affiliate do Prisma
 * @returns Affiliate com categoria calculada
 */
export function enrichAffiliateWithCategory(affiliate: { validatedReferrals: number; [key: string]: any }): AffiliateWithCategory {
  const config = calculateAffiliateCategory(affiliate.validatedReferrals);
  
  return {
    ...affiliate,
    category: config.category,
    categoryLevel: config.level
  } as AffiliateWithCategory;
}

