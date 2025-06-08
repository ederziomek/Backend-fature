// Tipos para sistema de notificações WebSocket
export interface WebSocketMessage {
  id: string;
  type: 'notification' | 'alert' | 'update' | 'system';
  channel: string;
  userId?: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface NotificationPayload {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
}

export interface CommissionNotification extends NotificationPayload {
  type: 'success';
  commissionType: 'CPA' | 'RevShare' | 'Bonus';
  amount: number;
  currency: string;
  transactionId: string;
}

export interface FraudAlert extends NotificationPayload {
  type: 'error';
  alertType: 'multiple_accounts' | 'rapid_referrals' | 'suspicious_betting' | 'network_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affiliateId: string;
  details: Record<string, any>;
}

export interface RankingUpdate extends NotificationPayload {
  type: 'info';
  rankingId: string;
  newPosition: number;
  previousPosition?: number;
  competitionName: string;
  pointsEarned?: number;
}

export interface SystemAlert extends NotificationPayload {
  type: 'warning' | 'error';
  service: string;
  alertCode: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers?: string[];
}

export interface WebSocketClient {
  id: string;
  userId: string;
  socket: any; // WebSocket connection
  channels: string[];
  lastActivity: Date;
  userAgent: string;
  ipAddress: string;
}

export interface Channel {
  name: string;
  description: string;
  isPrivate: boolean;
  allowedRoles: string[];
  subscribers: string[]; // client IDs
}

export interface BroadcastOptions {
  channel?: string;
  userId?: string;
  userIds?: string[];
  excludeUserId?: string;
  roles?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

