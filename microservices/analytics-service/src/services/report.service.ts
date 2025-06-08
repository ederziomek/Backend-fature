import { PrismaClient } from '@prisma/client';
import { AnalyticsCache } from '@/config/redis';
import { analyticsConfig } from '@/config';
import {
  ReportRequest,
  GeneratedReport,
  ReportData,
  ChartData,
  ReportFormat,
  ReportType,
  ReportStatus,
  ChartType,
  ExportRequest,
  ExportOptions
} from '@/types';
import { AnalyticsService } from './analytics.service';
import { ChartService } from './chart.service';
import * as ExcelJS from 'exceljs';
import * as puppeteer from 'puppeteer';
import { format } from 'date-fns';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ReportService {
  private prisma: PrismaClient;
  private cache: AnalyticsCache;
  private analyticsService: AnalyticsService;
  private chartService: ChartService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.cache = new AnalyticsCache();
    this.analyticsService = new AnalyticsService(prisma);
    this.chartService = new ChartService();
  }

  /**
   * Generate a comprehensive analytics report
   */
  async generateReport(request: ReportRequest): Promise<GeneratedReport> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create report record
    const report = await this.prisma.analyticsReport.create({
      data: {
        id: reportId,
        name: `${request.type} Report - ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
        description: `Generated report for ${request.type}`,
        type: request.type,
        status: ReportStatus.PROCESSING,
        timeRange: request.timeRange,
        startDate: request.startDate,
        endDate: request.endDate,
        filters: request.filters as any,
        parameters: request as any,
        createdBy: 'system', // TODO: Get from auth context
        expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days
      }
    });

    try {
      // Generate analytics data
      const analyticsQuery = {
        timeRange: request.timeRange,
        startDate: request.startDate.toISOString(),
        endDate: request.endDate.toISOString(),
        affiliateIds: request.affiliateIds,
        offerIds: request.offerIds,
        groupBy: [],
        metrics: []
      };

      const reportData = await this.analyticsService.generateAnalyticsReport(analyticsQuery);

      // Generate charts if requested
      let charts: ChartData[] = [];
      if (request.includeCharts) {
        charts = await this.generateReportCharts(reportData, request.type);
      }

      // Generate file based on format
      let downloadUrl: string | undefined;
      let fileSize: number | undefined;

      if (request.format !== ReportFormat.JSON) {
        const filePath = await this.generateReportFile(
          reportData,
          charts,
          request.format,
          reportId
        );
        
        downloadUrl = `/api/v1/reports/${reportId}/download`;
        const stats = await fs.stat(filePath);
        fileSize = stats.size;
      }

      // Update report with generated data
      const updatedReport = await this.prisma.analyticsReport.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.COMPLETED,
          data: reportData as any,
          charts: charts as any,
          metadata: {
            generatedBy: 'system',
            generatedAt: new Date(),
            parameters: request,
            recordCount: this.calculateRecordCount(reportData),
            processingTime: Date.now() - report.createdAt.getTime()
          } as any,
          fileUrl: downloadUrl,
          fileSize,
          format: request.format
        }
      });

      return {
        id: reportId,
        type: request.type,
        status: ReportStatus.COMPLETED,
        data: reportData,
        charts,
        metadata: updatedReport.metadata as any,
        downloadUrl,
        createdAt: updatedReport.createdAt,
        expiresAt: updatedReport.expiresAt!
      };

    } catch (error) {
      // Update report status to failed
      await this.prisma.analyticsReport.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.FAILED,
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date()
          } as any
        }
      });

      throw error;
    }
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<GeneratedReport | null> {
    const report = await this.prisma.analyticsReport.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      return null;
    }

    return {
      id: report.id,
      type: report.type,
      status: report.status,
      data: report.data as any,
      charts: report.charts as any,
      metadata: report.metadata as any,
      downloadUrl: report.fileUrl || undefined,
      createdAt: report.createdAt,
      expiresAt: report.expiresAt!
    };
  }

  /**
   * List reports with pagination
   */
  async listReports(
    page: number = 1,
    limit: number = 20,
    type?: ReportType,
    status?: ReportStatus
  ): Promise<{
    reports: GeneratedReport[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      this.prisma.analyticsReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.analyticsReport.count({ where })
    ]);

    return {
      reports: reports.map(report => ({
        id: report.id,
        type: report.type,
        status: report.status,
        data: report.data as any,
        charts: report.charts as any,
        metadata: report.metadata as any,
        downloadUrl: report.fileUrl || undefined,
        createdAt: report.createdAt,
        expiresAt: report.expiresAt!
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Export data to various formats
   */
  async exportData(request: ExportRequest): Promise<string> {
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create export record
    await this.prisma.analyticsExport.create({
      data: {
        id: exportId,
        name: `Data Export - ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
        type: request.type,
        status: ReportStatus.PROCESSING,
        parameters: request as any,
        createdBy: 'system'
      }
    });

    try {
      let filePath: string;

      switch (request.type) {
        case 'pdf':
          filePath = await this.exportToPDF(request.data, request.options, exportId);
          break;
        case 'excel':
          filePath = await this.exportToExcel(request.data, request.options, exportId);
          break;
        case 'csv':
          filePath = await this.exportToCSV(request.data, request.options, exportId);
          break;
        default:
          throw new Error(`Unsupported export type: ${request.type}`);
      }

      const stats = await fs.stat(filePath);

      // Update export record
      await this.prisma.analyticsExport.update({
        where: { id: exportId },
        data: {
          status: ReportStatus.COMPLETED,
          fileUrl: `/api/v1/exports/${exportId}/download`,
          fileSize: stats.size
        }
      });

      return `/api/v1/exports/${exportId}/download`;

    } catch (error) {
      await this.prisma.analyticsExport.update({
        where: { id: exportId },
        data: {
          status: ReportStatus.FAILED
        }
      });

      throw error;
    }
  }

  /**
   * Delete expired reports
   */
  async cleanupExpiredReports(): Promise<number> {
    const expiredReports = await this.prisma.analyticsReport.findMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    // Delete files
    for (const report of expiredReports) {
      if (report.fileUrl) {
        try {
          const fileName = path.basename(report.fileUrl);
          const filePath = path.join(analyticsConfig.storage.path, fileName);
          await fs.unlink(filePath);
        } catch (error) {
          console.error(`Failed to delete report file: ${report.fileUrl}`, error);
        }
      }
    }

    // Delete database records
    const deleteResult = await this.prisma.analyticsReport.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return deleteResult.count;
  }

  // Private methods

  private async generateReportCharts(data: ReportData, reportType: ReportType): Promise<ChartData[]> {
    const charts: ChartData[] = [];

    try {
      // Revenue trend chart
      if (data.metrics.revenue.revenueTrends.length > 0) {
        const revenueChart = await this.chartService.generateLineChart({
          title: 'Revenue Trend',
          data: data.metrics.revenue.revenueTrends.map(trend => ({
            x: trend.date,
            y: trend.value
          })),
          xLabel: 'Date',
          yLabel: 'Revenue ($)',
          color: '#2ecc71'
        });
        charts.push(revenueChart);
      }

      // Conversion rate chart
      if (data.metrics.conversion.conversionTrends.length > 0) {
        const conversionChart = await this.chartService.generateLineChart({
          title: 'Conversion Rate Trend',
          data: data.metrics.conversion.conversionTrends.map(trend => ({
            x: trend.date,
            y: trend.value
          })),
          xLabel: 'Date',
          yLabel: 'Conversion Rate (%)',
          color: '#3498db'
        });
        charts.push(conversionChart);
      }

      // Top affiliates chart
      if (data.affiliates.length > 0) {
        const topAffiliates = data.affiliates.slice(0, 10);
        const affiliateChart = await this.chartService.generateBarChart({
          title: 'Top Affiliates by Revenue',
          data: topAffiliates.map(affiliate => ({
            label: affiliate.affiliateName,
            value: affiliate.totalCommissions
          })),
          xLabel: 'Affiliates',
          yLabel: 'Revenue ($)',
          color: '#e74c3c'
        });
        charts.push(affiliateChart);
      }

      // Traffic sources pie chart
      if (data.metrics.traffic.trafficSources.length > 0) {
        const trafficChart = await this.chartService.generatePieChart({
          title: 'Traffic Sources',
          data: data.metrics.traffic.trafficSources.map(source => ({
            label: source.source,
            value: source.value
          })),
          colors: analyticsConfig.charts.colors
        });
        charts.push(trafficChart);
      }

    } catch (error) {
      console.error('Error generating charts:', error);
    }

    return charts;
  }

  private async generateReportFile(
    data: ReportData,
    charts: ChartData[],
    format: ReportFormat,
    reportId: string
  ): Promise<string> {
    const fileName = `report_${reportId}.${format}`;
    const filePath = path.join(analyticsConfig.storage.path, fileName);

    // Ensure directory exists
    await fs.mkdir(analyticsConfig.storage.path, { recursive: true });

    switch (format) {
      case ReportFormat.PDF:
        return await this.generatePDFReport(data, charts, filePath);
      case ReportFormat.EXCEL:
        return await this.generateExcelReport(data, charts, filePath);
      case ReportFormat.CSV:
        return await this.generateCSVReport(data, filePath);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async generatePDFReport(
    data: ReportData,
    charts: ChartData[],
    filePath: string
  ): Promise<string> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Generate HTML content
      const htmlContent = this.generateReportHTML(data, charts);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      await page.pdf({
        path: filePath,
        format: analyticsConfig.pdf.format as any,
        printBackground: analyticsConfig.pdf.printBackground,
        margin: analyticsConfig.pdf.margin,
        displayHeaderFooter: analyticsConfig.pdf.displayHeaderFooter
      });

      return filePath;
    } finally {
      await browser.close();
    }
  }

  private async generateExcelReport(
    data: ReportData,
    charts: ChartData[],
    filePath: string
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    this.addSummaryToExcel(summarySheet, data.summary);
    
    // Affiliates sheet
    if (data.affiliates.length > 0) {
      const affiliatesSheet = workbook.addWorksheet('Affiliates');
      this.addAffiliatesToExcel(affiliatesSheet, data.affiliates);
    }
    
    // Offers sheet
    if (data.offers.length > 0) {
      const offersSheet = workbook.addWorksheet('Offers');
      this.addOffersToExcel(offersSheet, data.offers);
    }
    
    // Metrics sheet
    const metricsSheet = workbook.addWorksheet('Metrics');
    this.addMetricsToExcel(metricsSheet, data.metrics);

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  private async generateCSVReport(data: ReportData, filePath: string): Promise<string> {
    // Generate CSV content
    const csvContent = this.generateCSVContent(data);
    await fs.writeFile(filePath, csvContent, 'utf8');
    return filePath;
  }

  private generateReportHTML(data: ReportData, charts: ChartData[]): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .metric { display: inline-block; margin: 10px; text-align: center; }
          .metric-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
          .metric-label { font-size: 14px; color: #7f8c8d; }
          .chart { margin: 20px 0; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Analytics Report</h1>
          <p>Period: ${format(data.summary.period.start, 'yyyy-MM-dd')} to ${format(data.summary.period.end, 'yyyy-MM-dd')}</p>
        </div>
        
        <div class="summary">
          <h2>Summary</h2>
          <div class="metric">
            <div class="metric-value">$${data.summary.totalRevenue.toLocaleString()}</div>
            <div class="metric-label">Total Revenue</div>
          </div>
          <div class="metric">
            <div class="metric-value">${data.summary.totalConversions.toLocaleString()}</div>
            <div class="metric-label">Total Conversions</div>
          </div>
          <div class="metric">
            <div class="metric-value">${data.summary.totalClicks.toLocaleString()}</div>
            <div class="metric-label">Total Clicks</div>
          </div>
          <div class="metric">
            <div class="metric-value">${data.summary.averageConversionRate.toFixed(2)}%</div>
            <div class="metric-label">Conversion Rate</div>
          </div>
        </div>

        ${charts.map(chart => `
          <div class="chart">
            <h3>${chart.title}</h3>
            <img src="data:image/png;base64,${chart.data}" alt="${chart.title}" />
          </div>
        `).join('')}

        ${this.generateTablesHTML(data)}
      </body>
      </html>
    `;
  }

  private generateTablesHTML(data: ReportData): string {
    let html = '';

    // Top Affiliates Table
    if (data.affiliates.length > 0) {
      html += `
        <h2>Top Affiliates</h2>
        <table>
          <thead>
            <tr>
              <th>Affiliate</th>
              <th>Clicks</th>
              <th>Conversions</th>
              <th>Conversion Rate</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${data.affiliates.slice(0, 10).map(affiliate => `
              <tr>
                <td>${affiliate.affiliateName}</td>
                <td>${affiliate.totalClicks.toLocaleString()}</td>
                <td>${affiliate.totalConversions.toLocaleString()}</td>
                <td>${affiliate.conversionRate.toFixed(2)}%</td>
                <td>$${affiliate.totalCommissions.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // Top Offers Table
    if (data.offers.length > 0) {
      html += `
        <h2>Top Offers</h2>
        <table>
          <thead>
            <tr>
              <th>Offer</th>
              <th>Clicks</th>
              <th>Conversions</th>
              <th>Conversion Rate</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${data.offers.slice(0, 10).map(offer => `
              <tr>
                <td>${offer.offerName}</td>
                <td>${offer.clicks.toLocaleString()}</td>
                <td>${offer.conversions.toLocaleString()}</td>
                <td>${offer.conversionRate.toFixed(2)}%</td>
                <td>$${offer.revenue.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    return html;
  }

  private addSummaryToExcel(sheet: ExcelJS.Worksheet, summary: any): void {
    sheet.addRow(['Metric', 'Value']);
    sheet.addRow(['Total Revenue', `$${summary.totalRevenue.toLocaleString()}`]);
    sheet.addRow(['Total Conversions', summary.totalConversions.toLocaleString()]);
    sheet.addRow(['Total Clicks', summary.totalClicks.toLocaleString()]);
    sheet.addRow(['Average Conversion Rate', `${summary.averageConversionRate.toFixed(2)}%`]);
    sheet.addRow(['Top Affiliate', summary.topAffiliate]);
    sheet.addRow(['Top Offer', summary.topOffer]);
  }

  private addAffiliatesToExcel(sheet: ExcelJS.Worksheet, affiliates: any[]): void {
    sheet.addRow(['Affiliate', 'Clicks', 'Conversions', 'Conversion Rate', 'Revenue']);
    affiliates.forEach(affiliate => {
      sheet.addRow([
        affiliate.affiliateName,
        affiliate.totalClicks,
        affiliate.totalConversions,
        `${affiliate.conversionRate.toFixed(2)}%`,
        `$${affiliate.totalCommissions.toLocaleString()}`
      ]);
    });
  }

  private addOffersToExcel(sheet: ExcelJS.Worksheet, offers: any[]): void {
    sheet.addRow(['Offer', 'Clicks', 'Conversions', 'Conversion Rate', 'Revenue']);
    offers.forEach(offer => {
      sheet.addRow([
        offer.offerName,
        offer.clicks,
        offer.conversions,
        `${offer.conversionRate.toFixed(2)}%`,
        `$${offer.revenue.toLocaleString()}`
      ]);
    });
  }

  private addMetricsToExcel(sheet: ExcelJS.Worksheet, metrics: any): void {
    sheet.addRow(['Metric Category', 'Metric', 'Value']);
    sheet.addRow(['Conversion', 'Total Conversions', metrics.conversion.totalConversions]);
    sheet.addRow(['Conversion', 'Conversion Rate', `${metrics.conversion.conversionRate.toFixed(2)}%`]);
    sheet.addRow(['Revenue', 'Total Revenue', `$${metrics.revenue.totalRevenue.toLocaleString()}`]);
    sheet.addRow(['Revenue', 'CPA Revenue', `$${metrics.revenue.cpaRevenue.toLocaleString()}`]);
    sheet.addRow(['Revenue', 'RevShare Revenue', `$${metrics.revenue.revshareRevenue.toLocaleString()}`]);
    sheet.addRow(['Traffic', 'Total Clicks', metrics.traffic.totalClicks]);
    sheet.addRow(['Traffic', 'Unique Clicks', metrics.traffic.uniqueClicks]);
  }

  private generateCSVContent(data: ReportData): string {
    let csv = 'Type,Name,Clicks,Conversions,Conversion Rate,Revenue\n';
    
    data.affiliates.forEach(affiliate => {
      csv += `Affiliate,"${affiliate.affiliateName}",${affiliate.totalClicks},${affiliate.totalConversions},${affiliate.conversionRate.toFixed(2)}%,$${affiliate.totalCommissions}\n`;
    });
    
    data.offers.forEach(offer => {
      csv += `Offer,"${offer.offerName}",${offer.clicks},${offer.conversions},${offer.conversionRate.toFixed(2)}%,$${offer.revenue}\n`;
    });
    
    return csv;
  }

  private calculateRecordCount(data: ReportData): number {
    return data.affiliates.length + data.offers.length;
  }

  private async exportToPDF(data: any, options: ExportOptions, exportId: string): Promise<string> {
    const fileName = `export_${exportId}.pdf`;
    const filePath = path.join(analyticsConfig.storage.path, fileName);
    
    // Implementation similar to generatePDFReport
    return filePath;
  }

  private async exportToExcel(data: any, options: ExportOptions, exportId: string): Promise<string> {
    const fileName = `export_${exportId}.xlsx`;
    const filePath = path.join(analyticsConfig.storage.path, fileName);
    
    // Implementation similar to generateExcelReport
    return filePath;
  }

  private async exportToCSV(data: any, options: ExportOptions, exportId: string): Promise<string> {
    const fileName = `export_${exportId}.csv`;
    const filePath = path.join(analyticsConfig.storage.path, fileName);
    
    // Implementation similar to generateCSVReport
    return filePath;
  }
}

