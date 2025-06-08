import { createClient, RedisClientType } from 'redis';
import { auditConfig } from '../config/config';
import {
  AuditLog,
  FinancialAuditLog,
  SystemMetrics,
  SecurityEvent,
  AuditQuery,
  AuditReport
} from '../types/audit.types';

export class AuditService {
  private redisClient: RedisClientType;
  private auditLogs: AuditLog[] = []; // Em produção, usar banco de dados
  private securityEvents: SecurityEvent[] = [];
  private systemMetrics: SystemMetrics[] = [];

  constructor() {
    this.redisClient = createClient({
      url: auditConfig.redis.url,
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.redisClient.connect();
      console.log('✅ Audit Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Audit Service:', error);
      throw error;
    }
  }

  // Registrar evento de auditoria
  async logEvent(auditLog: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> {
    try {
      const log: AuditLog = {
        ...auditLog,
        id: this.generateId(),
        timestamp: new Date(),
      };

      // Armazenar no array (em produção, usar banco de dados)
      this.auditLogs.push(log);

      // Cachear eventos críticos no Redis
      if (log.severity === 'critical' || log.severity === 'high') {
        const cacheKey = `audit:critical:${log.id}`;
        await this.redisClient.setEx(
          cacheKey,
          auditConfig.redis.ttl,
          JSON.stringify(log)
        );
      }

      // Log estruturado
      console.log(`📋 Audit Log: ${log.action} on ${log.resource} by ${log.userId}`, {
        id: log.id,
        severity: log.severity,
        category: log.category,
      });

      return log.id;
    } catch (error) {
      console.error('❌ Error logging audit event:', error);
      throw new Error('Failed to log audit event');
    }
  }

  // Registrar evento financeiro
  async logFinancialEvent(
    financialLog: Omit<FinancialAuditLog, 'id' | 'timestamp' | 'category'>
  ): Promise<string> {
    try {
      const log: FinancialAuditLog = {
        ...financialLog,
        id: this.generateId(),
        timestamp: new Date(),
        category: 'financial',
        severity: this.calculateFinancialSeverity(financialLog.amount || 0),
      };

      this.auditLogs.push(log);

      // Sempre cachear eventos financeiros
      const cacheKey = `audit:financial:${log.id}`;
      await this.redisClient.setEx(
        cacheKey,
        auditConfig.redis.ttl,
        JSON.stringify(log)
      );

      console.log(`💰 Financial Audit: ${log.action} - ${log.amount} ${log.currency}`, {
        id: log.id,
        transactionId: log.transactionId,
        commissionType: log.commissionType,
      });

      return log.id;
    } catch (error) {
      console.error('❌ Error logging financial event:', error);
      throw new Error('Failed to log financial event');
    }
  }

  // Registrar evento de segurança
  async logSecurityEvent(
    securityEvent: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>
  ): Promise<string> {
    try {
      const event: SecurityEvent = {
        ...securityEvent,
        id: this.generateId(),
        timestamp: new Date(),
        resolved: false,
      };

      this.securityEvents.push(event);

      // Sempre cachear eventos de segurança
      const cacheKey = `security:${event.id}`;
      await this.redisClient.setEx(
        cacheKey,
        auditConfig.redis.ttl,
        JSON.stringify(event)
      );

      console.log(`🔒 Security Event: ${event.type} - ${event.severity}`, {
        id: event.id,
        userId: event.userId,
        ipAddress: event.ipAddress,
      });

      return event.id;
    } catch (error) {
      console.error('❌ Error logging security event:', error);
      throw new Error('Failed to log security event');
    }
  }

  // Registrar métricas do sistema
  async logSystemMetrics(metrics: Omit<SystemMetrics, 'timestamp'>): Promise<void> {
    try {
      const systemMetrics: SystemMetrics = {
        ...metrics,
        timestamp: new Date(),
      };

      this.systemMetrics.push(systemMetrics);

      // Manter apenas as últimas 1000 métricas em memória
      if (this.systemMetrics.length > 1000) {
        this.systemMetrics = this.systemMetrics.slice(-1000);
      }

      // Cachear métricas recentes
      const cacheKey = `metrics:${metrics.service}:${Date.now()}`;
      await this.redisClient.setEx(
        cacheKey,
        300, // 5 minutos
        JSON.stringify(systemMetrics)
      );

    } catch (error) {
      console.error('❌ Error logging system metrics:', error);
    }
  }

  // Buscar logs de auditoria
  async searchAuditLogs(query: AuditQuery): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      let filteredLogs = [...this.auditLogs];

      // Aplicar filtros
      if (query.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
      }

      if (query.action) {
        filteredLogs = filteredLogs.filter(log => 
          log.action.toLowerCase().includes(query.action!.toLowerCase())
        );
      }

      if (query.resource) {
        filteredLogs = filteredLogs.filter(log => 
          log.resource.toLowerCase().includes(query.resource!.toLowerCase())
        );
      }

      if (query.category) {
        filteredLogs = filteredLogs.filter(log => log.category === query.category);
      }

      if (query.severity) {
        filteredLogs = filteredLogs.filter(log => log.severity === query.severity);
      }

      if (query.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startDate!);
      }

      if (query.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endDate!);
      }

      // Ordenar por timestamp (mais recente primeiro)
      filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Paginação
      const page = query.page || 1;
      const limit = query.limit || 50;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

      return {
        logs: paginatedLogs,
        total: filteredLogs.length,
        page,
        limit,
      };
    } catch (error) {
      console.error('❌ Error searching audit logs:', error);
      throw new Error('Failed to search audit logs');
    }
  }

  // Buscar eventos de segurança
  async getSecurityEvents(resolved?: boolean): Promise<SecurityEvent[]> {
    try {
      let events = [...this.securityEvents];

      if (resolved !== undefined) {
        events = events.filter(event => event.resolved === resolved);
      }

      // Ordenar por timestamp (mais recente primeiro)
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return events;
    } catch (error) {
      console.error('❌ Error getting security events:', error);
      throw new Error('Failed to get security events');
    }
  }

  // Resolver evento de segurança
  async resolveSecurityEvent(
    eventId: string, 
    resolvedBy: string
  ): Promise<SecurityEvent | null> {
    try {
      const eventIndex = this.securityEvents.findIndex(event => event.id === eventId);
      
      if (eventIndex === -1) {
        return null;
      }

      this.securityEvents[eventIndex].resolved = true;
      this.securityEvents[eventIndex].resolvedBy = resolvedBy;
      this.securityEvents[eventIndex].resolvedAt = new Date();

      // Atualizar cache
      const cacheKey = `security:${eventId}`;
      await this.redisClient.setEx(
        cacheKey,
        auditConfig.redis.ttl,
        JSON.stringify(this.securityEvents[eventIndex])
      );

      return this.securityEvents[eventIndex];
    } catch (error) {
      console.error('❌ Error resolving security event:', error);
      throw new Error('Failed to resolve security event');
    }
  }

  // Gerar relatório de auditoria
  async generateAuditReport(startDate: Date, endDate: Date): Promise<AuditReport> {
    try {
      const filteredLogs = this.auditLogs.filter(
        log => log.timestamp >= startDate && log.timestamp <= endDate
      );

      const eventsByCategory: Record<string, number> = {};
      const eventsBySeverity: Record<string, number> = {};
      const userEventCount: Record<string, number> = {};
      const actionCount: Record<string, number> = {};

      filteredLogs.forEach(log => {
        // Contar por categoria
        eventsByCategory[log.category] = (eventsByCategory[log.category] || 0) + 1;

        // Contar por severidade
        eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1;

        // Contar por usuário
        userEventCount[log.userId] = (userEventCount[log.userId] || 0) + 1;

        // Contar por ação
        actionCount[log.action] = (actionCount[log.action] || 0) + 1;
      });

      // Top usuários
      const topUsers = Object.entries(userEventCount)
        .map(([userId, eventCount]) => ({ userId, eventCount }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      // Top ações
      const topActions = Object.entries(actionCount)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const report: AuditReport = {
        period: { start: startDate, end: endDate },
        totalEvents: filteredLogs.length,
        eventsByCategory,
        eventsBySeverity,
        topUsers,
        topActions,
        securityEvents: this.securityEvents.filter(
          event => event.timestamp >= startDate && event.timestamp <= endDate
        ).length,
        financialEvents: filteredLogs.filter(log => log.category === 'financial').length,
        systemEvents: this.systemMetrics.filter(
          metric => metric.timestamp >= startDate && metric.timestamp <= endDate
        ).length,
      };

      return report;
    } catch (error) {
      console.error('❌ Error generating audit report:', error);
      throw new Error('Failed to generate audit report');
    }
  }

  // Obter métricas do sistema
  async getSystemMetrics(service?: string): Promise<SystemMetrics[]> {
    try {
      let metrics = [...this.systemMetrics];

      if (service) {
        metrics = metrics.filter(metric => metric.service === service);
      }

      // Ordenar por timestamp (mais recente primeiro)
      metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return metrics.slice(0, 100); // Últimas 100 métricas
    } catch (error) {
      console.error('❌ Error getting system metrics:', error);
      throw new Error('Failed to get system metrics');
    }
  }

  // Métodos auxiliares
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateFinancialSeverity(amount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (amount >= 10000) return 'critical';
    if (amount >= 1000) return 'high';
    if (amount >= 100) return 'medium';
    return 'low';
  }

  async close(): Promise<void> {
    try {
      await this.redisClient.quit();
      console.log('✅ Audit Service connections closed');
    } catch (error) {
      console.error('❌ Error closing Audit Service connections:', error);
    }
  }
}

