import { FastifyRequest } from 'fastify';

// Estender o tipo FastifyRequest para incluir propriedades customizadas
declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: {
      id: string;
      email: string;
      role: string;
      permissions: string[];
    };
    affiliate?: {
      id: string;
      userId: string;
      referralCode: string;
      category: string;
      level: number;
      status: string;
    };
  }
}

// Tipos de resposta padrão da API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tipos de erro
export interface ApiError {
  code: string;
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}

// Tipos de autenticação
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string; // user ID
  tokenId: string;
  iat?: number;
  exp?: number;
}

// Tipos de validação
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Tipos de paginação
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Tipos de filtros
export interface FilterParams {
  search?: string;
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Tipos de webhook
export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  signature?: string;
}

// Tipos de notificação
export interface NotificationPayload {
  type: 'email' | 'sms' | 'push';
  recipient: string;
  subject?: string;
  message: string;
  template?: string;
  data?: Record<string, any>;
}

// Tipos de auditoria
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

