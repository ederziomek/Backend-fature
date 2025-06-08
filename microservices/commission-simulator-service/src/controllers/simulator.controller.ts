// ===============================================
// CONTROLADOR - COMMISSION SIMULATOR SERVICE
// ===============================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { SimulatorService } from '../services/simulator.service';
import { 
  ApiResponse, 
  SimulationRequest, 
  SimulationResult
} from '../types/simulator.types';

export class SimulatorController {
  private simulatorService: SimulatorService;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.simulatorService = new SimulatorService(prisma, redis);
  }

  /**
   * Executa nova simulação
   * POST /simulator/run
   */
  async runSimulation(
    request: FastifyRequest<{ Body: SimulationRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const simulationRequest = request.body;
      const result = await this.simulatorService.runSimulation(simulationRequest);

      return reply.status(201).send({
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
          code: 'SIMULATION_FAILED',
          message: 'Falha ao executar simulação',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Busca simulação por ID
   * GET /simulator/simulations/:simulationId
   */
  async getSimulation(
    request: FastifyRequest<{ Params: { simulationId: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { simulationId } = request.params;
      const simulation = await this.simulatorService.getSimulation(simulationId);

      if (!simulation) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SIMULATION_NOT_FOUND',
            message: 'Simulação não encontrada'
          },
          meta: {
            timestamp: new Date()
          }
        });
      }

      return reply.status(200).send({
        success: true,
        data: simulation,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SIMULATION_FETCH_FAILED',
          message: 'Falha ao buscar simulação',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Lista simulações de um afiliado
   * GET /simulator/affiliates/:affiliateId/simulations
   */
  async getAffiliateSimulations(
    request: FastifyRequest<{
      Params: { affiliateId: string };
      Querystring: { limit?: number }
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { affiliateId } = request.params;
      const { limit = 10 } = request.query;

      const simulations = await this.simulatorService.getAffiliateSimulations(affiliateId, limit);

      return reply.status(200).send({
        success: true,
        data: simulations,
        meta: {
          total: simulations.length,
          limit,
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SIMULATIONS_FETCH_FAILED',
          message: 'Falha ao buscar simulações do afiliado',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Análise de progressão de nível
   * POST /simulator/progression-analysis
   */
  async analyzeProgression(
    request: FastifyRequest<{
      Body: {
        affiliateId: string;
        currentLevel: number;
        targetLevel: number;
      }
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { affiliateId, currentLevel, targetLevel } = request.body;

      if (targetLevel <= currentLevel) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_TARGET_LEVEL',
            message: 'Nível alvo deve ser maior que o nível atual'
          },
          meta: {
            timestamp: new Date()
          }
        });
      }

      const analysis = await this.simulatorService.analyzeProgression(
        affiliateId,
        currentLevel,
        targetLevel
      );

      return reply.status(200).send({
        success: true,
        data: analysis,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PROGRESSION_ANALYSIS_FAILED',
          message: 'Falha ao analisar progressão',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Comparação de estratégias
   * POST /simulator/compare-strategies
   */
  async compareStrategies(
    request: FastifyRequest<{
      Body: {
        affiliateId: string;
        strategies: string[];
      }
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { affiliateId, strategies } = request.body;

      if (!strategies || strategies.length < 2) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_STRATEGIES',
            message: 'É necessário fornecer pelo menos 2 estratégias para comparação'
          },
          meta: {
            timestamp: new Date()
          }
        });
      }

      const comparison = await this.simulatorService.compareStrategies(affiliateId, strategies);

      return reply.status(200).send({
        success: true,
        data: comparison,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'STRATEGY_COMPARISON_FAILED',
          message: 'Falha ao comparar estratégias',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Sugestões de otimização
   * GET /simulator/affiliates/:affiliateId/optimization-suggestions
   */
  async getOptimizationSuggestions(
    request: FastifyRequest<{
      Params: { affiliateId: string };
      Querystring: { simulationId?: string }
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { affiliateId } = request.params;
      const { simulationId } = request.query;

      let simulationResult: SimulationResult | null = null;

      if (simulationId) {
        simulationResult = await this.simulatorService.getSimulation(simulationId);
        if (!simulationResult) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'SIMULATION_NOT_FOUND',
              message: 'Simulação não encontrada'
            },
            meta: {
              timestamp: new Date()
            }
          });
        }
      } else {
        // Buscar simulação mais recente do afiliado
        const recentSimulations = await this.simulatorService.getAffiliateSimulations(affiliateId, 1);
        simulationResult = recentSimulations[0] || null;
      }

      if (!simulationResult) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NO_SIMULATION_FOUND',
            message: 'Nenhuma simulação encontrada para gerar sugestões'
          },
          meta: {
            timestamp: new Date()
          }
        });
      }

      const suggestions = await this.simulatorService.generateOptimizationSuggestions(
        affiliateId,
        simulationResult
      );

      return reply.status(200).send({
        success: true,
        data: suggestions,
        meta: {
          total: suggestions.length,
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'OPTIMIZATION_SUGGESTIONS_FAILED',
          message: 'Falha ao gerar sugestões de otimização',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Simulação rápida com parâmetros básicos
   * POST /simulator/quick-simulation
   */
  async quickSimulation(
    request: FastifyRequest<{
      Body: {
        affiliateId: string;
        expectedIndications: number;
        cpaRate?: number;
        revsharePercentage?: number;
        timeframe?: 'monthly' | 'quarterly' | 'annual';
      }
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { 
        affiliateId, 
        expectedIndications, 
        cpaRate, 
        revsharePercentage, 
        timeframe = 'monthly' 
      } = request.body;

      // Determinar tipo de simulação baseado nos parâmetros
      let simulationType: 'cpa' | 'revshare' | 'hybrid' = 'cpa';
      if (cpaRate && revsharePercentage) {
        simulationType = 'hybrid';
      } else if (revsharePercentage) {
        simulationType = 'revshare';
      }

      // Criar request de simulação simplificado
      const simulationRequest: SimulationRequest = {
        affiliateId,
        simulationType,
        timeframe,
        parameters: {
          expectedIndications,
          cpaRate: cpaRate || 0,
          revsharePercentage: revsharePercentage || 0,
          conversionRate: 0.3, // Padrão
          playerRetentionRate: 0.7, // Padrão
          averagePlayerValue: 500, // Padrão
          growthRate: 0.05 // 5% ao mês
        }
      };

      const result = await this.simulatorService.runSimulation(simulationRequest);

      return reply.status(201).send({
        success: true,
        data: {
          simulationId: result.id,
          summary: result.summary,
          projections: result.projections.slice(0, 3), // Apenas primeiros 3 períodos
          recommendations: result.recommendations.slice(0, 3) // Top 3 recomendações
        },
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'QUICK_SIMULATION_FAILED',
          message: 'Falha ao executar simulação rápida',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Validação de parâmetros de simulação
   * POST /simulator/validate-parameters
   */
  async validateParameters(
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const parameters = request.body;
      const validationErrors: string[] = [];

      // Validações básicas
      if (parameters.expectedIndications && parameters.expectedIndications < 0) {
        validationErrors.push('Número de indicações deve ser positivo');
      }

      if (parameters.cpaRate && parameters.cpaRate < 0) {
        validationErrors.push('Taxa CPA deve ser positiva');
      }

      if (parameters.revsharePercentage && (parameters.revsharePercentage < 0 || parameters.revsharePercentage > 100)) {
        validationErrors.push('Percentual RevShare deve estar entre 0 e 100');
      }

      if (parameters.conversionRate && (parameters.conversionRate < 0 || parameters.conversionRate > 1)) {
        validationErrors.push('Taxa de conversão deve estar entre 0 e 1');
      }

      if (parameters.playerRetentionRate && (parameters.playerRetentionRate < 0 || parameters.playerRetentionRate > 1)) {
        validationErrors.push('Taxa de retenção deve estar entre 0 e 1');
      }

      if (parameters.growthRate && Math.abs(parameters.growthRate) > 1) {
        validationErrors.push('Taxa de crescimento deve estar entre -100% e 100%');
      }

      const isValid = validationErrors.length === 0;

      return reply.status(200).send({
        success: true,
        data: {
          isValid,
          errors: validationErrors,
          suggestions: isValid ? [] : [
            'Verifique os valores inseridos',
            'Consulte a documentação para limites recomendados'
          ]
        },
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PARAMETER_VALIDATION_FAILED',
          message: 'Falha ao validar parâmetros',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }
}

