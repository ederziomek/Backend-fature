// ===============================================
// TIPOS ADICIONAIS PARA FUNCIONALIDADES AVANÇADAS
// ===============================================

// RevShare Types
export interface RevShareCalculationInput {
  affiliateId: string;
  period: RevSharePeriod;
  metadata?: any;
}

export interface RevShareCalculationResult {
  commissions: RevShareCommissionData[];
  totalDistributed: number;
  ngrAmount: number;
  negativeCarryover: number;
  period: RevSharePeriod;
}

export interface RevShareCommissionData {
  id: string;
  affiliateId: string;
  sourceAffiliateId: string;
  type: 'revshare';
  level: number;
  baseAmount: number;
  percentage: number;
  commissionAmount: number;
  finalAmount: number;
  status: CommissionStatus;
  period: RevSharePeriod;
  metadata?: any;
  createdAt: Date;
}

export interface RevSharePeriod {
  type: 'weekly' | 'monthly' | 'custom';
  startDate?: Date;
  endDate?: Date;
}

export interface NGRData {
  ngr: number;
  deposits: number;
  withdrawals: number;
  bonuses: number;
  period: RevSharePeriod;
  startDate: Date;
  endDate: Date;
}

// Gamification Types
export interface GamificationData {
  sequences: SequenceData[];
  chests: ChestReward[];
  rankings: RankingData[];
  boosts: BoostData[];
}

export interface SequenceData {
  currentStreak: number;
  lastIndicationDate: Date | null;
  nextReward: { amount: number; type: string } | null;
  streakBroken: boolean;
  rewardEarned?: { amount: number; type: string };
}

export interface ChestReward {
  id: string;
  rarity: ChestRarity;
  content: any;
  trigger: string;
  expiresAt: Date;
}

export type ChestRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RankingData {
  id: string;
  name: string;
  positions: RankingPosition[];
  status: 'active' | 'completed' | 'cancelled';
  endDate: Date;
}

export interface RankingPosition {
  position: number;
  affiliateId: string;
  affiliateCode: string;
  score: number;
  reward?: any;
}

export interface BoostData {
  id: string;
  type: string;
  multiplier: number;
  expiresAt: Date;
  isActive: boolean;
}

export interface GamificationEvent {
  type: 'sequence' | 'chest' | 'ranking' | 'boost';
  data: any;
  timestamp: Date;
}

// Reports Types
export interface ReportRequest {
  affiliateId: string;
  type: 'performance' | 'commission' | 'network' | 'conversion';
  format: ReportFormat;
  startDate: Date;
  endDate: Date;
  filters?: any;
}

export interface ReportData {
  reportId?: string;
  filePath: string;
  fileSize: number;
  format: ReportFormat;
  data: any;
}

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export interface AffiliatePerformanceReport {
  period: { startDate: Date; endDate: Date };
  indications: {
    total: number;
    validated: number;
    conversionRate: number;
  };
  commissions: {
    total: number;
    cpa: number;
    revshare: number;
    count: number;
  };
  volume: {
    total: number;
    deposits: number;
    withdrawals: number;
    ngr: number;
  };
  generatedAt: Date;
}

export interface CommissionReport {
  affiliate: AffiliateData;
  period: { startDate: Date; endDate: Date };
  commissions: any[];
  totals: {
    cpa: number;
    revshare: number;
    total: number;
    count: number;
  };
  generatedAt: Date;
}

export interface NetworkReport {
  affiliate: AffiliateData;
  period: { startDate: Date; endDate: Date };
  network: any;
  metrics: any;
  generatedAt: Date;
}

export interface ConversionReport {
  affiliate: AffiliateData;
  period: { startDate: Date; endDate: Date };
  conversions: any[];
  metrics: any;
  generatedAt: Date;
}

// Webhook Types
export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  retries: number;
  status: 'pending' | 'sent' | 'failed';
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
}

// Admin Types
export interface AdminAction {
  action: string;
  resource: string;
  resourceId: string;
  adminId: string;
  reason?: string;
  metadata?: any;
  timestamp: Date;
}

export interface SystemConfig {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  updatedBy: string;
  updatedAt: Date;
}

// Event Types para EventService
export interface AffiliateCreatedEvent {
  affiliateId: string;
  userId: string;
  affiliateCode: string;
  sponsorId?: string;
  timestamp: Date;
}

export interface CommissionCalculatedEvent {
  commissionId: string;
  affiliateId: string;
  amount: number;
  type: 'cpa' | 'revshare';
  level: number;
  timestamp: Date;
  metadata?: any;
}

export interface RevShareCalculatedEvent {
  commissionId: string;
  affiliateId: string;
  amount: number;
  level: number;
  period: RevSharePeriod;
  ngrAmount: number;
  timestamp: Date;
}

export interface RevShareProcessedEvent {
  period: RevSharePeriod;
  processedCount: number;
  totalDistributed: number;
  timestamp: Date;
}

export interface SequenceUpdatedEvent {
  affiliateId: string;
  currentStreak: number;
  reward?: { amount: number; type: string };
  timestamp: Date;
}

export interface ChestGeneratedEvent {
  chestId: string;
  affiliateId: string;
  rarity: ChestRarity;
  trigger: string;
  timestamp: Date;
}

export interface ChestOpenedEvent {
  chestId: string;
  affiliateId: string;
  content: any;
  timestamp: Date;
}

export interface ReportGeneratedEvent {
  reportId: string;
  affiliateId: string;
  type: string;
  format: ReportFormat;
  timestamp: Date;
}

// Existing types (mantendo compatibilidade)
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
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAffiliateRequest {
  userId: string;
  sponsorCode?: string;
}

export interface UpdateAffiliateRequest {
  category?: AffiliateCategory;
  categoryLevel?: number;
  status?: AffiliateStatus;
}

export interface MLMHierarchy {
  level: number;
  affiliate: AffiliateData;
  children: MLMHierarchy[];
}

export type AffiliateCategory = 
  | 'jogador'
  | 'iniciante' 
  | 'afiliado'
  | 'profissional'
  | 'expert'
  | 'mestre'
  | 'lenda';

export type AffiliateStatus = 
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'pending_reactivation';

export interface AffiliateReport {
  affiliate: AffiliateData;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    indications: number;
    validatedIndications: number;
    conversionRate: number;
    totalCommissions: number;
    cpaCommissions: number;
    revshareCommissions: number;
  };
  hierarchy: MLMHierarchy;
}

export interface GetReportRequest {
  affiliateId: string;
  startDate: Date;
  endDate: Date;
  includeHierarchy?: boolean;
}

export interface CommissionData {
  id: string;
  affiliateId: string;
  sourceAffiliateId: string;
  customerId?: string;
  transactionId?: string;
  type: CommissionType;
  level: number;
  baseAmount: number;
  percentage: number;
  commissionAmount: number;
  finalAmount: number;
  status: CommissionStatus;
  metadata?: any;
  createdAt: Date;
}

export type CommissionType = 'cpa' | 'revshare';

export type CommissionStatus = 
  | 'calculated'
  | 'approved'
  | 'paid'
  | 'cancelled'
  | 'disputed';

export interface CategoryConfig {
  category: AffiliateCategory;
  level: number;
  minIndications: number;
  maxIndications: number;
  revShareTotal: number;
  revShareLevel1: number;
  revShareLevels2to5: number;
  levelUpReward: number;
}

export type ValidationModel = '1.1' | '1.2';

export type TransactionType = 
  | 'sale'
  | 'deposit'
  | 'bet'
  | 'bonus'
  | 'adjustment'
  | 'withdrawal';

export interface CPACalculationInput {
  affiliateId: string;
  customerId: string;
  transactionId: string;
  transactionType: TransactionType;
  transactionAmount: number;
  validationModel: ValidationModel;
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
  levels?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}

