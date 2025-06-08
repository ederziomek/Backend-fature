// ===============================================
// TIPOS - FRAUD DETECTION SERVICE
// ===============================================

export interface FraudPattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  thresholds: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FraudAlert {
  id: string;
  affiliateId: string;
  patternId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  description: string;
  evidence: Record<string, any>;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  investigatedBy?: string;
  resolvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuspiciousActivity {
  affiliateId: string;
  activityType: string;
  timestamp: Date;
  metadata: Record<string, any>;
  riskIndicators: string[];
}

export interface RiskAssessment {
  affiliateId: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  recommendations: string[];
  assessedAt: Date;
}

export interface RiskFactor {
  factor: string;
  score: number;
  weight: number;
  description: string;
  evidence: any;
}

export interface BehaviorProfile {
  affiliateId: string;
  averageIndicationsPerDay: number;
  averageIndicationsPerWeek: number;
  typicalActivityHours: number[];
  commonIpAddresses: string[];
  deviceFingerprints: string[];
  networkGrowthPattern: 'linear' | 'exponential' | 'irregular';
  lastUpdated: Date;
}

export interface FraudInvestigation {
  id: string;
  alertId: string;
  investigatorId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  findings: InvestigationFinding[];
  actions: InvestigationAction[];
  conclusion?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface InvestigationFinding {
  id: string;
  type: string;
  description: string;
  evidence: any;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
}

export interface InvestigationAction {
  id: string;
  type: 'block_account' | 'suspend_commissions' | 'require_verification' | 'monitor_closely' | 'clear_alert';
  description: string;
  executedBy: string;
  executedAt: Date;
  parameters?: Record<string, any>;
}

export interface FraudDetectionConfig {
  enabledPatterns: string[];
  globalThresholds: Record<string, number>;
  alertingEnabled: boolean;
  autoBlockEnabled: boolean;
  investigationAutoAssignment: boolean;
  retentionDays: number;
}

export interface PatternDetectionResult {
  patternId: string;
  matched: boolean;
  riskScore: number;
  evidence: Record<string, any>;
  confidence: number;
}

export interface AlertRequest {
  affiliateId: string;
  patternId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  description: string;
  evidence: Record<string, any>;
}

export interface InvestigationRequest {
  alertId: string;
  investigatorId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp: Date;
  };
}

