import { 
  AnalyticsReport as PrismaAnalyticsReport,
  AnalyticsMetric as PrismaAnalyticsMetric,
  AnalyticsDashboard as PrismaAnalyticsDashboard,
  ReportType,
  MetricType,
  TimeRange,
  ReportStatus,
  ChartType
} from '@prisma/client';

// Extend Prisma types
export interface AnalyticsReport extends PrismaAnalyticsReport {}
export interface AnalyticsMetric extends PrismaAnalyticsMetric {}
export interface AnalyticsDashboard extends PrismaAnalyticsDashboard {}

// Analytics Data Types
export interface AffiliatePerformance {
  affiliateId: string;
  affiliateName: string;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalCommissions: number;
  cpaCommissions: number;
  revshareCommissions: number;
  averageOrderValue: number;
  topOffers: OfferPerformance[];
  period: DateRange;
}

export interface OfferPerformance {
  offerId: string;
  offerName: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  commissions: number;
  epc: number; // Earnings Per Click
  ctr: number; // Click Through Rate
}

export interface ConversionMetrics {
  totalConversions: number;
  conversionRate: number;
  averageConversionValue: number;
  conversionsByHour: HourlyMetric[];
  conversionsByDay: DailyMetric[];
  conversionsBySource: SourceMetric[];
  conversionTrends: TrendData[];
}

export interface RevenueMetrics {
  totalRevenue: number;
  cpaRevenue: number;
  revshareRevenue: number;
  revenueGrowth: number;
  revenueByAffiliate: AffiliateRevenue[];
  revenueByOffer: OfferRevenue[];
  revenueTrends: TrendData[];
  projectedRevenue: number;
}

export interface TrafficMetrics {
  totalClicks: number;
  uniqueClicks: number;
  clickGrowth: number;
  trafficSources: SourceMetric[];
  geoDistribution: GeoMetric[];
  deviceDistribution: DeviceMetric[];
  trafficTrends: TrendData[];
}

// Time-based Metrics
export interface HourlyMetric {
  hour: number;
  value: number;
  label: string;
}

export interface DailyMetric {
  date: string;
  value: number;
  label: string;
}

export interface SourceMetric {
  source: string;
  value: number;
  percentage: number;
  growth: number;
}

export interface GeoMetric {
  country: string;
  countryCode: string;
  clicks: number;
  conversions: number;
  revenue: number;
  percentage: number;
}

export interface DeviceMetric {
  device: string;
  clicks: number;
  conversions: number;
  percentage: number;
}

export interface TrendData {
  date: string;
  value: number;
  change: number;
  changePercentage: number;
}

// Revenue Breakdown
export interface AffiliateRevenue {
  affiliateId: string;
  affiliateName: string;
  revenue: number;
  percentage: number;
  growth: number;
}

export interface OfferRevenue {
  offerId: string;
  offerName: string;
  revenue: number;
  percentage: number;
  growth: number;
}

// Dashboard Types
export interface DashboardWidget {
  id: string;
  type: ChartType;
  title: string;
  data: any;
  config: WidgetConfig;
  position: WidgetPosition;
}

export interface WidgetConfig {
  showLegend: boolean;
  showGrid: boolean;
  colors: string[];
  animation: boolean;
  responsive: boolean;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Report Generation
export interface ReportRequest {
  type: ReportType;
  timeRange: TimeRange;
  startDate: Date;
  endDate: Date;
  affiliateIds?: string[];
  offerIds?: string[];
  filters: ReportFilters;
  format: ReportFormat;
  includeCharts: boolean;
  includeRawData: boolean;
}

export interface ReportFilters {
  minRevenue?: number;
  maxRevenue?: number;
  minConversions?: number;
  countries?: string[];
  devices?: string[];
  sources?: string[];
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  status: ReportStatus;
  data: ReportData;
  charts: ChartData[];
  metadata: ReportMetadata;
  downloadUrl?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface ReportData {
  summary: ReportSummary;
  affiliates: AffiliatePerformance[];
  offers: OfferPerformance[];
  metrics: {
    conversion: ConversionMetrics;
    revenue: RevenueMetrics;
    traffic: TrafficMetrics;
  };
  trends: TrendAnalysis;
}

export interface ReportSummary {
  totalRevenue: number;
  totalConversions: number;
  totalClicks: number;
  averageConversionRate: number;
  topAffiliate: string;
  topOffer: string;
  period: DateRange;
}

export interface ChartData {
  type: ChartType;
  title: string;
  data: any;
  config: ChartConfig;
}

export interface ChartConfig {
  width: number;
  height: number;
  backgroundColor: string;
  fontFamily: string;
  fontSize: number;
}

export interface ReportMetadata {
  generatedBy: string;
  generatedAt: Date;
  parameters: ReportRequest;
  recordCount: number;
  processingTime: number;
}

// Trend Analysis
export interface TrendAnalysis {
  revenue: TrendInsight;
  conversions: TrendInsight;
  traffic: TrendInsight;
  seasonality: SeasonalityData;
  forecasting: ForecastData;
}

export interface TrendInsight {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  significance: 'high' | 'medium' | 'low';
  description: string;
}

export interface SeasonalityData {
  pattern: 'weekly' | 'monthly' | 'yearly' | 'none';
  strength: number;
  peaks: string[];
  valleys: string[];
}

export interface ForecastData {
  nextPeriod: number;
  confidence: number;
  range: {
    min: number;
    max: number;
  };
  factors: string[];
}

// Utility Types
export interface DateRange {
  start: Date;
  end: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API Request/Response Types
export interface AnalyticsQuery {
  timeRange: TimeRange;
  startDate?: string;
  endDate?: string;
  affiliateIds?: string[];
  offerIds?: string[];
  groupBy?: string[];
  metrics?: MetricType[];
}

export interface DashboardRequest {
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  isPublic: boolean;
  tags: string[];
}

export interface ExportRequest {
  type: 'pdf' | 'excel' | 'csv';
  data: any;
  template?: string;
  options: ExportOptions;
}

export interface ExportOptions {
  includeCharts: boolean;
  includeRawData: boolean;
  compression: boolean;
  password?: string;
}

// Real-time Analytics
export interface RealTimeMetrics {
  activeUsers: number;
  clicksPerMinute: number;
  conversionsPerHour: number;
  revenueToday: number;
  topPerformingOffer: string;
  alerts: AnalyticsAlert[];
  lastUpdated: Date;
}

export interface AnalyticsAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  createdAt: Date;
}

// Configuration Types
export interface AnalyticsConfig {
  retentionDays: number;
  aggregationInterval: number;
  cacheTimeout: number;
  alertThresholds: AlertThresholds;
  reportLimits: ReportLimits;
}

export interface AlertThresholds {
  conversionRateDrop: number;
  revenueDrop: number;
  trafficDrop: number;
  errorRate: number;
}

export interface ReportLimits {
  maxRecords: number;
  maxFileSize: number;
  maxRetentionDays: number;
  concurrentReports: number;
}

// Re-export Prisma enums
export { 
  ReportType, 
  MetricType, 
  TimeRange, 
  ReportStatus, 
  ChartType 
};

// Additional enums
export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json'
}

export enum AggregationLevel {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year'
}

