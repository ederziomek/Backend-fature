import { 
  NotificationTemplate as PrismaNotificationTemplate,
  NotificationPreference as PrismaNotificationPreference,
  NotificationLog as PrismaNotificationLog,
  NotificationType,
  NotificationCategory,
  NotificationStatus,
  NotificationPriority,
  BatchStatus
} from '@prisma/client';

export interface NotificationTemplate extends PrismaNotificationTemplate {}

export interface NotificationPreference extends PrismaNotificationPreference {}

export interface NotificationLog extends PrismaNotificationLog {}

export interface NotificationRequest {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  templateId: string;
  variables: Record<string, any>;
  recipient?: string; // Se não fornecido, busca do usuário
  priority: NotificationPriority;
  scheduledFor?: Date;
}

export interface NotificationStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
  categories: Record<NotificationCategory, number>;
  types: Record<NotificationType, number>;
}

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface PushConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
}

export interface NotificationConfig {
  email: EmailConfig;
  sms: SMSConfig;
  push: PushConfig;
  retryAttempts: number;
  retryDelay: number;
  batchSize: number;
}

export interface CreateTemplateRequest {
  name: string;
  type: NotificationType;
  subject?: string;
  content: string;
  variables: string[];
}

export interface UpdateTemplateRequest {
  name?: string;
  subject?: string;
  content?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface UpdatePreferencesRequest {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  categories?: NotificationCategory[];
}

export interface SendNotificationRequest {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  templateId: string;
  variables: Record<string, any>;
  recipient?: string;
  priority?: NotificationPriority;
  scheduledFor?: string; // ISO date string
}

export interface BulkNotificationRequest {
  userIds: string[];
  type: NotificationType;
  category: NotificationCategory;
  templateId: string;
  variables: Record<string, any>;
  priority?: NotificationPriority;
  scheduledFor?: string;
}

export interface NotificationMetrics {
  period: string;
  stats: NotificationStats;
  trends: {
    sent: number[];
    delivered: number[];
    failed: number[];
  };
  topCategories: Array<{
    category: NotificationCategory;
    count: number;
    deliveryRate: number;
  }>;
}

// Re-export Prisma enums
export { 
  NotificationType, 
  NotificationCategory, 
  NotificationStatus, 
  NotificationPriority,
  BatchStatus 
};

