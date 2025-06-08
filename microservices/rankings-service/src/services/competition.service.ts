// ===============================================
// SERVIÇO DE COMPETIÇÕES
// ===============================================

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { 
  Competition, 
  CompetitionRequest, 
  RankingEntry, 
  LeaderboardEntry,
  CompetitionStats,
  AffiliateScore
} from '../types/rankings.types';
import { ScoringService } from './scoring.service';
import { PrizeDistributionService } from './prize-distribution.service';

export class CompetitionService {
  private prisma: PrismaClient;
  private redis: Redis;
  private scoringService: ScoringService;
  private prizeDistributionService: PrizeDistributionService;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.scoringService = new ScoringService(prisma, redis);
    this.prizeDistributionService = new PrizeDistributionService(prisma, redis);
  }

  /**
   * Cria nova competição
   */
  async createCompetition(data: CompetitionRequest): Promise<Competition> {
    const competition: Competition = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      type: data.type,
      status: 'draft',
      startDate: data.startDate,
      endDate: data.endDate,
      rules: data.rules,
      prizes: data.prizes.map(prize => ({
        ...prize,
        id: uuidv4()
      })),
      participants: [],
      rankings: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system' // Em produção viria do contexto do usuário
    };

    // Salvar no cache
    await this.redis.setex(
      `competition:${competition.id}`,
      3600, // 1 hora
      JSON.stringify(competition)
    );

    // Em produção salvaria no banco
    // await this.prisma.competition.create({ data: competition });

    return competition;
  }

  /**
   * Lista competições com filtros
   */
  async getCompetitions(filters: {
    status?: string;
    type?: string;
    page: number;
    limit: number;
  }): Promise<Competition[]> {
    // Implementação simplificada - em produção viria do banco
    const mockCompetitions: Competition[] = [
      {
        id: 'comp-1',
        name: 'Competição Mensal de Indicações',
        description: 'Competição baseada no número de indicações válidas',
        type: 'monthly',
        status: 'active',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-30'),
        rules: {
          eligibilityCriteria: {
            minimumLevel: 1,
            minimumIndications: 5
          },
          scoringCriteria: [
            {
              metric: 'indications',
              weight: 0.6
            },
            {
              metric: 'revenue',
              weight: 0.4
            }
          ],
          rankingMethod: 'composite',
          updateFrequency: 'daily',
          tieBreakingRules: [
            {
              priority: 1,
              criteria: 'total_revenue',
              order: 'desc'
            }
          ]
        },
        prizes: [
          {
            id: 'prize-1',
            position: 1,
            type: 'cash',
            value: 5000,
            description: 'Prêmio em dinheiro para 1º lugar',
            distributionMethod: 'automatic'
          },
          {
            id: 'prize-2',
            position: { from: 2, to: 5 },
            type: 'bonus',
            value: 1000,
            description: 'Bônus para 2º ao 5º lugar',
            distributionMethod: 'automatic'
          }
        ],
        participants: ['affiliate-1', 'affiliate-2', 'affiliate-3'],
        rankings: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin'
      }
    ];

    return mockCompetitions.filter(comp => {
      if (filters.status && comp.status !== filters.status) return false;
      if (filters.type && comp.type !== filters.type) return false;
      return true;
    });
  }

  /**
   * Busca competição por ID
   */
  async getCompetitionById(competitionId: string): Promise<Competition | null> {
    // Tentar buscar no cache primeiro
    const cached = await this.redis.get(`competition:${competitionId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Implementação simplificada
    const competitions = await this.getCompetitions({ page: 1, limit: 100 });
    return competitions.find(c => c.id === competitionId) || null;
  }

  /**
   * Busca leaderboard de uma competição
   */
  async getLeaderboard(
    competitionId: string, 
    limit: number = 50, 
    currentAffiliateId?: string
  ): Promise<LeaderboardEntry[]> {
    
    const competition = await this.getCompetitionById(competitionId);
    if (!competition) {
      throw new Error('Competição não encontrada');
    }

    // Se não há rankings calculados, calcular agora
    if (competition.rankings.length === 0) {
      await this.recalculateRankings(competitionId);
      // Buscar competição atualizada
      const updatedCompetition = await this.getCompetitionById(competitionId);
      if (updatedCompetition) {
        competition.rankings = updatedCompetition.rankings;
      }
    }

    // Converter rankings para leaderboard entries
    const leaderboard: LeaderboardEntry[] = competition.rankings
      .sort((a, b) => a.position - b.position)
      .slice(0, limit)
      .map(ranking => ({
        position: ranking.position,
        affiliateId: ranking.affiliateId,
        affiliateName: `Afiliado ${ranking.affiliateId}`, // Em produção viria do banco
        score: ranking.score,
        change: ranking.positionChange || 0,
        trend: this.determineTrend(ranking.positionChange || 0),
        metrics: ranking.metrics,
        badges: this.calculateBadges(ranking),
        isCurrentUser: ranking.affiliateId === currentAffiliateId
      }));

    return leaderboard;
  }

  /**
   * Recalcula rankings de uma competição
   */
  async recalculateRankings(competitionId: string): Promise<{ updated: number; errors: number }> {
    const competition = await this.getCompetitionById(competitionId);
    if (!competition) {
      throw new Error('Competição não encontrada');
    }

    let updated = 0;
    let errors = 0;
    const newRankings: RankingEntry[] = [];

    // Calcular pontuação para todos os participantes
    for (const affiliateId of competition.participants) {
      try {
        const score = await this.scoringService.calculateScore(affiliateId, competitionId, competition);
        
        if (score.isValid) {
          const existingRanking = competition.rankings.find(r => r.affiliateId === affiliateId);
          const previousPosition = existingRanking?.position;

          newRankings.push({
            affiliateId,
            position: 0, // Será calculado após ordenação
            score: score.totalScore,
            metrics: {
              totalPoints: score.totalScore,
              indications: score.breakdown.components.find(c => c.metric === 'indications')?.rawValue || 0,
              revenue: score.breakdown.components.find(c => c.metric === 'revenue')?.rawValue || 0,
              networkGrowth: score.breakdown.components.find(c => c.metric === 'network_growth')?.rawValue || 0,
              qualityScore: score.breakdown.components.find(c => c.metric === 'quality_score')?.rawValue || 0,
              retentionRate: score.breakdown.components.find(c => c.metric === 'retention')?.rawValue || 0,
              bonusPoints: score.breakdown.bonusScore,
              penaltyPoints: score.breakdown.penaltyScore
            },
            previousPosition,
            positionChange: 0, // Será calculado após ordenação
            lastUpdated: new Date(),
            isEligible: this.checkEligibility(score, competition)
          });
          updated++;
        } else {
          errors++;
        }
      } catch (error) {
        console.error(`Erro ao calcular pontuação para afiliado ${affiliateId}:`, error);
        errors++;
      }
    }

    // Ordenar por pontuação e atribuir posições
    newRankings.sort((a, b) => b.score - a.score);
    newRankings.forEach((ranking, index) => {
      ranking.position = index + 1;
      if (ranking.previousPosition) {
        ranking.positionChange = ranking.previousPosition - ranking.position;
      }
    });

    // Aplicar regras de desempate se necessário
    this.applyTieBreakingRules(newRankings, competition);

    // Atualizar competição
    competition.rankings = newRankings;
    competition.updatedAt = new Date();

    // Salvar no cache
    await this.redis.setex(
      `competition:${competitionId}`,
      3600,
      JSON.stringify(competition)
    );

    return { updated, errors };
  }

  /**
   * Atualiza pontuação de um afiliado específico
   */
  async updateAffiliateScore(
    competitionId: string,
    affiliateId: string,
    updateData: any
  ): Promise<AffiliateScore> {
    
    const competition = await this.getCompetitionById(competitionId);
    if (!competition) {
      throw new Error('Competição não encontrada');
    }

    // Invalidar cache de pontuação
    await this.scoringService.invalidateScoreCache(affiliateId, competitionId);

    // Recalcular pontuação
    const updatedScore = await this.scoringService.calculateScore(affiliateId, competitionId, competition);

    // Recalcular rankings se necessário
    if (competition.rules.updateFrequency === 'realtime') {
      await this.recalculateRankings(competitionId);
    }

    return updatedScore;
  }

  /**
   * Finaliza competição e distribui prêmios
   */
  async finalizeCompetition(competitionId: string): Promise<{
    competition: Competition;
    distributions: any[];
  }> {
    
    const competition = await this.getCompetitionById(competitionId);
    if (!competition) {
      throw new Error('Competição não encontrada');
    }

    if (competition.status === 'completed') {
      throw new Error('Competição já foi finalizada');
    }

    // Recalcular rankings finais
    await this.recalculateRankings(competitionId);

    // Distribuir prêmios automaticamente
    const distributions = await this.prizeDistributionService.distributeAutomaticPrizes(competition);

    // Atualizar status da competição
    competition.status = 'completed';
    competition.updatedAt = new Date();

    // Salvar no cache
    await this.redis.setex(
      `competition:${competitionId}`,
      86400, // 24 horas para competições finalizadas
      JSON.stringify(competition)
    );

    return {
      competition,
      distributions
    };
  }

  /**
   * Busca estatísticas de uma competição
   */
  async getCompetitionStats(competitionId: string): Promise<CompetitionStats> {
    const competition = await this.getCompetitionById(competitionId);
    if (!competition) {
      throw new Error('Competição não encontrada');
    }

    const totalParticipants = competition.participants.length;
    const activeParticipants = competition.rankings.filter(r => r.isEligible).length;
    const totalPrizePool = competition.prizes.reduce((sum, prize) => sum + prize.value, 0);
    
    const scores = competition.rankings.map(r => r.score);
    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const topScore = scores.length > 0 ? Math.max(...scores) : 0;
    
    const participationRate = totalParticipants > 0 ? activeParticipants / totalParticipants : 0;
    const completionRate = competition.status === 'completed' ? 1 : 0;

    return {
      competitionId,
      totalParticipants,
      activeParticipants,
      totalPrizePool,
      averageScore,
      topScore,
      participationRate,
      completionRate,
      lastUpdated: new Date()
    };
  }

  /**
   * Busca posição de um afiliado
   */
  async getAffiliatePosition(affiliateId: string, competitionId?: string): Promise<any> {
    if (competitionId) {
      const competition = await this.getCompetitionById(competitionId);
      if (competition) {
        const ranking = competition.rankings.find(r => r.affiliateId === affiliateId);
        return ranking ? {
          competitionId,
          position: ranking.position,
          score: ranking.score,
          isEligible: ranking.isEligible
        } : null;
      }
    }

    // Se não especificou competição, buscar em todas as ativas
    const activeCompetitions = await this.getCompetitions({ 
      status: 'active', 
      page: 1, 
      limit: 100 
    });

    const positions = [];
    for (const comp of activeCompetitions) {
      const ranking = comp.rankings.find(r => r.affiliateId === affiliateId);
      if (ranking) {
        positions.push({
          competitionId: comp.id,
          competitionName: comp.name,
          position: ranking.position,
          score: ranking.score,
          isEligible: ranking.isEligible
        });
      }
    }

    return positions;
  }

  /**
   * Conta competições com filtros
   */
  async countCompetitions(filters: { status?: string; type?: string }): Promise<number> {
    const competitions = await this.getCompetitions({ ...filters, page: 1, limit: 1000 });
    return competitions.length;
  }

  /**
   * Métodos auxiliares
   */
  private determineTrend(change: number): 'up' | 'down' | 'stable' {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'stable';
  }

  private calculateBadges(ranking: RankingEntry): string[] {
    const badges: string[] = [];
    
    if (ranking.position === 1) badges.push('🥇 Primeiro Lugar');
    if (ranking.position <= 3) badges.push('🏆 Top 3');
    if (ranking.position <= 10) badges.push('⭐ Top 10');
    if (ranking.metrics.indications > 100) badges.push('🎯 Super Indicador');
    if (ranking.metrics.revenue > 10000) badges.push('💰 Alto Faturamento');
    
    return badges;
  }

  private checkEligibility(score: AffiliateScore, competition: Competition): boolean {
    if (!score.isValid) return false;

    const requirements = competition.rules.minimumRequirements;
    if (!requirements) return true;

    const indicationsComponent = score.breakdown.components.find(c => c.metric === 'indications');
    const revenueComponent = score.breakdown.components.find(c => c.metric === 'revenue');

    if (requirements.minimumIndications && 
        (!indicationsComponent || indicationsComponent.rawValue < requirements.minimumIndications)) {
      return false;
    }

    if (requirements.minimumRevenue && 
        (!revenueComponent || revenueComponent.rawValue < requirements.minimumRevenue)) {
      return false;
    }

    return true;
  }

  private applyTieBreakingRules(rankings: RankingEntry[], competition: Competition): void {
    const tieBreakingRules = competition.rules.tieBreakingRules || [];
    
    // Agrupar por pontuação igual
    const scoreGroups = new Map<number, RankingEntry[]>();
    rankings.forEach(ranking => {
      const score = ranking.score;
      if (!scoreGroups.has(score)) {
        scoreGroups.set(score, []);
      }
      scoreGroups.get(score)!.push(ranking);
    });

    // Aplicar regras de desempate para grupos com mais de 1 participante
    scoreGroups.forEach(group => {
      if (group.length > 1) {
        group.sort((a, b) => {
          for (const rule of tieBreakingRules) {
            let valueA = 0;
            let valueB = 0;

            switch (rule.criteria) {
              case 'total_revenue':
                valueA = a.metrics.revenue;
                valueB = b.metrics.revenue;
                break;
              case 'indications_count':
                valueA = a.metrics.indications;
                valueB = b.metrics.indications;
                break;
              case 'quality_score':
                valueA = a.metrics.qualityScore;
                valueB = b.metrics.qualityScore;
                break;
            }

            if (valueA !== valueB) {
              return rule.order === 'desc' ? valueB - valueA : valueA - valueB;
            }
          }
          return 0;
        });
      }
    });
  }
}

