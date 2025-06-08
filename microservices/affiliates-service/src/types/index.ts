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

// Tipos de afiliado
export interface AffiliateData {
  id: string;
  userId: string;
  affiliateCode: string;
  sponsorId?: string;
  category: AffiliateCategory;
  categoryLevel: number;
  status: AffiliateStatus;
  directIndications: number;
  totalIndications: number;
  totalCommissions: number;
  availableBalance: number;
  lockedBalance: number;
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AffiliateCategory = 'jogador' | 'iniciante' | 'afiliado' | 'profissional' | 'expert' | 'mestre' | 'lenda';
export type AffiliateStatus = 'active' | 'inactive' | 'suspended' | 'banned';

// Tipos de comissão
export interface CommissionData {
  id: string;
  affiliateId: string;
  sourceAffiliateId: string;
  customerId: string;
  transactionId: string;
  type: CommissionType;
  level: number;
  baseAmount: number;
  percentage: number;
  commissionAmount: number;
  finalAmount: number;
  status: CommissionStatus;
  validatedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
}

export type CommissionType = 'cpa' | 'revshare' | 'bonus' | 'indication';
export type CommissionStatus = 'pending' | 'calculated' | 'validated' | 'paid' | 'cancelled';

// Tipos de transação
export interface TransactionData {
  id: string;
  customerId: string;
  affiliateId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  validationModel: ValidationModel;
  metadata: any;
  createdAt: Date;
}

export type TransactionType = 'deposit' | 'bet' | 'sale' | 'withdrawal';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type ValidationModel = '1.1' | '1.2';

// Tipos de hierarquia MLM
export interface MLMHierarchy {
  affiliate: AffiliateData;
  level: number;
  children: MLMHierarchy[];
  totalChildren: number;
  directChildren: number;
}

// Tipos de configuração de categoria
export interface CategoryConfig {
  category: AffiliateCategory;
  level: number;
  minDirectIndications: number;
  minTotalIndications: number;
  minCommissions: number;
  revShareLevel1: number;
  revShareLevels2to5: number;
  bonusMultiplier: number;
  requirements: CategoryRequirement[];
}

export interface CategoryRequirement {
  type: 'direct_indications' | 'total_indications' | 'commissions' | 'activity';
  value: number;
  period?: string;
}

// Tipos de cálculo de comissão
export interface CPACalculationInput {
  transactionAmount: number;
  affiliateId: string;
  transactionType: TransactionType;
  validationModel: ValidationModel;
  customerId: string;
  transactionId: string;
  metadata?: any;
}

export interface CPACalculationResult {
  commissions: CommissionData[];
  totalDistributed: number;
  validationPassed: boolean;
  bonusTriggered: boolean;
  levelUpTriggered: boolean;
  newCategory?: AffiliateCategory;
  newCategoryLevel?: number;
}

// Tipos de indicação
export interface IndicationData {
  id: string;
  sourceAffiliateId: string;
  targetAffiliateId?: string;
  customerId: string;
  status: IndicationStatus;
  bonusAmount: number;
  validatedAt?: Date;
  createdAt: Date;
}

export type IndicationStatus = 'pending' | 'validated' | 'paid' | 'cancelled';

// Tipos de relatório
export interface AffiliateReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    directIndications: number;
    totalIndications: number;
    commissionsEarned: number;
    bonusesEarned: number;
    totalEarnings: number;
    conversionRate: number;
  };
  commissions: CommissionData[];
  indications: IndicationData[];
}

// Tipos de requisição
export interface CreateAffiliateRequest {
  userId: string;
  sponsorCode?: string;
}

export interface UpdateAffiliateRequest {
  category?: AffiliateCategory;
  categoryLevel?: number;
  status?: AffiliateStatus;
}

export interface ProcessTransactionRequest {
  customerId: string;
  affiliateId: string;
  type: TransactionType;
  amount: number;
  validationModel: ValidationModel;
  metadata?: any;
}

export interface GetHierarchyRequest {
  affiliateId: string;
  maxLevels?: number;
  includeInactive?: boolean;
}

export interface GetReportRequest {
  affiliateId: string;
  startDate: Date;
  endDate: Date;
  includeCommissions?: boolean;
  includeIndications?: boolean;
}

// Extensão do FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    currentAffiliate?: AffiliateData;
  }
}

// Tipos de eventos
export interface AffiliateCreatedEvent {
  affiliateId: string;
  userId: string;
  affiliateCode: string;
  sponsorId?: string;
  timestamp: Date;
  metadata?: any;
}

export interface CommissionCalculatedEvent {
  commissionId: string;
  affiliateId: string;
  amount: number;
  type: CommissionType;
  level: number;
  timestamp: Date;
  metadata?: any;
}

export interface LevelUpEvent {
  affiliateId: string;
  oldCategory: AffiliateCategory;
  newCategory: AffiliateCategory;
  oldLevel: number;
  newLevel: number;
  timestamp: Date;
  metadata?: any;
}

export interface IndicationValidatedEvent {
  indicationId: string;
  sourceAffiliateId: string;
  customerId: string;
  bonusAmount: number;
  timestamp: Date;
  metadata?: any;
}

