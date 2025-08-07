import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/middleware/auth';
import { CORRECT_METRICS, AFFILIATE_CATEGORIES, getAllCategories } from '@/utils/affiliate-calculations';

const prisma = new PrismaClient();

// Interfaces para tipagem
interface OverviewMetrics {
  totalAffiliates: number;
  totalCustomers: number;
  totalNGR: number;
  totalCommissions: number;
  averageFraudScore: number;
}

interface CohortData {
  cohort_week: string;
  week_start_date: Date;
  total_clients: number;
  cac_total: number;
  ltv_total: number;
  roi_percentage: number;
  profit_loss: number;
  is_breakeven: boolean;
  created_at: Date;
}

interface RankingQueryParams {
  page?: string;
  limit?: string;
  classification?: string;
}

interface FraudQueryParams {
  min_score?: string;
}

export async function affiliateAnalysisRoutes(fastify: FastifyInstance) {
  // Aplicar middleware de autenticação em todas as rotas
  fastify.addHook('preHandler', authMiddleware);

  /**
   * GET /api/affiliate-analysis/cohorts
   * Lista análises de cohorts
   */
  fastify.get('/cohorts', {
    schema: {
      description: 'Lista análises de cohorts semanais',
      tags: ['Análise de Afiliados'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            total: { type: 'number' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cohorts = await prisma.$queryRaw<CohortData[]>`
        SELECT 
          cohort_week,
          week_start_date,
          total_clients,
          cac_total,
          ltv_total,
          roi_percentage,
          profit_loss,
          is_breakeven,
          created_at
        FROM cohort_analysis 
        ORDER BY week_start_date DESC
      `;
      
      return {
        success: true,
        data: cohorts,
        total: cohorts.length
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar cohorts:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  });

  /**
   * GET /api/affiliate-analysis/cohorts/summary
   * Resumo geral dos cohorts
   */
  fastify.get('/cohorts/summary', {
    schema: {
      description: 'Resumo geral dos cohorts',
      tags: ['Análise de Afiliados'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const summary = await prisma.$queryRaw<any[]>`
        SELECT 
          COUNT(*) as total_cohorts,
          COALESCE(SUM(total_clients), 0) as total_clients,
          COALESCE(SUM(cac_total), 0) as total_cac,
          COALESCE(SUM(ltv_total), 0) as total_ltv,
          COALESCE(AVG(roi_percentage), 0) as avg_roi,
          COALESCE(SUM(profit_loss), 0) as total_profit_loss,
          COUNT(CASE WHEN is_breakeven THEN 1 END) as breakeven_cohorts
        FROM cohort_analysis
      `;
      
      const data = summary[0];
      const totalCohorts = Number(data.total_cohorts);
      const breakevenRate = totalCohorts > 0 ? (Number(data.breakeven_cohorts) / totalCohorts * 100) : 0;
      
      return {
        success: true,
        data: {
          totalCohorts,
          totalClients: Number(data.total_clients),
          totalCAC: Number(data.total_cac),
          totalLTV: Number(data.total_ltv),
          averageROI: Number(data.avg_roi),
          totalProfitLoss: Number(data.total_profit_loss),
          breakevenCohorts: Number(data.breakeven_cohorts),
          breakevenRate: Math.round(breakevenRate * 100) / 100
        }
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar resumo de cohorts:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  });

  /**
   * GET /api/affiliate-analysis/classifications
   * Análise por classificação de afiliados
   */
  fastify.get('/classifications', {
    schema: {
      description: 'Análise por classificação de afiliados',
      tags: ['Análise de Afiliados'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            total: { type: 'number' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const classifications = await prisma.$queryRaw<any[]>`
        SELECT 
          classification,
          total_affiliates,
          direct_indications,
          total_clients_network,
          ngr_total,
          cpa_total,
          total_received,
          platform_profit,
          roi_percentage,
          created_at
        FROM classification_analysis 
        ORDER BY roi_percentage DESC
      `;
      
      return {
        success: true,
        data: classifications,
        total: classifications.length
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar classificações:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  });

  /**
   * GET /api/affiliate-analysis/ranking
   * Ranking de afiliados
   */
  fastify.get<{ Querystring: RankingQueryParams }>('/ranking', {
    schema: {
      description: 'Ranking de afiliados',
      tags: ['Análise de Afiliados'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string' },
          limit: { type: 'string' },
          classification: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            pagination: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: RankingQueryParams }>, reply: FastifyReply) => {
    try {
      const page = parseInt(request.query.page || '1');
      const limit = parseInt(request.query.limit || '50');
      const offset = (page - 1) * limit;
      const classification = request.query.classification;
      
      let whereClause = '';
      let queryParams: any[] = [limit, offset];
      
      if (classification) {
        whereClause = 'WHERE ar.classification = $3';
        queryParams.push(classification);
      }
      
      const ranking = await prisma.$queryRawUnsafe(`
        SELECT 
          ar.ranking_position,
          ar.external_affiliate_id,
          ar.classification,
          ar.total_clients,
          ar.ngr_total,
          ar.cpa_total,
          ar.total_received,
          ar.platform_profit,
          ar.fraud_score,
          a.referral_code,
          u.name as affiliate_name
        FROM affiliate_ranking ar
        LEFT JOIN affiliates a ON ar.affiliate_id = a.id
        LEFT JOIN users u ON a.user_id = u.id
        ${whereClause}
        ORDER BY ar.ranking_position ASC NULLS LAST
        LIMIT $1 OFFSET $2
      `, ...queryParams);
      
      const countResult = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count
        FROM affiliate_ranking ar
        ${whereClause}
      `, ...(classification ? [classification] : []));
      
      const totalItems = Number((countResult as any[])[0].count);
      const totalPages = Math.ceil(totalItems / limit);
      
      return {
        success: true,
        data: ranking,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar ranking:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  });

  /**
   * GET /api/affiliate-analysis/fraud-detection
   * Afiliados com indicadores de fraude
   */
  fastify.get<{ Querystring: FraudQueryParams }>('/fraud-detection', {
    schema: {
      description: 'Afiliados com indicadores de fraude',
      tags: ['Análise de Afiliados'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          min_score: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            total: { type: 'number' },
            criteria: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: FraudQueryParams }>, reply: FastifyReply) => {
    try {
      const minScore = parseInt(request.query.min_score || '70');
      
      const fraudData = await prisma.$queryRaw<any[]>`
        SELECT 
          ar.external_affiliate_id,
          ar.classification,
          ar.total_clients,
          ar.fraud_score,
          ar.platform_profit,
          a.referral_code,
          u.name as affiliate_name,
          a.created_at as join_date
        FROM affiliate_ranking ar
        LEFT JOIN affiliates a ON ar.affiliate_id = a.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE ar.fraud_score >= ${minScore}
        ORDER BY ar.fraud_score DESC
      `;
      
      return {
        success: true,
        data: fraudData,
        total: fraudData.length,
        criteria: {
          minScore
        }
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar fraudes:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  });

  /**
   * GET /api/affiliate-analysis/metrics/overview
   * Métricas gerais do sistema
   */
  fastify.get('/metrics/overview', {
    schema: {
      description: 'Métricas gerais do sistema',
      tags: ['Análise de Afiliados'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Usar valores corretos identificados na análise
      const metrics: OverviewMetrics = {
        totalAffiliates: 7142, // Total de afiliados processados
        totalCustomers: CORRECT_METRICS.totalClients, // 23.251
        totalNGR: CORRECT_METRICS.ltvTotal, // R$ 1.603.225 (NGR real)
        totalCommissions: CORRECT_METRICS.cacTotal, // R$ 1.917.652 (CPA + REV)
        averageFraudScore: 0 // Será calculado dinamicamente
      };
      
      return {
        success: true,
        data: metrics,
        metadata: {
          period: CORRECT_METRICS.period,
          methodology: CORRECT_METRICS.ngrCalculation,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar métricas:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  });

  /**
   * GET /api/affiliate-analysis/network/levels
   * Distribuição da rede por níveis
   */
  fastify.get('/network/levels', {
    schema: {
      description: 'Distribuição da rede por níveis',
      tags: ['Análise de Afiliados'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const networkData = await prisma.$queryRaw<any[]>`
        SELECT 
          1 as level,
          COALESCE(SUM(level_1_clients), 0) as total_clients,
          COALESCE(SUM(level_1_cpa), 0) as total_cpa,
          COALESCE(SUM(level_1_rev), 0) as total_rev
        FROM affiliate_ranking
        UNION ALL
        SELECT 
          2 as level,
          COALESCE(SUM(level_2_clients), 0) as total_clients,
          COALESCE(SUM(level_2_cpa), 0) as total_cpa,
          COALESCE(SUM(level_2_rev), 0) as total_rev
        FROM affiliate_ranking
        UNION ALL
        SELECT 
          3 as level,
          COALESCE(SUM(level_3_clients), 0) as total_clients,
          COALESCE(SUM(level_3_cpa), 0) as total_cpa,
          COALESCE(SUM(level_3_rev), 0) as total_rev
        FROM affiliate_ranking
        UNION ALL
        SELECT 
          4 as level,
          COALESCE(SUM(level_4_clients), 0) as total_clients,
          COALESCE(SUM(level_4_cpa), 0) as total_cpa,
          COALESCE(SUM(level_4_rev), 0) as total_rev
        FROM affiliate_ranking
        UNION ALL
        SELECT 
          5 as level,
          COALESCE(SUM(level_5_clients), 0) as total_clients,
          COALESCE(SUM(level_5_cpa), 0) as total_cpa,
          COALESCE(SUM(level_5_rev), 0) as total_rev
        FROM affiliate_ranking
        ORDER BY level
      `;
      
      const formattedData = networkData.map(row => ({
        level: Number(row.level),
        totalClients: Number(row.total_clients),
        totalCPA: Number(row.total_cpa),
        totalREV: Number(row.total_rev),
        totalCommissions: Number(row.total_cpa) + Number(row.total_rev)
      }));
      
      return {
        success: true,
        data: formattedData
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar níveis da rede:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  });

  /**
   * GET /api/affiliate-analysis/categories
   * Informações das categorias de afiliados e percentuais
   */
  fastify.get('/categories', {
    schema: {
      description: 'Informações das categorias de afiliados e percentuais de comissão',
      tags: ['Análise de Afiliados'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const categories = getAllCategories().map(category => ({
        name: category,
        config: AFFILIATE_CATEGORIES[category],
        description: `Categoria ${category.toLowerCase()} - REV Nível 1: ${AFFILIATE_CATEGORIES[category].revLevel1}%`
      }));
      
      return {
        success: true,
        data: categories,
        metadata: {
          totalCategories: categories.length,
          cpaValues: {
            level1: 50,
            level2: 20,
            levels3to5: 5
          }
        }
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar categorias:', error);
      reply.status(500);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  });

  /**
   * GET /api/affiliate-analysis/health
   * Health check da API
   */
  fastify.get('/health', {
    schema: {
      description: 'Health check da API de análise',
      tags: ['Análise de Afiliados'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            database: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Testa conexão com banco
      await prisma.$queryRaw`SELECT 1`;
      
      return {
        success: true,
        message: 'API de análise de afiliados funcionando',
        database: 'conectado',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      reply.status(500);
      return {
        success: false,
        message: 'Erro na API',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  });
}

