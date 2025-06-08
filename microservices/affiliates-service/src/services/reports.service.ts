// ===============================================
// REPORTS SERVICE - SISTEMA DE RELATÓRIOS
// ===============================================

import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { 
  ReportRequest,
  ReportData,
  ReportFormat,
  AffiliatePerformanceReport,
  CommissionReport,
  NetworkReport,
  ConversionReport
} from '@/types';
import { AffiliateService } from './affiliate.service';
import { EventService } from './event.service';
import { AuditService } from './audit.service';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

export class ReportsService {
  /**
   * Gera relatório de performance do afiliado
   */
  static async generatePerformanceReport(request: ReportRequest): Promise<ReportData> {
    try {
      const { affiliateId, startDate, endDate, format } = request;
      
      // Buscar dados do afiliado
      const affiliate = await AffiliateService.getById(affiliateId);
      if (!affiliate) {
        throw new Error('Afiliado não encontrado');
      }

      // Calcular métricas do período
      const metrics = await this.calculatePerformanceMetrics(affiliateId, startDate, endDate);
      
      // Gerar relatório baseado no formato
      let reportData: ReportData;
      
      switch (format) {
        case 'pdf':
          reportData = await this.generatePDFReport(affiliate, metrics, request);
          break;
        case 'excel':
          reportData = await this.generateExcelReport(affiliate, metrics, request);
          break;
        case 'csv':
          reportData = await this.generateCSVReport(affiliate, metrics, request);
          break;
        case 'json':
        default:
          reportData = await this.generateJSONReport(affiliate, metrics, request);
          break;
      }

      // Salvar registro do relatório
      const report = await prisma.report.create({
        data: {
          affiliateId,
          type: 'performance',
          format,
          startDate,
          endDate,
          filePath: reportData.filePath,
          fileSize: reportData.fileSize,
          status: 'completed'
        }
      });

      // Publicar evento
      await EventService.publishReportGenerated({
        reportId: report.id,
        affiliateId,
        type: 'performance',
        format,
        timestamp: new Date()
      });

      return {
        ...reportData,
        reportId: report.id
      };

    } catch (error: any) {
      await AuditService.log({
        action: 'reports.performance.error',
        resource: 'report',
        resourceId: request.affiliateId,
        details: {
          error: error.message,
          request
        },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Gera relatório de comissões
   */
  static async generateCommissionReport(request: ReportRequest): Promise<ReportData> {
    try {
      const { affiliateId, startDate, endDate, format } = request;
      
      // Buscar comissões do período
      const commissions = await prisma.commission.findMany({
        where: {
          affiliateId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          sourceAffiliate: {
            select: {
              affiliateCode: true,
              category: true,
              categoryLevel: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Calcular totais
      const totals = {
        cpa: commissions.filter(c => c.type === 'cpa').reduce((sum, c) => sum + c.finalAmount, 0),
        revshare: commissions.filter(c => c.type === 'revshare').reduce((sum, c) => sum + c.finalAmount, 0),
        total: commissions.reduce((sum, c) => sum + c.finalAmount, 0),
        count: commissions.length
      };

      const reportData: CommissionReport = {
        affiliate: await AffiliateService.getById(affiliateId),
        period: { startDate, endDate },
        commissions,
        totals,
        generatedAt: new Date()
      };

      // Gerar arquivo baseado no formato
      let filePath: string;
      let fileSize: number;

      switch (format) {
        case 'excel':
          filePath = await this.generateCommissionExcel(reportData);
          break;
        case 'csv':
          filePath = await this.generateCommissionCSV(reportData);
          break;
        case 'pdf':
          filePath = await this.generateCommissionPDF(reportData);
          break;
        default:
          filePath = await this.generateCommissionJSON(reportData);
          break;
      }

      fileSize = fs.statSync(filePath).size;

      return {
        filePath,
        fileSize,
        format,
        data: reportData
      };

    } catch (error: any) {
      await AuditService.log({
        action: 'reports.commission.error',
        resource: 'report',
        resourceId: request.affiliateId,
        details: {
          error: error.message,
          request
        },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Gera relatório de rede MLM
   */
  static async generateNetworkReport(request: ReportRequest): Promise<ReportData> {
    try {
      const { affiliateId, startDate, endDate, format } = request;
      
      // Buscar estrutura da rede
      const network = await AffiliateService.getNetworkStructure(affiliateId, 5);
      
      // Calcular métricas da rede
      const networkMetrics = await this.calculateNetworkMetrics(affiliateId, startDate, endDate);
      
      const reportData: NetworkReport = {
        affiliate: await AffiliateService.getById(affiliateId),
        period: { startDate, endDate },
        network,
        metrics: networkMetrics,
        generatedAt: new Date()
      };

      // Gerar arquivo
      let filePath: string;
      switch (format) {
        case 'excel':
          filePath = await this.generateNetworkExcel(reportData);
          break;
        case 'pdf':
          filePath = await this.generateNetworkPDF(reportData);
          break;
        default:
          filePath = await this.generateNetworkJSON(reportData);
          break;
      }

      const fileSize = fs.statSync(filePath).size;

      return {
        filePath,
        fileSize,
        format,
        data: reportData
      };

    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Calcula métricas de performance
   */
  private static async calculatePerformanceMetrics(
    affiliateId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<AffiliatePerformanceReport> {
    
    // Indicações do período
    const indications = await prisma.customer.count({
      where: {
        referredBy: affiliateId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Indicações validadas
    const validatedIndications = await prisma.customer.count({
      where: {
        referredBy: affiliateId,
        isValidated: true,
        validatedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Comissões do período
    const commissions = await prisma.commission.findMany({
      where: {
        affiliateId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const totalCommissions = commissions.reduce((sum, c) => sum + c.finalAmount, 0);
    const cpaCommissions = commissions.filter(c => c.type === 'cpa').reduce((sum, c) => sum + c.finalAmount, 0);
    const revshareCommissions = commissions.filter(c => c.type === 'revshare').reduce((sum, c) => sum + c.finalAmount, 0);

    // Taxa de conversão
    const conversionRate = indications > 0 ? (validatedIndications / indications) * 100 : 0;

    // Transações dos clientes indicados
    const transactions = await prisma.transaction.findMany({
      where: {
        customer: {
          referredBy: affiliateId
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'completed'
      }
    });

    const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
    const deposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const withdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);

    return {
      period: { startDate, endDate },
      indications: {
        total: indications,
        validated: validatedIndications,
        conversionRate: Math.round(conversionRate * 100) / 100
      },
      commissions: {
        total: totalCommissions,
        cpa: cpaCommissions,
        revshare: revshareCommissions,
        count: commissions.length
      },
      volume: {
        total: totalVolume,
        deposits,
        withdrawals,
        ngr: deposits - withdrawals
      },
      generatedAt: new Date()
    };
  }

  /**
   * Calcula métricas da rede
   */
  private static async calculateNetworkMetrics(
    affiliateId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    
    // Buscar todos os descendentes
    const descendants = await this.getAllDescendants(affiliateId);
    
    // Calcular métricas por nível
    const levelMetrics = [];
    for (let level = 1; level <= 5; level++) {
      const levelAffiliates = descendants.filter(d => d.level === level);
      const levelCommissions = await prisma.commission.aggregate({
        where: {
          sourceAffiliateId: {
            in: levelAffiliates.map(a => a.id)
          },
          level: level,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          finalAmount: true
        },
        _count: {
          id: true
        }
      });

      levelMetrics.push({
        level,
        affiliatesCount: levelAffiliates.length,
        commissionsTotal: levelCommissions._sum.finalAmount || 0,
        commissionsCount: levelCommissions._count.id || 0
      });
    }

    return {
      totalDescendants: descendants.length,
      levelMetrics,
      period: { startDate, endDate }
    };
  }

  /**
   * Busca todos os descendentes de um afiliado
   */
  private static async getAllDescendants(affiliateId: string, level: number = 1): Promise<any[]> {
    if (level > 5) return [];

    const children = await prisma.affiliate.findMany({
      where: { sponsorId: affiliateId },
      select: { id: true, affiliateCode: true, category: true }
    });

    let descendants = children.map(child => ({ ...child, level }));

    for (const child of children) {
      const childDescendants = await this.getAllDescendants(child.id, level + 1);
      descendants = descendants.concat(childDescendants);
    }

    return descendants;
  }

  /**
   * Gera relatório Excel de comissões
   */
  private static async generateCommissionExcel(data: CommissionReport): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Comissões');

    // Cabeçalhos
    worksheet.columns = [
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Tipo', key: 'type', width: 10 },
      { header: 'Nível', key: 'level', width: 8 },
      { header: 'Valor Base', key: 'baseAmount', width: 12 },
      { header: 'Percentual', key: 'percentage', width: 10 },
      { header: 'Valor Final', key: 'finalAmount', width: 12 },
      { header: 'Status', key: 'status', width: 10 }
    ];

    // Dados
    data.commissions.forEach(commission => {
      worksheet.addRow({
        date: commission.createdAt.toLocaleDateString('pt-BR'),
        type: commission.type.toUpperCase(),
        level: commission.level,
        baseAmount: commission.baseAmount,
        percentage: `${commission.percentage}%`,
        finalAmount: commission.finalAmount,
        status: commission.status
      });
    });

    // Totais
    worksheet.addRow({});
    worksheet.addRow({
      date: 'TOTAL CPA',
      finalAmount: data.totals.cpa
    });
    worksheet.addRow({
      date: 'TOTAL REVSHARE',
      finalAmount: data.totals.revshare
    });
    worksheet.addRow({
      date: 'TOTAL GERAL',
      finalAmount: data.totals.total
    });

    // Salvar arquivo
    const fileName = `comissoes_${data.affiliate.affiliateCode}_${Date.now()}.xlsx`;
    const filePath = path.join('/tmp', fileName);
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }

  /**
   * Gera relatório CSV de comissões
   */
  private static async generateCommissionCSV(data: CommissionReport): Promise<string> {
    const headers = ['Data', 'Tipo', 'Nível', 'Valor Base', 'Percentual', 'Valor Final', 'Status'];
    const rows = data.commissions.map(c => [
      c.createdAt.toLocaleDateString('pt-BR'),
      c.type.toUpperCase(),
      c.level,
      c.baseAmount,
      `${c.percentage}%`,
      c.finalAmount,
      c.status
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const fileName = `comissoes_${data.affiliate.affiliateCode}_${Date.now()}.csv`;
    const filePath = path.join('/tmp', fileName);
    fs.writeFileSync(filePath, csvContent);

    return filePath;
  }

  /**
   * Gera relatório JSON
   */
  private static async generateCommissionJSON(data: CommissionReport): Promise<string> {
    const fileName = `comissoes_${data.affiliate.affiliateCode}_${Date.now()}.json`;
    const filePath = path.join('/tmp', fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return filePath;
  }

  /**
   * Gera relatório PDF (placeholder)
   */
  private static async generateCommissionPDF(data: CommissionReport): Promise<string> {
    // Implementar geração de PDF com puppeteer ou similar
    const fileName = `comissoes_${data.affiliate.affiliateCode}_${Date.now()}.pdf`;
    const filePath = path.join('/tmp', fileName);
    
    // Por enquanto, criar arquivo vazio
    fs.writeFileSync(filePath, 'PDF Report - To be implemented');
    
    return filePath;
  }

  /**
   * Gera outros formatos de relatório (placeholders)
   */
  private static async generatePDFReport(affiliate: any, metrics: any, request: ReportRequest): Promise<ReportData> {
    return { filePath: '', fileSize: 0, format: 'pdf', data: metrics };
  }

  private static async generateExcelReport(affiliate: any, metrics: any, request: ReportRequest): Promise<ReportData> {
    return { filePath: '', fileSize: 0, format: 'excel', data: metrics };
  }

  private static async generateCSVReport(affiliate: any, metrics: any, request: ReportRequest): Promise<ReportData> {
    return { filePath: '', fileSize: 0, format: 'csv', data: metrics };
  }

  private static async generateJSONReport(affiliate: any, metrics: any, request: ReportRequest): Promise<ReportData> {
    return { filePath: '', fileSize: 0, format: 'json', data: metrics };
  }

  private static async generateNetworkExcel(data: NetworkReport): Promise<string> {
    return '/tmp/network.xlsx';
  }

  private static async generateNetworkPDF(data: NetworkReport): Promise<string> {
    return '/tmp/network.pdf';
  }

  private static async generateNetworkJSON(data: NetworkReport): Promise<string> {
    return '/tmp/network.json';
  }
}

