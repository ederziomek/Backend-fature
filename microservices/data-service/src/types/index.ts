// ===============================================
// TIPOS E INTERFACES - DATA SERVICE
// ===============================================

export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  document?: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended' | 'banned';
  created_at: Date;
  updated_at: Date;
  original_id?: string;
  migrated_from?: string;
}

export interface PlatformAffiliate {
  id: string;
  user_id: string;
  parent_id?: string;
  referral_code: string;
  category: 'standard' | 'premium' | 'vip' | 'diamond';
  level: number;
  status: 'active' | 'inactive' | 'suspended' | 'pending_reactivation';
  joined_at: Date;
  last_activity_at?: Date;
  total_referrals: number;
  active_referrals: number;
  lifetime_volume: number;
  lifetime_commissions: number;
  current_month_volume: number;
  current_month_commissions: number;
  metadata?: Record<string, any>;
}

export interface PlatformTransaction {
  id: string;
  external_id?: string;
  affiliate_id: string;
  customer_id: string;
  type: 'deposit' | 'bet' | 'ggr' | 'sale' | 'bonus' | 'adjustment';
  amount: number;
  currency: string;
  status: 'pending' | 'processed' | 'failed' | 'cancelled';
  processed_at?: Date;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface CPAValidationResult {
  customer_id: string;
  affiliate_id: string;
  model: '1.1' | '1.2';
  validation_passed: boolean;
  first_deposit?: {
    amount: number;
    date: Date;
    transaction_id: string;
  };
  activity_metrics?: {
    bet_count: number;
    total_ggr: number;
    validation_date: Date;
  };
  validation_date: Date;
  commission_eligible: boolean;
}

export interface CPACommissionData {
  customer_id: string;
  affiliate_id: string;
  validation_result: CPAValidationResult;
  commission_amount: number;
  bonus_amount: number;
  hierarchy_levels: Array<{
    affiliate_id: string;
    level: number;
    commission_amount: number;
  }>;
  total_distributed: number;
}

export interface TransactionMonitorConfig {
  polling_interval_ms: number;
  batch_size: number;
  max_retries: number;
  retry_delay_ms: number;
  webhook_timeout_ms: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool_size?: number;
  connection_timeout_ms?: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  ttl_seconds: number;
}

export interface WebhookConfig {
  affiliate_service_url: string;
  timeout_ms: number;
  max_retries: number;
  retry_delay_ms: number;
  secret_key: string;
}

export interface DataServiceConfig {
  port: number;
  host: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  webhook: WebhookConfig;
  monitor: TransactionMonitorConfig;
  cpa_models: {
    model_1_1: {
      enabled: boolean;
      min_deposit_amount: number;
    };
    model_1_2: {
      enabled: boolean;
      min_deposit_amount: number;
      min_bet_count: number;
      min_ggr_amount: number;
    };
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
  request_id: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      response_time_ms?: number;
      error?: string;
    };
    redis: {
      status: 'connected' | 'disconnected' | 'error';
      response_time_ms?: number;
      error?: string;
    };
    affiliate_service: {
      status: 'reachable' | 'unreachable' | 'error';
      response_time_ms?: number;
      error?: string;
    };
  };
  uptime_seconds: number;
  memory_usage: {
    used_mb: number;
    total_mb: number;
    percentage: number;
  };
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  service: string;
  request_id?: string;
  user_id?: string;
  affiliate_id?: string;
  customer_id?: string;
  metadata?: Record<string, any>;
}

// Eventos para comunicação entre microsserviços
export interface ServiceEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  data: any;
  correlation_id?: string;
}

export interface CPAValidationEvent extends ServiceEvent {
  type: 'cpa.validation.completed';
  data: CPAValidationResult;
}

export interface CommissionCalculationEvent extends ServiceEvent {
  type: 'commission.calculation.requested';
  data: CPACommissionData;
}

export interface TransactionProcessedEvent extends ServiceEvent {
  type: 'transaction.processed';
  data: {
    transaction: PlatformTransaction;
    validation_triggered: boolean;
  };
}

