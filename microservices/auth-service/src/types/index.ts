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
  phone?: string;
  document?: string;
  status: string;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  lastLoginAt?: Date;
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
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
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

