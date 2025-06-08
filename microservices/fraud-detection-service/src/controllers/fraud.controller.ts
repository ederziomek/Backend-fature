// ===============================================
// CONTROLADOR - FRAUD DETECTION SERVICE
// ===============================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { PatternDetectorService } from '../services/pattern-detector.service';
import { AlertManagerService } from '../services/alert-manager.service';
import { BehaviorAnalyzerService } from '../services/behavior-analyzer.service';
import { InvestigationService } from '../services/investigation.service';
import { 
  ApiResponse, 
  AlertRequest, 
  InvestigationRequest,
  FraudAlert,
  RiskAssessment
} from '../types/fraud.types';

export class FraudController {
  private patternDetector: PatternDetectorService;
  private alertManager: AlertManagerService;
  private behaviorAnalyzer: BehaviorAnalyzerService;
  private investigationService: InvestigationService;

  constructor(
    prisma: PrismaClient,
    redis: Redis
  ) {
    this.patternDetector = new PatternDetectorService(prisma, redis);
    this.alertManager = new AlertManagerService(prisma, redis);
    this.behaviorAnalyzer = new BehaviorAnalyzerService(prisma, redis);
    this.investigationService = new InvestigationService(prisma, redis);
  }

  /**
   * Executa análise completa de fraude para um afiliado
   * POST /fraud/analyze/:affiliateId
   */
  async analyzeAffiliate(
    request: FastifyRequest<{ Params: { affiliateId: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { affiliateId } = request.params;

      // 1. Detectar padrões suspeitos
      const patternResults = await this.patternDetector.detectPatterns(affiliateId);
      
      // 2. Analisar comportamento
      const behaviorProfile = await this.behaviorAnalyzer.analyzeBehavior(affiliateId);
      
      // 3. Calcular avaliação de risco
      const riskAssessment = await this.behaviorAnalyzer.calculateRiskAssessment(affiliateId);
      
      // 4. Criar alertas se necessário
      const alerts = [];
      for (const pattern of patternResults) {
        if (pattern.matched && pattern.riskScore > 50) {
          const alert = await this.alertManager.createAlert({
            affiliateId,
            patternId: pattern.patternId,
            severity: this.determineSeverity(pattern.riskScore),
            riskScore: pattern.riskScore,
            description: `Padrão suspeito detectado: ${pattern.patternId}`,
            evidence: pattern.evidence
          });
          alerts.push(alert);
        }
      }

      return reply.status(200).send({
        success: true,
        data: {
          affiliateId,
          riskAssessment,
          patternResults,
          behaviorProfile,
          alerts,
          analyzedAt: new Date()
        },
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ANALYSIS_FAILED',
          message: 'Falha na análise de fraude',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Lista alertas de fraude
   * GET /fraud/alerts
   */
  async getAlerts(
    request: FastifyRequest<{
      Querystring: {
        status?: string;
        severity?: string;
        affiliateId?: string;
        page?: number;
        limit?: number;
      }
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { status, severity, affiliateId, page = 1, limit = 20 } = request.query;

      const alerts = await this.alertManager.getAlerts({
        status,
        severity,
        affiliateId,
        page,
        limit
      });

      const total = await this.alertManager.countAlerts({
        status,
        severity,
        affiliateId
      });

      return reply.status(200).send({
        success: true,
        data: alerts,
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
          code: 'ALERTS_FETCH_FAILED',
          message: 'Falha ao buscar alertas',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Busca alerta específico
   * GET /fraud/alerts/:alertId
   */
  async getAlert(
    request: FastifyRequest<{ Params: { alertId: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { alertId } = request.params;

      const alert = await this.alertManager.getAlertById(alertId);

      if (!alert) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'ALERT_NOT_FOUND',
            message: 'Alerta não encontrado'
          },
          meta: {
            timestamp: new Date()
          }
        });
      }

      return reply.status(200).send({
        success: true,
        data: alert,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ALERT_FETCH_FAILED',
          message: 'Falha ao buscar alerta',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Atualiza status de um alerta
   * PUT /fraud/alerts/:alertId/status
   */
  async updateAlertStatus(
    request: FastifyRequest<{
      Params: { alertId: string };
      Body: { status: string; notes?: string }
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { alertId } = request.params;
      const { status, notes } = request.body;

      const updatedAlert = await this.alertManager.updateAlertStatus(alertId, status, notes);

      return reply.status(200).send({
        success: true,
        data: updatedAlert,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ALERT_UPDATE_FAILED',
          message: 'Falha ao atualizar alerta',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Inicia investigação para um alerta
   * POST /fraud/investigations
   */
  async createInvestigation(
    request: FastifyRequest<{ Body: InvestigationRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const investigationData = request.body;

      const investigation = await this.investigationService.createInvestigation(investigationData);

      return reply.status(201).send({
        success: true,
        data: investigation,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INVESTIGATION_CREATE_FAILED',
          message: 'Falha ao criar investigação',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Lista investigações
   * GET /fraud/investigations
   */
  async getInvestigations(
    request: FastifyRequest<{
      Querystring: {
        status?: string;
        priority?: string;
        investigatorId?: string;
        page?: number;
        limit?: number;
      }
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { status, priority, investigatorId, page = 1, limit = 20 } = request.query;

      const investigations = await this.investigationService.getInvestigations({
        status,
        priority,
        investigatorId,
        page,
        limit
      });

      const total = await this.investigationService.countInvestigations({
        status,
        priority,
        investigatorId
      });

      return reply.status(200).send({
        success: true,
        data: investigations,
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
          code: 'INVESTIGATIONS_FETCH_FAILED',
          message: 'Falha ao buscar investigações',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Busca perfil comportamental de um afiliado
   * GET /fraud/behavior/:affiliateId
   */
  async getBehaviorProfile(
    request: FastifyRequest<{ Params: { affiliateId: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { affiliateId } = request.params;

      const profile = await this.behaviorAnalyzer.getBehaviorProfile(affiliateId);

      return reply.status(200).send({
        success: true,
        data: profile,
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'BEHAVIOR_FETCH_FAILED',
          message: 'Falha ao buscar perfil comportamental',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Executa análise em lote para múltiplos afiliados
   * POST /fraud/batch-analyze
   */
  async batchAnalyze(
    request: FastifyRequest<{ Body: { affiliateIds: string[] } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { affiliateIds } = request.body;

      if (!affiliateIds || affiliateIds.length === 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Lista de afiliados é obrigatória'
          },
          meta: {
            timestamp: new Date()
          }
        });
      }

      const results = [];
      for (const affiliateId of affiliateIds) {
        try {
          const patternResults = await this.patternDetector.detectPatterns(affiliateId);
          const riskAssessment = await this.behaviorAnalyzer.calculateRiskAssessment(affiliateId);
          
          results.push({
            affiliateId,
            riskAssessment,
            patternResults,
            status: 'completed'
          });
        } catch (error) {
          results.push({
            affiliateId,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      return reply.status(200).send({
        success: true,
        data: {
          results,
          summary: {
            total: affiliateIds.length,
            completed: results.filter(r => r.status === 'completed').length,
            failed: results.filter(r => r.status === 'failed').length
          }
        },
        meta: {
          timestamp: new Date()
        }
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'BATCH_ANALYSIS_FAILED',
          message: 'Falha na análise em lote',
          details: error.message
        },
        meta: {
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Determina severidade baseada no score de risco
   */
  private determineSeverity(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 85) return 'critical';
    if (riskScore >= 70) return 'high';
    if (riskScore >= 50) return 'medium';
    return 'low';
  }
}

