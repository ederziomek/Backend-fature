// ===============================================
// SERVIÇO DE DETECÇÃO DE PADRÕES
// ===============================================

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { 
  FraudPattern, 
  SuspiciousActivity, 
  PatternDetectionResult,
  BehaviorProfile 
} from '../types/fraud.types';
import { fraudConfig } from '../config';
import { RiskCalculator } from '../utils/risk-calculator';

export class PatternDetectorService {
  private prisma: PrismaClient;
  private redis: Redis;
  private riskCalculator: RiskCalculator;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.riskCalculator = new RiskCalculator();
  }

  /**
   * Detecta padrões suspeitos para um afiliado específico
   */
  async detectPatterns(affiliateId: string): Promise<PatternDetectionResult[]> {
    const results: PatternDetectionResult[] = [];
    
    // Buscar padrões habilitados
    const enabledPatterns = await this.getEnabledPatterns();
    
    for (const pattern of enabledPatterns) {
      const result = await this.checkPattern(affiliateId, pattern);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Verifica padrão específico para um afiliado
   */
  private async checkPattern(affiliateId: string, pattern: FraudPattern): Promise<PatternDetectionResult> {
    switch (pattern.name) {
      case 'multiple_accounts_same_ip':
        return await this.checkMultipleAccountsPattern(affiliateId, pattern);
      
      case 'rapid_indications':
        return await this.checkRapidIndicationsPattern(affiliateId, pattern);
      
      case 'suspicious_betting_patterns':
        return await this.checkSuspiciousBettingPattern(affiliateId, pattern);
      
      case 'network_growth_anomaly':
        return await this.checkNetworkGrowthAnomalyPattern(affiliateId, pattern);
      
      default:
        return {
          patternId: pattern.id,
          matched: false,
          riskScore: 0,
          evidence: {},
          confidence: 0
        };
    }
  }

  /**
   * Detecta múltiplas contas do mesmo IP
   */
  private async checkMultipleAccountsPattern(
    affiliateId: string, 
    pattern: FraudPattern
  ): Promise<PatternDetectionResult> {
    const config = fraudConfig.detection.patterns.multipleAccounts;
    
    // Buscar IPs recentes do afiliado
    const recentSessions = await this.prisma.userSession.findMany({
      where: {
        user: {
          affiliate: {
            id: affiliateId
          }
        },
        createdAt: {
          gte: new Date(Date.now() - config.timeWindowHours * 60 * 60 * 1000)
        }
      },
      select: {
        ipAddress: true,
        createdAt: true
      }
    });

    const ipAddresses = [...new Set(recentSessions.map(s => s.ipAddress).filter(Boolean))];
    
    let totalSuspiciousAccounts = 0;
    const evidence: Record<string, any> = {
      suspiciousIps: [],
      timeWindow: config.timeWindowHours
    };

    for (const ip of ipAddresses) {
      // Contar quantas contas diferentes usaram este IP
      const accountsWithSameIp = await this.prisma.userSession.groupBy({
        by: ['userId'],
        where: {
          ipAddress: ip,
          createdAt: {
            gte: new Date(Date.now() - config.timeWindowHours * 60 * 60 * 1000)
          }
        },
        _count: {
          userId: true
        }
      });

      if (accountsWithSameIp.length > config.maxAccountsPerIp) {
        totalSuspiciousAccounts += accountsWithSameIp.length;
        evidence.suspiciousIps.push({
          ip,
          accountCount: accountsWithSameIp.length,
          threshold: config.maxAccountsPerIp
        });
      }
    }

    const matched = totalSuspiciousAccounts > 0;
    const riskScore = matched ? Math.min(config.riskScore + (totalSuspiciousAccounts * 5), 100) : 0;
    const confidence = matched ? Math.min(totalSuspiciousAccounts / config.maxAccountsPerIp, 1) : 0;

    return {
      patternId: pattern.id,
      matched,
      riskScore,
      evidence,
      confidence
    };
  }

  /**
   * Detecta indicações muito rápidas
   */
  private async checkRapidIndicationsPattern(
    affiliateId: string, 
    pattern: FraudPattern
  ): Promise<PatternDetectionResult> {
    const config = fraudConfig.detection.patterns.rapidIndications;
    const now = new Date();
    
    // Indicações na última hora
    const indicationsLastHour = await this.prisma.referral.count({
      where: {
        affiliateId,
        createdAt: {
          gte: new Date(now.getTime() - 60 * 60 * 1000)
        }
      }
    });

    // Indicações no último dia
    const indicationsLastDay = await this.prisma.referral.count({
      where: {
        affiliateId,
        createdAt: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        }
      }
    });

    const hourlyExceeded = indicationsLastHour > config.maxIndicationsPerHour;
    const dailyExceeded = indicationsLastDay > config.maxIndicationsPerDay;
    const matched = hourlyExceeded || dailyExceeded;

    const evidence = {
      indicationsLastHour,
      indicationsLastDay,
      thresholds: {
        hourly: config.maxIndicationsPerHour,
        daily: config.maxIndicationsPerDay
      },
      violations: {
        hourly: hourlyExceeded,
        daily: dailyExceeded
      }
    };

    let riskScore = 0;
    if (hourlyExceeded) {
      riskScore += config.riskScore * (indicationsLastHour / config.maxIndicationsPerHour);
    }
    if (dailyExceeded) {
      riskScore += config.riskScore * 0.5 * (indicationsLastDay / config.maxIndicationsPerDay);
    }
    riskScore = Math.min(riskScore, 100);

    const confidence = matched ? 
      Math.min(Math.max(indicationsLastHour / config.maxIndicationsPerHour, indicationsLastDay / config.maxIndicationsPerDay), 1) : 0;

    return {
      patternId: pattern.id,
      matched,
      riskScore,
      evidence,
      confidence
    };
  }

  /**
   * Detecta padrões suspeitos de apostas
   */
  private async checkSuspiciousBettingPattern(
    affiliateId: string, 
    pattern: FraudPattern
  ): Promise<PatternDetectionResult> {
    const config = fraudConfig.detection.patterns.suspiciousBetting;
    
    // Buscar transações de apostas dos indicados deste afiliado
    const bettingTransactions = await this.prisma.transaction.findMany({
      where: {
        type: 'bet',
        affiliate: {
          ancestors: {
            some: {
              ancestorId: affiliateId
            }
          }
        },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Última semana
        }
      },
      select: {
        amount: true,
        createdAt: true,
        customerId: true
      }
    });

    if (bettingTransactions.length === 0) {
      return {
        patternId: pattern.id,
        matched: false,
        riskScore: 0,
        evidence: { message: 'No betting transactions found' },
        confidence: 0
      };
    }

    // Analisar padrões suspeitos
    const suspiciousPatterns = this.analyzeBettingPatterns(bettingTransactions);
    const matched = suspiciousPatterns.score > config.suspiciousPatternThreshold;
    const riskScore = matched ? config.riskScore * suspiciousPatterns.score : 0;

    return {
      patternId: pattern.id,
      matched,
      riskScore,
      evidence: {
        totalTransactions: bettingTransactions.length,
        suspiciousPatterns,
        threshold: config.suspiciousPatternThreshold
      },
      confidence: suspiciousPatterns.score
    };
  }

  /**
   * Detecta crescimento anômalo da rede
   */
  private async checkNetworkGrowthAnomalyPattern(
    affiliateId: string, 
    pattern: FraudPattern
  ): Promise<PatternDetectionResult> {
    const config = fraudConfig.detection.patterns.networkGrowthAnomaly;
    
    // Buscar histórico de crescimento da rede
    const growthHistory = await this.getNetworkGrowthHistory(affiliateId, 30); // Últimos 30 dias
    
    if (growthHistory.length < 7) { // Precisa de pelo menos 7 dias de dados
      return {
        patternId: pattern.id,
        matched: false,
        riskScore: 0,
        evidence: { message: 'Insufficient data for growth analysis' },
        confidence: 0
      };
    }

    const growthAnalysis = this.analyzeGrowthPattern(growthHistory);
    const matched = growthAnalysis.isAnomalous;
    const riskScore = matched ? config.riskScore * growthAnalysis.anomalyScore : 0;

    return {
      patternId: pattern.id,
      matched,
      riskScore,
      evidence: {
        growthHistory: growthHistory.slice(-7), // Últimos 7 dias
        analysis: growthAnalysis,
        thresholds: {
          maxGrowthRate: config.maxGrowthRatePerDay,
          exponentialThreshold: config.exponentialGrowthThreshold
        }
      },
      confidence: growthAnalysis.anomalyScore
    };
  }

  /**
   * Busca padrões habilitados
   */
  private async getEnabledPatterns(): Promise<FraudPattern[]> {
    // Por enquanto, retorna padrões hardcoded
    // Em produção, isso viria do banco de dados
    return [
      {
        id: 'pattern-1',
        name: 'multiple_accounts_same_ip',
        description: 'Múltiplas contas do mesmo IP',
        severity: 'high',
        enabled: true,
        thresholds: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'pattern-2',
        name: 'rapid_indications',
        description: 'Indicações muito rápidas',
        severity: 'medium',
        enabled: true,
        thresholds: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'pattern-3',
        name: 'suspicious_betting_patterns',
        description: 'Padrões suspeitos de apostas',
        severity: 'high',
        enabled: true,
        thresholds: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'pattern-4',
        name: 'network_growth_anomaly',
        description: 'Crescimento anômalo da rede',
        severity: 'medium',
        enabled: true,
        thresholds: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  /**
   * Analisa padrões de apostas para detectar suspeitas
   */
  private analyzeBettingPatterns(transactions: any[]): { score: number; patterns: string[] } {
    const patterns: string[] = [];
    let score = 0;

    // Agrupar por cliente
    const byCustomer = transactions.reduce((acc, t) => {
      if (!acc[t.customerId]) acc[t.customerId] = [];
      acc[t.customerId].push(t);
      return acc;
    }, {});

    // Verificar padrões por cliente
    Object.values(byCustomer).forEach((customerTransactions: any) => {
      const amounts = customerTransactions.map((t: any) => parseFloat(t.amount));
      
      // Padrão 1: Valores muito similares
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((acc, amount) => acc + Math.pow(amount - avgAmount, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev < avgAmount * 0.1 && amounts.length > 5) { // Baixa variação em muitas apostas
        patterns.push('uniform_betting_amounts');
        score += 0.3;
      }

      // Padrão 2: Apostas em horários muito regulares
      const timestamps = customerTransactions.map((t: any) => new Date(t.createdAt).getTime());
      const intervals = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i-1]);
      }
      
      if (intervals.length > 3) {
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const intervalVariance = intervals.reduce((acc, interval) => acc + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        
        if (Math.sqrt(intervalVariance) < avgInterval * 0.2) { // Intervalos muito regulares
          patterns.push('regular_betting_intervals');
          score += 0.4;
        }
      }
    });

    return { score: Math.min(score, 1), patterns };
  }

  /**
   * Busca histórico de crescimento da rede
   */
  private async getNetworkGrowthHistory(affiliateId: string, days: number): Promise<any[]> {
    const history = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      const networkSize = await this.prisma.affiliateHierarchy.count({
        where: {
          ancestorId: affiliateId,
          createdAt: {
            lt: endOfDay
          }
        }
      });
      
      history.push({
        date: startOfDay,
        networkSize
      });
    }
    
    return history;
  }

  /**
   * Analisa padrão de crescimento para detectar anomalias
   */
  private analyzeGrowthPattern(history: any[]): { isAnomalous: boolean; anomalyScore: number; pattern: string } {
    if (history.length < 7) {
      return { isAnomalous: false, anomalyScore: 0, pattern: 'insufficient_data' };
    }

    const growthRates = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i-1].networkSize;
      const curr = history[i].networkSize;
      const rate = prev > 0 ? (curr - prev) / prev : 0;
      growthRates.push(rate);
    }

    const avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    const maxGrowthRate = Math.max(...growthRates);
    
    const config = fraudConfig.detection.patterns.networkGrowthAnomaly;
    
    // Verificar crescimento muito rápido
    if (maxGrowthRate > config.maxGrowthRatePerDay) {
      return {
        isAnomalous: true,
        anomalyScore: Math.min(maxGrowthRate / config.maxGrowthRatePerDay, 1),
        pattern: 'rapid_growth'
      };
    }

    // Verificar crescimento exponencial
    const recentGrowth = growthRates.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const earlierGrowth = growthRates.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    
    if (earlierGrowth > 0 && recentGrowth / earlierGrowth > config.exponentialGrowthThreshold) {
      return {
        isAnomalous: true,
        anomalyScore: Math.min((recentGrowth / earlierGrowth) / config.exponentialGrowthThreshold, 1),
        pattern: 'exponential_growth'
      };
    }

    return { isAnomalous: false, anomalyScore: 0, pattern: 'normal' };
  }
}

