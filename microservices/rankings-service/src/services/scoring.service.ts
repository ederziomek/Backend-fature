// ===============================================
// SERVIÇO DE PONTUAÇÃO
// ===============================================

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { 
  AffiliateScore, 
  Competition, 
  RankingMetrics, 
  ScoreBreakdown,
  ScoreComponent,
  ScoringCriteria
} from '../types/rankings.types';

export class ScoringService {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  /**
   * Calcula pontuação para um afiliado em uma competição
   */
  async calculateScore(
    affiliateId: string, 
    competitionId: string, 
    competition: Competition
  ): Promise<AffiliateScore> {
    
    // Buscar métricas do afiliado
    const metrics = await this.getAffiliateMetrics(affiliateId, competition);
    
    // Calcular componentes da pontuação
    const components = await this.calculateScoreComponents(metrics, competition.rules.scoringCriteria);
    
    // Calcular pontuação total
    const breakdown = this.calculateScoreBreakdown(components, competition);
    
    const affiliateScore: AffiliateScore = {
      affiliateId,
      competitionId,
      totalScore: breakdown.baseScore + breakdown.bonusScore - breakdown.penaltyScore,
      breakdown,
      calculatedAt: new Date(),
      isValid: true,
      validationErrors: []
    };

    // Validar pontuação
    this.validateScore(affiliateScore, competition);

    // Salvar no cache para acesso rápido
    await this.redis.setex(
      `score:${competitionId}:${affiliateId}`,
      300, // 5 minutos
      JSON.stringify(affiliateScore)
    );

    return affiliateScore;
  }

  /**
   * Calcula pontuação para múltiplos afiliados
   */
  async calculateBatchScores(
    affiliateIds: string[], 
    competitionId: string, 
    competition: Competition
  ): Promise<AffiliateScore[]> {
    const scores: AffiliateScore[] = [];

    for (const affiliateId of affiliateIds) {
      try {
        const score = await this.calculateScore(affiliateId, competitionId, competition);
        scores.push(score);
      } catch (error) {
        console.error(`Erro ao calcular pontuação para afiliado ${affiliateId}:`, error);
        // Adicionar pontuação inválida para manter consistência
        scores.push({
          affiliateId,
          competitionId,
          totalScore: 0,
          breakdown: {
            baseScore: 0,
            bonusScore: 0,
            penaltyScore: 0,
            multiplierApplied: 1,
            components: []
          },
          calculatedAt: new Date(),
          isValid: false,
          validationErrors: [error instanceof Error ? error.message : 'Erro desconhecido']
        });
      }
    }

    return scores;
  }

  /**
   * Busca métricas do afiliado para o período da competição
   */
  private async getAffiliateMetrics(
    affiliateId: string, 
    competition: Competition
  ): Promise<RankingMetrics> {
    
    const startDate = competition.startDate;
    const endDate = competition.endDate;

    try {
      // Buscar indicações no período
      const indications = await this.prisma.referral.count({
        where: {
          affiliateId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // Buscar receita no período
      const revenueResult = await this.prisma.transaction.aggregate({
        where: {
          affiliateId,
          type: 'commission',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true
        }
      });

      const revenue = parseFloat(revenueResult._sum.amount?.toString() || '0');

      // Calcular crescimento da rede
      const networkGrowthStart = await this.prisma.affiliateHierarchy.count({
        where: {
          ancestorId: affiliateId,
          createdAt: {
            lt: startDate
          }
        }
      });

      const networkGrowthEnd = await this.prisma.affiliateHierarchy.count({
        where: {
          ancestorId: affiliateId,
          createdAt: {
            lt: endDate
          }
        }
      });

      const networkGrowth = networkGrowthEnd - networkGrowthStart;

      // Calcular score de qualidade (simplificado)
      const qualityScore = await this.calculateQualityScore(affiliateId, startDate, endDate);

      // Calcular taxa de retenção (simplificado)
      const retentionRate = await this.calculateRetentionRate(affiliateId, startDate, endDate);

      return {
        totalPoints: 0, // Será calculado
        indications,
        revenue,
        networkGrowth,
        qualityScore,
        retentionRate,
        bonusPoints: 0,
        penaltyPoints: 0
      };

    } catch (error) {
      console.error('Erro ao buscar métricas do afiliado:', error);
      return {
        totalPoints: 0,
        indications: 0,
        revenue: 0,
        networkGrowth: 0,
        qualityScore: 0,
        retentionRate: 0,
        bonusPoints: 0,
        penaltyPoints: 0
      };
    }
  }

  /**
   * Calcula componentes individuais da pontuação
   */
  private async calculateScoreComponents(
    metrics: RankingMetrics, 
    scoringCriteria: ScoringCriteria[]
  ): Promise<ScoreComponent[]> {
    
    const components: ScoreComponent[] = [];

    for (const criteria of scoringCriteria) {
      const component = await this.calculateSingleComponent(metrics, criteria);
      components.push(component);
    }

    return components;
  }

  /**
   * Calcula um componente individual da pontuação
   */
  private async calculateSingleComponent(
    metrics: RankingMetrics, 
    criteria: ScoringCriteria
  ): Promise<ScoreComponent> {
    
    let rawValue = 0;
    let normalizedValue = 0;

    // Obter valor bruto baseado na métrica
    switch (criteria.metric) {
      case 'indications':
        rawValue = metrics.indications;
        normalizedValue = rawValue; // Pode ser normalizado baseado em médias históricas
        break;
      
      case 'revenue':
        rawValue = metrics.revenue;
        normalizedValue = rawValue / 100; // Normalizar para escala de pontos
        break;
      
      case 'network_growth':
        rawValue = metrics.networkGrowth;
        normalizedValue = rawValue * 10; // Dar mais peso ao crescimento
        break;
      
      case 'retention':
        rawValue = metrics.retentionRate;
        normalizedValue = rawValue * 100; // Converter percentual para pontos
        break;
      
      case 'quality_score':
        rawValue = metrics.qualityScore;
        normalizedValue = rawValue;
        break;
    }

    // Aplicar multiplicador se especificado
    if (criteria.multiplier) {
      normalizedValue *= criteria.multiplier;
    }

    // Calcular contribuição ponderada
    const contribution = normalizedValue * criteria.weight;

    // Calcular bônus baseado em thresholds
    let bonuses = 0;
    if (criteria.bonusThresholds) {
      for (const threshold of criteria.bonusThresholds) {
        if (rawValue >= threshold.threshold) {
          bonuses += normalizedValue * (threshold.bonusMultiplier - 1);
        }
      }
    }

    return {
      metric: criteria.metric,
      rawValue,
      normalizedValue,
      weight: criteria.weight,
      contribution,
      bonuses,
      penalties: 0 // Pode ser implementado posteriormente
    };
  }

  /**
   * Calcula breakdown final da pontuação
   */
  private calculateScoreBreakdown(
    components: ScoreComponent[], 
    competition: Competition
  ): ScoreBreakdown {
    
    const baseScore = components.reduce((total, comp) => total + comp.contribution, 0);
    const bonusScore = components.reduce((total, comp) => total + comp.bonuses, 0);
    const penaltyScore = components.reduce((total, comp) => total + comp.penalties, 0);
    
    // Aplicar multiplicador global se houver
    const multiplierApplied = 1; // Pode ser configurável por competição

    return {
      baseScore: baseScore * multiplierApplied,
      bonusScore: bonusScore * multiplierApplied,
      penaltyScore: penaltyScore * multiplierApplied,
      multiplierApplied,
      components
    };
  }

  /**
   * Valida a pontuação calculada
   */
  private validateScore(score: AffiliateScore, competition: Competition): void {
    const errors: string[] = [];

    // Validar se a pontuação não é negativa
    if (score.totalScore < 0) {
      errors.push('Pontuação total não pode ser negativa');
    }

    // Validar se todos os componentes têm valores válidos
    for (const component of score.breakdown.components) {
      if (isNaN(component.contribution) || !isFinite(component.contribution)) {
        errors.push(`Componente ${component.metric} tem valor inválido`);
      }
    }

    // Validar requisitos mínimos se especificados
    if (competition.rules.minimumRequirements) {
      const reqs = competition.rules.minimumRequirements;
      const indicationsComponent = score.breakdown.components.find(c => c.metric === 'indications');
      const revenueComponent = score.breakdown.components.find(c => c.metric === 'revenue');

      if (reqs.minimumIndications && indicationsComponent && indicationsComponent.rawValue < reqs.minimumIndications) {
        errors.push(`Não atende requisito mínimo de indicações: ${reqs.minimumIndications}`);
      }

      if (reqs.minimumRevenue && revenueComponent && revenueComponent.rawValue < reqs.minimumRevenue) {
        errors.push(`Não atende requisito mínimo de receita: ${reqs.minimumRevenue}`);
      }
    }

    if (errors.length > 0) {
      score.isValid = false;
      score.validationErrors = errors;
    }
  }

  /**
   * Calcula score de qualidade (implementação simplificada)
   */
  private async calculateQualityScore(
    affiliateId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<number> {
    try {
      // Implementação simplificada - pode ser expandida
      // Baseado em fatores como taxa de conversão, qualidade dos leads, etc.
      
      const totalIndications = await this.prisma.referral.count({
        where: {
          affiliateId,
          createdAt: { gte: startDate, lte: endDate }
        }
      });

      const activeCustomers = await this.prisma.referral.count({
        where: {
          affiliateId,
          createdAt: { gte: startDate, lte: endDate },
          customer: {
            transactions: {
              some: {
                createdAt: { gte: startDate, lte: endDate }
              }
            }
          }
        }
      });

      if (totalIndications === 0) return 0;

      const conversionRate = activeCustomers / totalIndications;
      return Math.min(conversionRate * 100, 100); // Score de 0-100

    } catch (error) {
      return 0;
    }
  }

  /**
   * Calcula taxa de retenção (implementação simplificada)
   */
  private async calculateRetentionRate(
    affiliateId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<number> {
    try {
      // Implementação simplificada
      // Baseado em clientes que continuaram ativos após indicação
      
      const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
      
      const customersFirstHalf = await this.prisma.referral.count({
        where: {
          affiliateId,
          createdAt: { gte: startDate, lte: midPoint }
        }
      });

      const retainedCustomers = await this.prisma.referral.count({
        where: {
          affiliateId,
          createdAt: { gte: startDate, lte: midPoint },
          customer: {
            transactions: {
              some: {
                createdAt: { gte: midPoint, lte: endDate }
              }
            }
          }
        }
      });

      if (customersFirstHalf === 0) return 0;

      return (retainedCustomers / customersFirstHalf) * 100;

    } catch (error) {
      return 0;
    }
  }

  /**
   * Busca pontuação do cache
   */
  async getCachedScore(affiliateId: string, competitionId: string): Promise<AffiliateScore | null> {
    try {
      const cached = await this.redis.get(`score:${competitionId}:${affiliateId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Invalida cache de pontuação
   */
  async invalidateScoreCache(affiliateId: string, competitionId: string): Promise<void> {
    await this.redis.del(`score:${competitionId}:${affiliateId}`);
  }
}

