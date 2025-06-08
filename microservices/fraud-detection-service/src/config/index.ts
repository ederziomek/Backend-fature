// ===============================================
// CONFIGURAÇÃO - FRAUD DETECTION SERVICE
// ===============================================

import dotenv from 'dotenv';

dotenv.config();

export const fraudConfig = {
  server: {
    port: parseInt(process.env.FRAUD_SERVICE_PORT || '3007'),
    host: process.env.FRAUD_SERVICE_HOST || '0.0.0.0',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production'
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:senha123@localhost:5432/fature_db'
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'fraud:',
    ttl: {
      behaviorProfile: 3600, // 1 hora
      riskAssessment: 1800,   // 30 minutos
      patternCache: 600       // 10 minutos
    }
  },
  
  messaging: {
    rabbitmq: {
      url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      exchanges: {
        fraud: 'fraud.events',
        notifications: 'notifications.events'
      },
      queues: {
        fraudAlerts: 'fraud.alerts',
        investigations: 'fraud.investigations',
        actions: 'fraud.actions'
      }
    }
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'fraud-detection-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  detection: {
    // Configurações de detecção de padrões
    patterns: {
      multipleAccounts: {
        enabled: true,
        maxAccountsPerIp: 3,
        timeWindowHours: 24,
        riskScore: 75
      },
      rapidIndications: {
        enabled: true,
        maxIndicationsPerHour: 10,
        maxIndicationsPerDay: 50,
        riskScore: 60
      },
      suspiciousBetting: {
        enabled: true,
        minBetAmount: 1,
        maxBetAmount: 10000,
        suspiciousPatternThreshold: 0.8,
        riskScore: 80
      },
      networkGrowthAnomaly: {
        enabled: true,
        maxGrowthRatePerDay: 0.5, // 50% growth per day
        exponentialGrowthThreshold: 2.0,
        riskScore: 70
      }
    },
    
    // Configurações de alertas
    alerting: {
      enabled: true,
      autoCreateInvestigation: true,
      severityThresholds: {
        low: 30,
        medium: 50,
        high: 70,
        critical: 85
      },
      notificationChannels: ['email', 'webhook', 'dashboard']
    },
    
    // Configurações de ações automáticas
    autoActions: {
      enabled: true,
      blockAccountThreshold: 90,
      suspendCommissionsThreshold: 80,
      requireVerificationThreshold: 70
    },
    
    // Configurações de análise comportamental
    behaviorAnalysis: {
      enabled: true,
      profileUpdateInterval: 3600, // 1 hora em segundos
      anomalyDetectionSensitivity: 0.7,
      minimumDataPoints: 10
    }
  },
  
  investigation: {
    autoAssignment: true,
    defaultPriority: 'medium',
    escalationThresholds: {
      timeToAssign: 3600,    // 1 hora
      timeToComplete: 86400  // 24 horas
    },
    retentionDays: 365
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV === 'development',
    file: {
      enabled: true,
      path: './logs/fraud-detection.log',
      maxSize: '10MB',
      maxFiles: 5
    }
  },
  
  monitoring: {
    enabled: true,
    metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
    healthCheckInterval: 30000 // 30 segundos
  }
};

export const validateConfig = (): void => {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

