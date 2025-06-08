// ===============================================
// CONTROLADOR - RANKINGS SERVICE
// ===============================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { ScoringService } from '../services/scoring.service';
import { CompetitionService } from '../services/competition.service';
import { PrizeDistributionService } from '../services/prize-distribution.service';
import { 
  ApiResponse, 
  CompetitionRequest, 
  Competition,
  LeaderboardEntry,
  ScoreUpdateRequest,
  PrizeDistributionRequest
} from '../types/rankings.types';

export class RankingsController {
  private scoringService: ScoringService;
  private competitionService: CompetitionService;
  private prizeDistributionService: PrizeDistributionService;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.scoringService = new ScoringService(prisma, redis);
    this.competitionService = new CompetitionService(prisma, redis);
    this.prizeDistributionService = new PrizeDistributionService(prisma, redis);
  }

  /**
   * Cria nova competição
   * POST /rankings/competitions
   */
  async createCompetition(
    request: FastifyRequest<{ Body: CompetitionRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const competitionData = request.body;
      const competition = await this.competitionService.createCompetition(competitionData);

      return reply.status(201).send({
        success: true,
        data: competition,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'COMPETITION_CREATE_FAILED',
          message: 'Falha ao criar competição',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Lista competições
   * GET /rankings/competitions
   */
  async getCompetitions(
    request: FastifyRequest<{
      Querystring: {
        status?: string;
        type?: string;
        page?: number;
        limit?: number;
      }
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { status, type, page = 1, limit = 20 } = request.query;

      const competitions = await this.competitionService.getCompetitions({
        status,
        type,
        page,
        limit
      });

      const total = await this.competitionService.countCompetitions({ status, type });

      return reply.status(200).send({
        success: true,
        data: competitions,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'COMPETITIONS_FETCH_FAILED',
          message: 'Falha ao buscar competições',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Busca competição específica
   * GET /rankings/competitions/:competitionId
   */
  async getCompetition(
    request: FastifyRequest<{ Params: { competitionId: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { competitionId } = request.params;
      const competition = await this.competitionService.getCompetitionById(competitionId);

      if (!competition) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'COMPETITION_NOT_FOUND',
            message: 'Competição não encontrada'
          },
          meta: {
            timestamp: new Date()
          }
        });
      }

      return reply.status(200).send({
        success: true,
        data: competition,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'COMPETITION_FETCH_FAILED',
          message: 'Falha ao buscar competição',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Busca leaderboard de uma competição
   * GET /rankings/competitions/:competitionId/leaderboard
   */
  async getLeaderboard(
    request: FastifyRequest<{
      Params: { competitionId: string };
      Querystring: { limit?: number; affiliateId?: string }
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { competitionId } = request.params;
      const { limit = 50, affiliateId } = request.query;

      const leaderboard = await this.competitionService.getLeaderboard(competitionId, limit, affiliateId);

      return reply.status(200).send({
        success: true,
        data: leaderboard,
        meta: {
          competitionId,
          limit,
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'LEADERBOARD_FETCH_FAILED',
          message: 'Falha ao buscar leaderboard',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Atualiza pontuação de um afiliado
   * PUT /rankings/competitions/:competitionId/scores/:affiliateId
   */
  async updateScore(
    request: FastifyRequest<{
      Params: { competitionId: string; affiliateId: string };
      Body: Partial<ScoreUpdateRequest>
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { competitionId, affiliateId } = request.params;
      const updateData = request.body;

      const updatedScore = await this.competitionService.updateAffiliateScore(
        competitionId,
        affiliateId,
        updateData
      );

      return reply.status(200).send({
        success: true,
        data: updatedScore,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SCORE_UPDATE_FAILED',
          message: 'Falha ao atualizar pontuação',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Recalcula rankings de uma competição
   * POST /rankings/competitions/:competitionId/recalculate
   */
  async recalculateRankings(
    request: FastifyRequest<{ Params: { competitionId: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { competitionId } = request.params;
      
      const result = await this.competitionService.recalculateRankings(competitionId);

      return reply.status(200).send({
        success: true,
        data: result,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'RECALCULATION_FAILED',
          message: 'Falha ao recalcular rankings',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Finaliza competição e distribui prêmios
   * POST /rankings/competitions/:competitionId/finalize
   */
  async finalizeCompetition(
    request: FastifyRequest<{ Params: { competitionId: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { competitionId } = request.params;
      
      const result = await this.competitionService.finalizeCompetition(competitionId);

      return reply.status(200).send({
        success: true,
        data: result,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FINALIZATION_FAILED',
          message: 'Falha ao finalizar competição',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Distribui prêmios manualmente
   * POST /rankings/competitions/:competitionId/distribute-prizes
   */
  async distributePrizes(
    request: FastifyRequest<{
      Params: { competitionId: string };
      Body: PrizeDistributionRequest
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { competitionId } = request.params;
      const distributionData = { ...request.body, competitionId };

      const distribution = await this.prizeDistributionService.createDistribution(distributionData);

      return reply.status(201).send({
        success: true,
        data: distribution,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PRIZE_DISTRIBUTION_FAILED',
          message: 'Falha ao distribuir prêmios',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Lista distribuições de prêmios
   * GET /rankings/competitions/:competitionId/distributions
   */
  async getDistributions(
    request: FastifyRequest<{ Params: { competitionId: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { competitionId } = request.params;
      
      const distributions = await this.prizeDistributionService.getDistributions(competitionId);

      return reply.status(200).send({
        success: true,
        data: distributions,
        meta: {
          competitionId,
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DISTRIBUTIONS_FETCH_FAILED',
          message: 'Falha ao buscar distribuições',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Busca estatísticas de uma competição
   * GET /rankings/competitions/:competitionId/stats
   */
  async getCompetitionStats(
    request: FastifyRequest<{ Params: { competitionId: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { competitionId } = request.params;
      
      const stats = await this.competitionService.getCompetitionStats(competitionId);

      return reply.status(200).send({
        success: true,
        data: stats,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'STATS_FETCH_FAILED',
          message: 'Falha ao buscar estatísticas',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Busca posição de um afiliado específico
   * GET /rankings/affiliates/:affiliateId/position
   */
  async getAffiliatePosition(
    request: FastifyRequest<{
      Params: { affiliateId: string };
      Querystring: { competitionId?: string }
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { affiliateId } = request.params;
      const { competitionId } = request.query;

      const position = await this.competitionService.getAffiliatePosition(affiliateId, competitionId);

      return reply.status(200).send({
        success: true,
        data: position,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'POSITION_FETCH_FAILED',
          message: 'Falha ao buscar posição',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }
}

