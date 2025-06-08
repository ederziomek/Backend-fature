import { FastifyInstance } from 'fastify';
import { AnalyticsController } from '@/controllers/analytics.controller';
import { PrismaClient } from '@prisma/client';

export async function analyticsRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  const analyticsController = new AnalyticsController(prisma);

  // Analytics endpoints
  fastify.get('/analytics/affiliates', {
    schema: {
      description: 'Get affiliate performance analytics',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          timeRange: { type: 'string', enum: ['LAST_24H', 'LAST_7D', 'LAST_30D', 'LAST_90D', 'LAST_YEAR', 'CUSTOM'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          affiliateIds: { type: 'string', description: 'Comma-separated affiliate IDs' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            meta: { type: 'object' }
          }
        }
      }
    }
  }, analyticsController.getAffiliatePerformance.bind(analyticsController));

  fastify.get('/analytics/offers', {
    schema: {
      description: 'Get offer performance analytics',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          timeRange: { type: 'string', enum: ['LAST_24H', 'LAST_7D', 'LAST_30D', 'LAST_90D', 'LAST_YEAR', 'CUSTOM'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          offerIds: { type: 'string', description: 'Comma-separated offer IDs' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            meta: { type: 'object' }
          }
        }
      }
    }
  }, analyticsController.getOfferPerformance.bind(analyticsController));

  fastify.get('/analytics/conversions', {
    schema: {
      description: 'Get conversion metrics',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          timeRange: { type: 'string', enum: ['LAST_24H', 'LAST_7D', 'LAST_30D', 'LAST_90D', 'LAST_YEAR', 'CUSTOM'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          affiliateIds: { type: 'string' },
          offerIds: { type: 'string' }
        }
      },
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
  }, analyticsController.getConversionMetrics.bind(analyticsController));

  fastify.get('/analytics/revenue', {
    schema: {
      description: 'Get revenue metrics',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          timeRange: { type: 'string', enum: ['LAST_24H', 'LAST_7D', 'LAST_30D', 'LAST_90D', 'LAST_YEAR', 'CUSTOM'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          affiliateIds: { type: 'string' },
          offerIds: { type: 'string' }
        }
      },
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
  }, analyticsController.getRevenueMetrics.bind(analyticsController));

  fastify.get('/analytics/traffic', {
    schema: {
      description: 'Get traffic metrics',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          timeRange: { type: 'string', enum: ['LAST_24H', 'LAST_7D', 'LAST_30D', 'LAST_90D', 'LAST_YEAR', 'CUSTOM'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          affiliateIds: { type: 'string' },
          offerIds: { type: 'string' }
        }
      },
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
  }, analyticsController.getTrafficMetrics.bind(analyticsController));

  fastify.get('/analytics/realtime', {
    schema: {
      description: 'Get real-time metrics',
      tags: ['Analytics'],
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
  }, analyticsController.getRealTimeMetrics.bind(analyticsController));

  fastify.get('/analytics/overview', {
    schema: {
      description: 'Get comprehensive analytics overview',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          timeRange: { type: 'string', enum: ['LAST_24H', 'LAST_7D', 'LAST_30D', 'LAST_90D', 'LAST_YEAR', 'CUSTOM'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          affiliateIds: { type: 'string' },
          offerIds: { type: 'string' }
        }
      },
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
  }, analyticsController.getAnalyticsOverview.bind(analyticsController));

  // Reports endpoints
  fastify.post('/reports', {
    schema: {
      description: 'Generate a new analytics report',
      tags: ['Reports'],
      body: {
        type: 'object',
        required: ['type', 'timeRange', 'startDate', 'endDate'],
        properties: {
          type: { type: 'string', enum: ['AFFILIATE_PERFORMANCE', 'OFFER_PERFORMANCE', 'CONVERSION_ANALYSIS', 'REVENUE_ANALYSIS', 'TRAFFIC_ANALYSIS', 'COMMISSION_REPORT', 'CUSTOM_REPORT'] },
          timeRange: { type: 'string', enum: ['LAST_24H', 'LAST_7D', 'LAST_30D', 'LAST_90D', 'LAST_YEAR', 'CUSTOM'] },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          affiliateIds: { type: 'array', items: { type: 'string' } },
          offerIds: { type: 'array', items: { type: 'string' } },
          filters: { type: 'object' },
          format: { type: 'string', enum: ['pdf', 'excel', 'csv', 'json'], default: 'pdf' },
          includeCharts: { type: 'boolean', default: true },
          includeRawData: { type: 'boolean', default: true }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, analyticsController.generateReport.bind(analyticsController));

  fastify.get('/reports/:id', {
    schema: {
      description: 'Get report by ID',
      tags: ['Reports'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
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
  }, analyticsController.getReport.bind(analyticsController));

  fastify.get('/reports', {
    schema: {
      description: 'List reports with pagination',
      tags: ['Reports'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', default: '1' },
          limit: { type: 'string', default: '20' },
          type: { type: 'string' },
          status: { type: 'string' }
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
  }, analyticsController.listReports.bind(analyticsController));

  fastify.get('/reports/:id/download', {
    schema: {
      description: 'Download report file',
      tags: ['Reports'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, analyticsController.downloadReport.bind(analyticsController));

  // Export endpoints
  fastify.post('/exports', {
    schema: {
      description: 'Export data to various formats',
      tags: ['Export'],
      body: {
        type: 'object',
        required: ['type', 'data'],
        properties: {
          type: { type: 'string', enum: ['pdf', 'excel', 'csv'] },
          data: { type: 'object' },
          template: { type: 'string' },
          options: {
            type: 'object',
            properties: {
              includeCharts: { type: 'boolean', default: true },
              includeRawData: { type: 'boolean', default: true },
              compression: { type: 'boolean', default: false },
              password: { type: 'string' }
            }
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            downloadUrl: { type: 'string' }
          }
        }
      }
    }
  }, analyticsController.exportData.bind(analyticsController));

  // Charts endpoints
  fastify.post('/charts', {
    schema: {
      description: 'Generate chart visualization',
      tags: ['Charts'],
      body: {
        type: 'object',
        required: ['type', 'title', 'data'],
        properties: {
          type: { type: 'string', enum: ['line', 'bar', 'pie', 'doughnut', 'area'] },
          title: { type: 'string' },
          data: { type: 'array' },
          options: {
            type: 'object',
            properties: {
              xLabel: { type: 'string' },
              yLabel: { type: 'string' },
              color: { type: 'string' },
              colors: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      },
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
  }, analyticsController.generateChart.bind(analyticsController));

  // Metrics endpoints
  fastify.post('/metrics', {
    schema: {
      description: 'Store custom metric',
      tags: ['Metrics'],
      body: {
        type: 'object',
        required: ['type', 'value'],
        properties: {
          type: { type: 'string', enum: ['CLICKS', 'CONVERSIONS', 'REVENUE', 'COMMISSIONS', 'CONVERSION_RATE', 'EPC', 'CTR', 'AOV'] },
          value: { type: 'number' },
          dimensions: { type: 'object' },
          date: { type: 'string', format: 'date-time' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, analyticsController.storeMetric.bind(analyticsController));

  // Health check
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            service: { type: 'string' },
            version: { type: 'string' },
            checks: { type: 'object' }
          }
        }
      }
    }
  }, analyticsController.healthCheck.bind(analyticsController));
}

