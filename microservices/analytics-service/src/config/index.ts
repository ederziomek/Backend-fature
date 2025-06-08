import { config } from 'dotenv';

// Load environment variables
config();

export const analyticsConfig = {
  // Server Configuration
  port: parseInt(process.env.ANALYTICS_PORT || '3005', 10),
  host: process.env.ANALYTICS_HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:senha123@localhost:5432/fature_analytics',
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    db: parseInt(process.env.REDIS_ANALYTICS_DB || '4', 10),
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // External Services
  services: {
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    affiliateService: process.env.AFFILIATE_SERVICE_URL || 'http://localhost:3002',
    dataService: process.env.DATA_SERVICE_URL || 'http://localhost:3004',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003',
  },

  // Analytics Configuration
  analytics: {
    // Data Retention
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '365', 10),
    
    // Aggregation Settings
    aggregationInterval: parseInt(process.env.AGGREGATION_INTERVAL || '3600000', 10), // 1 hour
    realTimeInterval: parseInt(process.env.REALTIME_INTERVAL || '60000', 10), // 1 minute
    
    // Cache Settings
    cacheTimeout: parseInt(process.env.CACHE_TIMEOUT || '300000', 10), // 5 minutes
    reportCacheTimeout: parseInt(process.env.REPORT_CACHE_TIMEOUT || '1800000', 10), // 30 minutes
    
    // Processing Limits
    maxRecordsPerQuery: parseInt(process.env.MAX_RECORDS_PER_QUERY || '10000', 10),
    maxReportSize: parseInt(process.env.MAX_REPORT_SIZE || '50000000', 10), // 50MB
    maxConcurrentReports: parseInt(process.env.MAX_CONCURRENT_REPORTS || '5', 10),
    
    // Export Settings
    exportRetentionDays: parseInt(process.env.EXPORT_RETENTION_DAYS || '7', 10),
    maxExportSize: parseInt(process.env.MAX_EXPORT_SIZE || '100000000', 10), // 100MB
  },

  // Chart Configuration
  charts: {
    defaultWidth: parseInt(process.env.CHART_DEFAULT_WIDTH || '800', 10),
    defaultHeight: parseInt(process.env.CHART_DEFAULT_HEIGHT || '400', 10),
    backgroundColor: process.env.CHART_BACKGROUND_COLOR || '#ffffff',
    fontFamily: process.env.CHART_FONT_FAMILY || 'Arial, sans-serif',
    fontSize: parseInt(process.env.CHART_FONT_SIZE || '12', 10),
    colors: (process.env.CHART_COLORS || '#3498db,#e74c3c,#2ecc71,#f39c12,#9b59b6,#1abc9c,#34495e,#e67e22').split(','),
  },

  // Alert Configuration
  alerts: {
    enabled: process.env.ALERTS_ENABLED === 'true',
    checkInterval: parseInt(process.env.ALERT_CHECK_INTERVAL || '300000', 10), // 5 minutes
    
    // Default Thresholds
    thresholds: {
      conversionRateDrop: parseFloat(process.env.ALERT_CONVERSION_RATE_DROP || '0.2'), // 20%
      revenueDrop: parseFloat(process.env.ALERT_REVENUE_DROP || '0.3'), // 30%
      trafficDrop: parseFloat(process.env.ALERT_TRAFFIC_DROP || '0.5'), // 50%
      errorRate: parseFloat(process.env.ALERT_ERROR_RATE || '0.05'), // 5%
    },
    
    // Notification Settings
    emailEnabled: process.env.ALERT_EMAIL_ENABLED === 'true',
    slackEnabled: process.env.ALERT_SLACK_ENABLED === 'true',
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
  },

  // Rate Limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV === 'development',
  },

  // File Storage
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // local, s3, gcs
    path: process.env.STORAGE_PATH || './uploads',
    
    // S3 Configuration (if using S3)
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  },

  // PDF Generation
  pdf: {
    format: process.env.PDF_FORMAT || 'A4',
    orientation: process.env.PDF_ORIENTATION || 'portrait',
    margin: {
      top: process.env.PDF_MARGIN_TOP || '20mm',
      right: process.env.PDF_MARGIN_RIGHT || '20mm',
      bottom: process.env.PDF_MARGIN_BOTTOM || '20mm',
      left: process.env.PDF_MARGIN_LEFT || '20mm',
    },
    displayHeaderFooter: process.env.PDF_HEADER_FOOTER === 'true',
    printBackground: process.env.PDF_PRINT_BACKGROUND === 'true',
  },

  // Excel Configuration
  excel: {
    defaultSheetName: process.env.EXCEL_SHEET_NAME || 'Analytics Report',
    includeCharts: process.env.EXCEL_INCLUDE_CHARTS === 'true',
    compression: process.env.EXCEL_COMPRESSION === 'true',
  },

  // Security
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
    rateLimitByIP: process.env.RATE_LIMIT_BY_IP === 'true',
    requireAuth: process.env.REQUIRE_AUTH === 'true',
  },

  // Performance Monitoring
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    metricsInterval: parseInt(process.env.METRICS_INTERVAL || '60000', 10), // 1 minute
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10), // 30 seconds
  },

  // Feature Flags
  features: {
    realTimeAnalytics: process.env.FEATURE_REALTIME === 'true',
    advancedCharts: process.env.FEATURE_ADVANCED_CHARTS === 'true',
    machineLearning: process.env.FEATURE_ML === 'true',
    customReports: process.env.FEATURE_CUSTOM_REPORTS === 'true',
    dataExport: process.env.FEATURE_DATA_EXPORT === 'true',
    alerting: process.env.FEATURE_ALERTING === 'true',
  },
};

export default analyticsConfig;

