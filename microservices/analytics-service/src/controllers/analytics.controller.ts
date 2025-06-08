import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from '@/services/analytics.service';
import { ReportService } from '@/services/report.service';
import { ChartService } from '@/services/chart.service';
import {
  AnalyticsQuery,
  ReportRequest,
  TimeRange,
  ReportType,
  ReportFormat,
  MetricType,
  ExportRequest,
  DashboardRequest,
  PaginationParams
} from '@/types';
import { parseISO } from 'date-fns';

export class AnalyticsController {
  private analyticsService: AnalyticsService;
  private reportService: ReportService;
  private chartService: ChartService;

  constructor(prisma: PrismaClient) {
    this.analyticsService = new AnalyticsService(prisma);
    this.reportService = new ReportService(prisma);
    this.chartService = new ChartService();
  }

  // === ANALYTICS ENDPOINTS ===

  /**
   * Get affiliate performance analytics
   * GET /analytics/affiliates
   */
  async getAffiliatePerformance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as {
        timeRange?: TimeRange;
        startDate?: string;
        endDate?: string;
        affiliateIds?: string;
      };

      const affiliateIds = query.affiliateIds ? query.affiliateIds.split(',') : undefined;
      const dateRange = query.startDate && query.endDate ? {
        start: parseISO(query.startDate),
        end: parseISO(query.endDate)
      } : undefined;

      const performance = await this.analyticsService.getAffiliatePerformance(
        affiliateIds,
        dateRange,
        query.timeRange
      );

      return reply.send({
        success: true,
        data: performance,
        meta: {
          count: performance.length,
          timeRange: query.timeRange,
          dateRange
        }
      });
    } catch (error) {
      console.error('Error getting affiliate performance:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Get offer performance analytics
   * GET /analytics/offers
   */
  async getOfferPerformance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as {
        timeRange?: TimeRange;
        startDate?: string;
        endDate?: string;
        offerIds?: string;
      };

      const offerIds = query.offerIds ? query.offerIds.split(',') : undefined;
      const dateRange = query.startDate && query.endDate ? {
        start: parseISO(query.startDate),
        end: parseISO(query.endDate)
      } : undefined;

      const performance = await this.analyticsService.getOfferPerformance(
        offerIds,
        dateRange,
        query.timeRange
      );

      return reply.send({
        success: true,
        data: performance,
        meta: {
          count: performance.length,
          timeRange: query.timeRange,
          dateRange
        }
      });
    } catch (error) {
      console.error('Error getting offer performance:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Get conversion metrics
   * GET /analytics/conversions
   */
  async getConversionMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as AnalyticsQuery;
      const metrics = await this.analyticsService.getConversionMetrics(query);

      return reply.send({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error getting conversion metrics:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Get revenue metrics
   * GET /analytics/revenue
   */
  async getRevenueMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as AnalyticsQuery;
      const metrics = await this.analyticsService.getRevenueMetrics(query);

      return reply.send({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error getting revenue metrics:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Get traffic metrics
   * GET /analytics/traffic
   */
  async getTrafficMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as AnalyticsQuery;
      const metrics = await this.analyticsService.getTrafficMetrics(query);

      return reply.send({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error getting traffic metrics:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Get real-time metrics
   * GET /analytics/realtime
   */
  async getRealTimeMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const metrics = await this.analyticsService.getRealTimeMetrics();

      return reply.send({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Get comprehensive analytics overview
   * GET /analytics/overview
   */
  async getAnalyticsOverview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as AnalyticsQuery;
      const overview = await this.analyticsService.generateAnalyticsReport(query);

      return reply.send({
        success: true,
        data: overview
      });
    } catch (error) {
      console.error('Error getting analytics overview:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // === REPORTS ENDPOINTS ===

  /**
   * Generate a new report
   * POST /reports
   */
  async generateReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as ReportRequest;

      // Validate required fields
      if (!body.type || !body.timeRange || !body.startDate || !body.endDate) {
        return reply.status(400).send({
          error: 'Campos obrigatórios: type, timeRange, startDate, endDate'
        });
      }

      // Convert string dates to Date objects
      const reportRequest: ReportRequest = {
        ...body,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        format: body.format || ReportFormat.PDF,
        includeCharts: body.includeCharts !== false,
        includeRawData: body.includeRawData !== false,
        filters: body.filters || {}
      };

      const report = await this.reportService.generateReport(reportRequest);

      return reply.status(201).send({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generating report:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Get report by ID
   * GET /reports/:id
   */
  async getReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      const report = await this.reportService.getReport(params.id);

      if (!report) {
        return reply.status(404).send({
          error: 'Relatório não encontrado'
        });
      }

      return reply.send({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error getting report:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * List reports
   * GET /reports
   */
  async listReports(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as {
        page?: string;
        limit?: string;
        type?: ReportType;
        status?: string;
      };

      const page = parseInt(query.page || '1', 10);
      const limit = parseInt(query.limit || '20', 10);

      const result = await this.reportService.listReports(
        page,
        limit,
        query.type,
        query.status as any
      );

      return reply.send({
        success: true,
        data: result.reports,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Error listing reports:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Download report file
   * GET /reports/:id/download
   */
  async downloadReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      const report = await this.reportService.getReport(params.id);

      if (!report || !report.downloadUrl) {
        return reply.status(404).send({
          error: 'Arquivo de relatório não encontrado'
        });
      }

      // TODO: Implement file serving logic
      return reply.send({
        success: true,
        downloadUrl: report.downloadUrl
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // === EXPORT ENDPOINTS ===

  /**
   * Export data
   * POST /exports
   */
  async exportData(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as ExportRequest;

      if (!body.type || !body.data) {
        return reply.status(400).send({
          error: 'Campos obrigatórios: type, data'
        });
      }

      const downloadUrl = await this.reportService.exportData(body);

      return reply.status(201).send({
        success: true,
        downloadUrl
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // === CHARTS ENDPOINTS ===

  /**
   * Generate chart
   * POST /charts
   */
  async generateChart(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as {
        type: string;
        title: string;
        data: any;
        options?: any;
      };

      if (!body.type || !body.title || !body.data) {
        return reply.status(400).send({
          error: 'Campos obrigatórios: type, title, data'
        });
      }

      let chart;

      switch (body.type.toLowerCase()) {
        case 'line':
          chart = await this.chartService.generateLineChart({
            title: body.title,
            data: body.data,
            xLabel: body.options?.xLabel || 'X',
            yLabel: body.options?.yLabel || 'Y',
            color: body.options?.color || '#3498db'
          });
          break;
        case 'bar':
          chart = await this.chartService.generateBarChart({
            title: body.title,
            data: body.data,
            xLabel: body.options?.xLabel || 'X',
            yLabel: body.options?.yLabel || 'Y',
            color: body.options?.color || '#e74c3c'
          });
          break;
        case 'pie':
          chart = await this.chartService.generatePieChart({
            title: body.title,
            data: body.data,
            colors: body.options?.colors || this.chartService.getChartColors(body.data.length)
          });
          break;
        default:
          return reply.status(400).send({
            error: 'Tipo de gráfico não suportado'
          });
      }

      return reply.send({
        success: true,
        data: chart
      });
    } catch (error) {
      console.error('Error generating chart:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // === METRICS ENDPOINTS ===

  /**
   * Store custom metric
   * POST /metrics
   */
  async storeMetric(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as {
        type: MetricType;
        value: number;
        dimensions?: any;
        date?: string;
      };

      if (!body.type || body.value === undefined) {
        return reply.status(400).send({
          error: 'Campos obrigatórios: type, value'
        });
      }

      await this.analyticsService.storeMetric(
        body.type,
        body.value,
        body.dimensions || {},
        body.date ? new Date(body.date) : new Date()
      );

      return reply.status(201).send({
        success: true,
        message: 'Métrica armazenada com sucesso'
      });
    } catch (error) {
      console.error('Error storing metric:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // === HEALTH CHECK ===

  /**
   * Health check
   * GET /health
   */
  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Check database connection
      const { checkDatabaseHealth } = await import('@/config/database');
      const dbHealth = await checkDatabaseHealth();

      // Check Redis connection
      const { checkRedisHealth } = await import('@/config/redis');
      const redisHealth = await checkRedisHealth();

      const isHealthy = dbHealth && redisHealth;

      return reply.status(isHealthy ? 200 : 503).send({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'analytics-service',
        version: '1.0.0',
        checks: {
          database: dbHealth,
          redis: redisHealth,
          charts: true, // Chart service is always available
          reports: true // Report service is always available
        }
      });
    } catch (error) {
      console.error('Health check error:', error);
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'analytics-service',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}

