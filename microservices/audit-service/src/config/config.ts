import { config } from 'dotenv';

config();

export const auditConfig = {
  port: parseInt(process.env.AUDIT_PORT || '3007'),
  host: process.env.AUDIT_HOST || '0.0.0.0',
  
  // Configurações de Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.AUDIT_CACHE_TTL || '3600'), // 1 hora
  },
  
  // Configurações de retenção de logs
  retention: {
    auditLogsDays: parseInt(process.env.AUDIT_LOGS_RETENTION_DAYS || '365'), // 1 ano
    securityEventsDays: parseInt(process.env.SECURITY_EVENTS_RETENTION_DAYS || '90'), // 3 meses
    systemMetricsDays: parseInt(process.env.SYSTEM_METRICS_RETENTION_DAYS || '30'), // 1 mês
  },
  
  // Configurações de alertas
  alerts: {
    criticalEventsThreshold: parseInt(process.env.CRITICAL_EVENTS_THRESHOLD || '10'),
    securityEventsThreshold: parseInt(process.env.SECURITY_EVENTS_THRESHOLD || '5'),
    enableEmailAlerts: process.env.ENABLE_EMAIL_ALERTS === 'true',
    enableSlackAlerts: process.env.ENABLE_SLACK_ALERTS === 'true',
  },
  
  // Configurações de rate limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '200'),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  },
  
  // Configurações de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
  },
  
  // Configurações de backup
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    interval: process.env.BACKUP_INTERVAL || '24h',
    location: process.env.BACKUP_LOCATION || './backups',
  },
};

