import { prisma } from '@/config/database';
import { AuditLogData, AuditLogSeverity } from '@/types';

export class AuditService {
  /**
   * Registra um log de auditoria
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          details: data.details || {},
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          severity: data.severity || 'info',
          timestamp: new Date()
        }
      });
    } catch (error) {
      // Log de erro interno - não deve falhar a operação principal
      console.error('Erro ao registrar log de auditoria:', error);
    }
  }

  /**
   * Busca logs de auditoria com filtros
   */
  static async getLogs(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    severity?: AuditLogSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.resource) where.resource = filters.resource;
    if (filters.severity) where.severity = filters.severity;
    
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      total,
      hasMore: (filters.offset || 0) + logs.length < total
    };
  }

  /**
   * Registra tentativa de login falhada
   */
  static async logFailedLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'user.login.failed',
      resource: 'user',
      resourceId: userId,
      details: { reason: 'invalid_credentials' },
      ipAddress,
      userAgent,
      severity: 'warning'
    });
  }

  /**
   * Registra bloqueio de conta
   */
  static async logAccountLocked(userId: string, lockedUntil: Date, ipAddress?: string): Promise<void> {
    await this.log({
      userId,
      action: 'user.account.locked',
      resource: 'user',
      resourceId: userId,
      details: { 
        lockedUntil: lockedUntil.toISOString(),
        reason: 'too_many_failed_attempts'
      },
      ipAddress,
      severity: 'warning'
    });
  }

  /**
   * Registra logout de usuário
   */
  static async logLogout(userId: string, sessionId: string, ipAddress?: string): Promise<void> {
    await this.log({
      userId,
      action: 'user.logout',
      resource: 'session',
      resourceId: sessionId,
      details: { sessionId },
      ipAddress,
      severity: 'info'
    });
  }

  /**
   * Registra mudança de senha
   */
  static async logPasswordChange(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'user.password.changed',
      resource: 'user',
      resourceId: userId,
      details: {},
      ipAddress,
      userAgent,
      severity: 'info'
    });
  }

  /**
   * Registra atividade suspeita
   */
  static async logSuspiciousActivity(
    userId: string, 
    activityType: string, 
    details: any, 
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `security.suspicious.${activityType}`,
      resource: 'security',
      resourceId: userId,
      details,
      ipAddress,
      severity: 'critical'
    });
  }
}

