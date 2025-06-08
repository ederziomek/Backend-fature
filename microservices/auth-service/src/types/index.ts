import { FastifyRequest } from 'fastify';

// Tipos de resposta da API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
  details?: any[];
}

// Tipos de usuário
export interface UserData {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  document?: string | null;
  status: string;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos de autenticação
export interface LoginRequest {
  email: string;
  password: string;
  deviceFingerprint?: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  document?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  user: UserData;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// Tipos de sessão
export interface SessionData {
  userId: string;
  sessionId: string;
  deviceFingerprint?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  location?: any;
  createdAt: Date;
  expiresAt: Date;
}

// Tipos de JWT
export interface JwtPayload {
  userId: string;
  sessionId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshJwtPayload {
  userId: string;
  sessionId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

// Extensão do FastifyRequest para incluir dados do usuário
declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: UserData;
    sessionData?: SessionData;
  }
}

// Tipos de eventos para mensageria
export interface UserEvent {
  userId: string;
  email: string;
  name: string;
  timestamp: Date;
  metadata?: any;
}

export interface UserCreatedEvent extends UserEvent {
  subject: 'user.created';
}

export interface UserUpdatedEvent extends UserEvent {
  subject: 'user.updated';
  changes: string[];
}

export interface UserDeletedEvent extends UserEvent {
  subject: 'user.deleted';
}

export interface UserLoginEvent extends UserEvent {
  subject: 'user.login';
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

export interface UserLogoutEvent extends UserEvent {
  subject: 'user.logout';
  sessionId: string;
}

// Tipos de auditoria
export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
}


// Tipos de eventos específicos
export interface UserCreatedEvent {
  userId: string;
  email: string;
  name: string;
  timestamp: Date;
  metadata?: any;
}

export interface UserLoginEvent {
  userId: string;
  email: string;
  name: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

export interface UserLogoutEvent {
  userId: string;
  sessionId: string;
  timestamp: Date;
  ipAddress?: string;
}

export interface UserUpdatedEvent {
  userId: string;
  email: string;
  name: string;
  timestamp: Date;
  changes: string[];
  metadata?: any;
}

export interface SessionCreatedEvent {
  sessionId: string;
  userId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

export interface SessionExpiredEvent {
  sessionId: string;
  userId: string;
  timestamp: Date;
  reason: 'timeout' | 'logout' | 'revoked';
}

export interface SecurityAlertEvent {
  userId: string;
  alertType: 'suspicious_login' | 'multiple_failed_attempts' | 'unusual_activity';
  timestamp: Date;
  details: any;
  ipAddress?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Tipos de auditoria
export type AuditLogSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

