import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ExternalDataService } from '../services/external-data.service';

// Schemas de validação
const PlayerIdSchema = z.object({
  playerId: z.string().uuid('Player ID deve ser um UUID válido'),
});

const DateRangeSchema = z.object({
  startDate: z.string().datetime('Data de início deve estar no formato ISO'),
  endDate: z.string().datetime('Data de fim deve estar no formato ISO'),
}).optional();

const GetPlayerDepositsSchema = z.object({
  playerId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const GetPlayerBetsSchema = z.object({
  playerId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const GetPlayerGGRSchema = z.object({
  playerId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export class ExternalDataController {
  private externalDataService: ExternalDataService;

  constructor() {
    this.externalDataService = new ExternalDataService();
  }

  async initialize(): Promise<void> {
    await this.externalDataService.initialize();
  }

  // GET /api/external-data/deposits
  async getPlayerDeposits(
    request: FastifyRequest<{
      Querystring: {
        playerId: string;
        startDate?: string;
        endDate?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { playerId, startDate, endDate } = GetPlayerDepositsSchema.parse(request.query);

      const dateRange = startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate),
      } : undefined;

      const deposits = await this.externalDataService.getPlayerDeposits(playerId, dateRange);

      reply.status(200).send({
        success: true,
        message: 'Depósitos obtidos com sucesso',
        data: deposits,
        meta: {
          playerId,
          count: deposits.length,
          dateRange,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Error in getPlayerDeposits:', error);
      
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Parâmetros inválidos',
          errors: error.errors,
        });
        return;
      }

      reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // GET /api/external-data/bets
  async getPlayerBets(
    request: FastifyRequest<{
      Querystring: {
        playerId: string;
        startDate?: string;
        endDate?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { playerId, startDate, endDate } = GetPlayerBetsSchema.parse(request.query);

      const dateRange = startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate),
      } : undefined;

      const bets = await this.externalDataService.getPlayerBets(playerId, dateRange);

      reply.status(200).send({
        success: true,
        message: 'Apostas obtidas com sucesso',
        data: bets,
        meta: {
          playerId,
          count: bets.length,
          dateRange,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Error in getPlayerBets:', error);
      
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Parâmetros inválidos',
          errors: error.errors,
        });
        return;
      }

      reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // GET /api/external-data/ggr
  async getPlayerGGR(
    request: FastifyRequest<{
      Querystring: {
        playerId: string;
        startDate: string;
        endDate: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { playerId, startDate, endDate } = GetPlayerGGRSchema.parse(request.query);

      const dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };

      const ggr = await this.externalDataService.getPlayerGGR(playerId, dateRange);

      reply.status(200).send({
        success: true,
        message: 'GGR calculado com sucesso',
        data: ggr,
        meta: {
          playerId,
          dateRange,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Error in getPlayerGGR:', error);
      
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Parâmetros inválidos',
          errors: error.errors,
        });
        return;
      }

      reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // GET /api/external-data/activity/:playerId
  async getPlayerActivity(
    request: FastifyRequest<{
      Params: {
        playerId: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { playerId } = PlayerIdSchema.parse(request.params);

      const activity = await this.externalDataService.getPlayerActivity(playerId);

      reply.status(200).send({
        success: true,
        message: 'Atividade do jogador obtida com sucesso',
        data: activity,
        meta: {
          playerId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Error in getPlayerActivity:', error);
      
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Parâmetros inválidos',
          errors: error.errors,
        });
        return;
      }

      reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // POST /api/external-data/validate-cpa
  async validatePlayerForCPA(
    request: FastifyRequest<{
      Body: {
        playerId: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { playerId } = PlayerIdSchema.parse(request.body);

      const validation = await this.externalDataService.validatePlayerForCPA(playerId);

      reply.status(200).send({
        success: true,
        message: 'Validação CPA realizada com sucesso',
        data: validation,
        meta: {
          playerId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Error in validatePlayerForCPA:', error);
      
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Parâmetros inválidos',
          errors: error.errors,
        });
        return;
      }

      reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // DELETE /api/external-data/cache/:playerId
  async clearPlayerCache(
    request: FastifyRequest<{
      Params: {
        playerId: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { playerId } = PlayerIdSchema.parse(request.params);

      await this.externalDataService.clearPlayerCache(playerId);

      reply.status(200).send({
        success: true,
        message: 'Cache do jogador limpo com sucesso',
        data: { playerId },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Error in clearPlayerCache:', error);
      
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Parâmetros inválidos',
          errors: error.errors,
        });
        return;
      }

      reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // GET /api/external-data/health
  async healthCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      reply.status(200).send({
        success: true,
        message: 'External Data Service está funcionando',
        data: {
          service: 'external-data-service',
          version: '1.0.0',
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Error in healthCheck:', error);
      reply.status(500).send({
        success: false,
        message: 'Erro no health check',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  async close(): Promise<void> {
    await this.externalDataService.close();
  }
}

