// ===============================================
// TIPOS PRINCIPAIS - ADMIN SERVICE
// ===============================================

// Tipos de usuário administrativo
export type AdminRole = 
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'analyst'
  | 'support';

export type AdminStatus = 
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'pending_activation';

export type AdminPermission = 
  | 'users.read'
  | 'users.write'
  | 'users.delete'
  | 'affiliates.read'
  | 'affiliates.write'
  | 'affiliates.delete'
  | 'commissions.read'
  | 'commissions.write'
  | 'commissions.approve'
  | 'reports.read'
  | 'reports.generate'
  | 'system.read'
  | 'system.write'
  | 'system.backup'
  | 'logs.read'
  | 'analytics.read'
  | 'notifications.send'
  | 'settings.read'
  | 'settings.write';

// Interfaces principais
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: AdminStatus;
  permissions: AdminPermission[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAdminRequest {
  email: string;
  name: string;
  password: string;
  role: AdminRole;
  permissions?: AdminPermission[];
}

export interface UpdateAdminRequest {
  name?: string;
  role?: AdminRole;
  status?: AdminStatus;
  permissions?: AdminPermission[];
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  admin: AdminUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// Dashboard e métricas
export interface DashboardMetrics {
  overview: {
    totalUsers: number;
    totalAffiliates: number;
    totalCommissions: number;
    totalRevenue: number;
    activeUsers: number;
    pendingApprovals: number;
  };
  growth: {
    usersGrowth: number;
    affiliatesGrowth: number;
    revenueGrowth: number;
    commissionsGrowth: number;
  };
  charts: {
    userRegistrations: ChartData[];
    affiliatePerformance: ChartData[];
    revenueByMonth: ChartData[];
    commissionsByType: ChartData[];
  };
  alerts: SystemAlert[];
}

export interface ChartData {
  label: string;
  value: number;
  date?: Date;
  category?: string;
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
  actionUrl?: string;
}

// Gestão de usuários
export interface UserManagement {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  isAffiliate: boolean;
  affiliateCode?: string;
  totalCommissions: number;
  lastActivityAt?: Date;
  createdAt: Date;
}

export interface UserFilters {
  status?: string;
  isAffiliate?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// Gestão de afiliados
export interface AffiliateManagement {
  id: string;
  userId: string;
  affiliateCode: string;
  category: string;
  categoryLevel: number;
  status: string;
  directIndications: number;
  totalIndications: number;
  totalCommissions: number;
  availableBalance: number;
  lockedBalance: number;
  lastActivityAt?: Date;
  createdAt: Date;
  user: {
    name: string;
    email: string;
  };
}

export interface AffiliateFilters {
  category?: string;
  status?: string;
  minCommissions?: number;
  maxCommissions?: number;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// Gestão de comissões
export interface CommissionManagement {
  id: string;
  affiliateId: string;
  sourceAffiliateId: string;
  customerId?: string;
  type: 'cpa' | 'revshare';
  level: number;
  baseAmount: number;
  percentage: number;
  commissionAmount: number;
  finalAmount: number;
  status: 'calculated' | 'approved' | 'paid' | 'cancelled' | 'disputed';
  createdAt: Date;
  affiliate: {
    affiliateCode: string;
    user: {
      name: string;
      email: string;
    };
  };
}

export interface CommissionFilters {
  type?: 'cpa' | 'revshare';
  status?: string;
  affiliateId?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface CommissionApproval {
  commissionIds: string[];
  action: 'approve' | 'reject';
  reason?: string;
  adminId: string;
}

// Sistema de configurações
export interface SystemConfig {
  id: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: 'general' | 'commission' | 'notification' | 'security' | 'integration';
  description: string;
  isPublic: boolean;
  updatedBy: string;
  updatedAt: Date;
}

export interface UpdateConfigRequest {
  key: string;
  value: any;
  adminId: string;
}

// Logs e auditoria
export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  adminId?: string;
  userId?: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'error';
  createdAt: Date;
  admin?: {
    name: string;
    email: string;
  };
  user?: {
    name: string;
    email: string;
  };
}

export interface LogFilters {
  action?: string;
  resource?: string;
  adminId?: string;
  userId?: string;
  severity?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// Relatórios administrativos
export interface AdminReport {
  id: string;
  type: 'users' | 'affiliates' | 'commissions' | 'revenue' | 'system';
  title: string;
  description: string;
  format: 'pdf' | 'excel' | 'csv';
  parameters: any;
  filePath?: string;
  fileSize?: number;
  status: 'generating' | 'completed' | 'failed';
  generatedBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface GenerateReportRequest {
  type: string;
  title: string;
  description?: string;
  format: 'pdf' | 'excel' | 'csv';
  parameters: any;
  adminId: string;
}

// Notificações administrativas
export interface AdminNotification {
  id: string;
  type: 'system' | 'user' | 'affiliate' | 'commission' | 'security';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  actionUrl?: string;
  metadata?: any;
  createdAt: Date;
  readAt?: Date;
}

export interface CreateNotificationRequest {
  type: string;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
  metadata?: any;
  adminIds?: string[];
}

// Backup e manutenção
export interface BackupInfo {
  id: string;
  type: 'manual' | 'automatic';
  status: 'running' | 'completed' | 'failed';
  filePath?: string;
  fileSize?: number;
  createdBy?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface SystemMaintenance {
  id: string;
  type: 'backup' | 'cleanup' | 'migration' | 'update';
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  details?: any;
  error?: string;
}

// Monitoramento do sistema
export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  services: ServiceHealth[];
  metrics: SystemMetrics;
  lastCheck: Date;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    incoming: number;
    outgoing: number;
  };
  database: {
    connections: number;
    queries: number;
    responseTime: number;
  };
  redis: {
    memory: number;
    keys: number;
    hits: number;
    misses: number;
  };
}

// Respostas da API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Filtros e ordenação
export interface BaseFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface DateRangeFilter {
  dateFrom?: Date;
  dateTo?: Date;
}

