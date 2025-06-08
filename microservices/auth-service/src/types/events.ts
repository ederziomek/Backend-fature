// Tipos de eventos para o sistema de eventos
export interface UserCreatedEvent {
  userId: string;
  email: string;
  name: string;
  timestamp: Date;
}

export interface UserLoginEvent {
  userId: string;
  email: string;
  name: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId: string;
}

export interface UserLogoutEvent {
  userId: string;
  email: string;
  name: string;
  timestamp: Date;
  sessionId: string;
}

export interface UserUpdatedEvent {
  userId: string;
  email: string;
  name: string;
  timestamp: Date;
  changes: Record<string, any>;
}

export interface SessionCreatedEvent {
  sessionId: string;
  userId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionExpiredEvent {
  sessionId: string;
  userId: string;
  timestamp: Date;
}

export interface SecurityAlertEvent {
  userId?: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

