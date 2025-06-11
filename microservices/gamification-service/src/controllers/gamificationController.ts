import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DailyIndicationService } from '../services/dailyIndicationService';
import { ChestService } from '../services/chestService';
import { PotentialAnalysisService } from '../algorithms/potentialAnalysisService';

export class GamificationController {
  private dailyIndicationService: DailyIndicationService;
  private chestService: ChestService;
  private potentialAnalysisService: PotentialAnalysisService;

  constructor() {
    this.dailyIndicationService = new DailyIndicationService();
    this.chestService = new ChestService();
    this.potentialAnalysisService = new PotentialAnalysisService();
  }

  // Daily Indication endpoints
  async trackDailyIndication(request: FastifyRequest<{ 
    Params: { affiliateId: string } 
  }>, reply: FastifyReply) {
    try {
      const { affiliateId } = request.params;
      
      await this.dailyIndicationService.trackDailyIndication(affiliateId);
      
      const progress = await this.dailyIndicationService.getDailyProgress(affiliateId);
      
      return reply.send({
        success: true,
        data: progress
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getDailyProgress(request: FastifyRequest<{ 
    Params: { affiliateId: string } 
  }>, reply: FastifyReply) {
    try {
      const { affiliateId } = request.params;
      
      const progress = await this.dailyIndicationService.getDailyProgress(affiliateId);
      
      if (!progress) {
        return reply.status(404).send({
          error: 'Daily progress not found'
        });
      }

      return reply.send({
        success: true,
        data: progress
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Chest endpoints
  async generateWeeklyGoals(request: FastifyRequest<{ 
    Params: { affiliateId: string } 
  }>, reply: FastifyReply) {
    try {
      const { affiliateId } = request.params;
      
      const goals = await this.chestService.generateWeeklyGoals(affiliateId);
      
      return reply.send({
        success: true,
        data: goals
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getWeeklyGoals(request: FastifyRequest<{ 
    Params: { affiliateId: string } 
  }>, reply: FastifyReply) {
    try {
      const { affiliateId } = request.params;
      
      const goals = await this.chestService.getWeeklyGoals(affiliateId);
      
      if (!goals) {
        return reply.status(404).send({
          error: 'Weekly goals not found'
        });
      }

      return reply.send({
        success: true,
        data: goals
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async openChest(request: FastifyRequest<{ 
    Params: { affiliateId: string, chestType: string } 
  }>, reply: FastifyReply) {
    try {
      const { affiliateId, chestType } = request.params;
      
      if (!['silver', 'gold', 'sapphire', 'diamond'].includes(chestType)) {
        return reply.status(400).send({
          error: 'Invalid chest type'
        });
      }

      const reward = await this.chestService.openChest(
        affiliateId, 
        chestType as 'silver' | 'gold' | 'sapphire' | 'diamond'
      );
      
      return reply.send({
        success: true,
        data: reward
      });
    } catch (error) {
      return reply.status(400).send({
        error: 'Cannot open chest',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateProgress(request: FastifyRequest<{ 
    Params: { affiliateId: string },
    Body: { indicationsCount: number }
  }>, reply: FastifyReply) {
    try {
      const { affiliateId } = request.params;
      const { indicationsCount } = request.body;
      
      await this.chestService.updateProgress(affiliateId, indicationsCount);
      
      return reply.send({
        success: true,
        message: 'Progress updated successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getChestHistory(request: FastifyRequest<{ 
    Params: { affiliateId: string },
    Querystring: { weeks?: string }
  }>, reply: FastifyReply) {
    try {
      const { affiliateId } = request.params;
      const weeks = parseInt(request.query.weeks || '4');
      
      const history = await this.chestService.getChestHistory(affiliateId, weeks);
      
      return reply.send({
        success: true,
        data: history
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Potential Analysis endpoints
  async analyzePotential(request: FastifyRequest<{ 
    Params: { affiliateId: string } 
  }>, reply: FastifyReply) {
    try {
      const { affiliateId } = request.params;
      
      const analysis = await this.potentialAnalysisService.analyzeAffiliatePotential(affiliateId);
      
      return reply.send({
        success: true,
        data: analysis
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateHistoricalData(request: FastifyRequest<{ 
    Params: { affiliateId: string }
  }>, reply: FastifyReply) {
    try {
      const { affiliateId } = request.params;
      const weekData = request.body as any;
      
      await this.potentialAnalysisService.updateHistoricalData(affiliateId, weekData);
      
      return reply.send({
        success: true,
        message: 'Historical data updated successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Admin endpoints
  async resetWeeklyGoals(request: FastifyRequest, reply: FastifyReply) {
    try {
      await this.chestService.resetWeeklyGoals();
      
      return reply.send({
        success: true,
        message: 'Weekly goals reset successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getSystemStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const activeGoals = await this.chestService.getAllActiveGoals();
      const activeProgresses = await this.dailyIndicationService.getAllActiveProgresses();
      
      return reply.send({
        success: true,
        data: {
          activeWeeklyGoals: activeGoals.length,
          activeDailyProgresses: activeProgresses.length,
          totalAffiliatesWithGoals: new Set(activeGoals.map(g => g.affiliateId)).size,
          totalAffiliatesWithProgress: new Set(activeProgresses.map(p => p.affiliateId)).size
        }
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

