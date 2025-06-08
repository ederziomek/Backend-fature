// ===============================================
// TIPOS ADICIONAIS PARA INTEGRAÇÃO CPA
// ===============================================

// Eventos do Data Service
export interface DataServiceEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  data: any;
  correlation_id?: string;
}

export interface CPAValidationEvent extends DataServiceEvent {
  type: 'cpa.validation.completed';
  data: CPAValidationResult;
}

export interface CommissionCalculationEvent extends DataServiceEvent {
  type: 'commission.calculation.requested';
  data: CPACommissionData;
}

export interface TransactionProcessedEvent extends DataServiceEvent {
  type: 'transaction.processed';
  data: {
    transaction: PlatformTransaction;
    validation_triggered: boolean;
  };
}

// Dados da plataforma
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

// Resultados de validação CPA
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

// Dados de comissão
export interface CommissionData {
  id: string;
  affiliate_id: string;
  customer_id?: string;
  type: 'CPA' | 'REVENUE_SHARE' | 'BONUS' | 'ADJUSTMENT';
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  level?: number;
  source_transaction_id?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  processed_at?: Date;
  paid_at?: Date;
}

// Eventos do sistema
export interface SystemEvent {
  id: string;
  type: string;
  affiliate_id?: string;
  customer_id?: string;
  data: Record<string, any>;
  source: string;
  external_id?: string;
  created_at: Date;
}

// Eventos de auditoria
export interface SecurityEvent {
  type: string;
  source: string;
  event_id?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

// Estatísticas de webhook
export interface WebhookStats {
  total_events_received: number;
  events_by_type: Record<string, number>;
  last_event_received: Date | null;
  average_processing_time_ms: number;
  failed_events: number;
  success_rate: number;
}

export interface WebhookEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  processing_time_ms: number;
  success: boolean;
  error_message?: string;
}

