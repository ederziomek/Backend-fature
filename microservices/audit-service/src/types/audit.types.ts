// Tipos para sistema de auditoria
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'auth' | 'financial' | 'admin' | 'user' | 'system';
  metadata?: Record<string, any>;
}

export interface FinancialAuditLog extends AuditLog {
  category: 'financial';
  transactionId?: string;
  amount?: number;
  currency?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  commissionType?: 'CPA' | 'RevShare' | 'Bonus';
}

export interface SystemMetrics {
  timestamp: Date;
  service: string;
  endpoint: string;
  responseTime: number;
  statusCode: number;
  errorCount: number;
  requestCount: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface AuditQuery {
  userId?: string;
  action?: string;
  resource?: string;
  category?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface AuditReport {
  period: {
    start: Date;
    end: Date;
  };
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topUsers: Array<{
    userId: string;
    eventCount: number;
  }>;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  securityEvents: number;
  financialEvents: number;
  systemEvents: number;
}

