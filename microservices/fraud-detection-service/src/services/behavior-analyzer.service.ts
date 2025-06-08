// ===============================================
// SERVIÇO DE ANÁLISE COMPORTAMENTAL
// ===============================================

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { 
  BehaviorProfile, 
  RiskAssessment,
  RiskFactor 
} from '../types/fraud.types';
import { RiskCalculator } from '../utils/risk-calculator';

export class BehaviorAnalyzerService {
  private prisma: PrismaClient;
  private redis: Redis;
  private riskCalculator: RiskCalculator;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.riskCalculator = new RiskCalculator();
  }

  /**
   * Analisa comportamento de um afiliado
   */
  async analyzeBehavior(affiliateId: string): Promise<BehaviorProfile> {
    // Buscar dados históricos do afiliado
    const indicationsHistory = await this.getIndicationsHistory(affiliateId);
    const sessionHistory = await this.getSessionHistory(affiliateId);
    
    // Calcular métricas comportamentais
    const averageIndicationsPerDay = this.calculateAverageIndicationsPerDay(indicationsHistory);
    const averageIndicationsPerWeek = this.calculateAverageIndicationsPerWeek(indicationsHistory);
    const typicalActivityHours = this.calculateTypicalActivityHours(sessionHistory);
    const commonIpAddresses = this.extractCommonIpAddresses(sessionHistory);
    const deviceFingerprints = this.extractDeviceFingerprints(sessionHistory);
    const networkGrowthPattern = await this.analyzeNetworkGrowthPattern(affiliateId);

    const profile: BehaviorProfile = {
      affiliateId,
      averageIndicationsPerDay,
      averageIndicationsPerWeek,
      typicalActivityHours,
      commonIpAddresses,
      deviceFingerprints,
      networkGrowthPattern,
      lastUpdated: new Date()
    };

    // Salvar no cache
    await this.redis.setex(
      `behavior:${affiliateId}`,
      3600, // 1 hora
      JSON.stringify(profile)
    );

    return profile;
  }

  /**
   * Busca perfil comportamental (cache first)
   */
  async getBehaviorProfile(affiliateId: string): Promise<BehaviorProfile | null> {
    // Tentar buscar no cache primeiro
    const cached = await this.redis.get(`behavior:${affiliateId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Se não estiver no cache, analisar novamente
    return await this.analyzeBehavior(affiliateId);
  }

  /**
   * Calcula avaliação de risco para um afiliado
   */
  async calculateRiskAssessment(affiliateId: string): Promise<RiskAssessment> {
    const behaviorProfile = await this.getBehaviorProfile(affiliateId);
    const riskFactors = await this.identifyRiskFactors(affiliateId, behaviorProfile);

    return this.riskCalculator.calculateRiskAssessment(
      affiliateId,
      riskFactors,
      behaviorProfile || undefined
    );
  }

  /**
   * Identifica fatores de risco para um afiliado
   */
  private async identifyRiskFactors(
    affiliateId: string, 
    behaviorProfile: BehaviorProfile | null
  ): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    if (!behaviorProfile) {
      return factors;
    }

    // Fator 1: Indicações muito frequentes
    if (behaviorProfile.averageIndicationsPerDay > 20) {
      factors.push({
        factor: 'high_indication_frequency',
        score: Math.min((behaviorProfile.averageIndicationsPerDay / 20) * 60, 100),
        weight: 0.8,
        description: 'Frequência de indicações acima do normal',
        evidence: {
          averagePerDay: behaviorProfile.averageIndicationsPerDay,
          threshold: 20
        }
      });
    }

    // Fator 2: Múltiplos IPs
    if (behaviorProfile.commonIpAddresses.length > 5) {
      factors.push({
        factor: 'multiple_ip_addresses',
        score: Math.min((behaviorProfile.commonIpAddresses.length / 5) * 50, 100),
        weight: 0.7,
        description: 'Uso de múltiplos endereços IP',
        evidence: {
          ipCount: behaviorProfile.commonIpAddresses.length,
          threshold: 5
        }
      });
    }

    // Fator 3: Crescimento exponencial da rede
    if (behaviorProfile.networkGrowthPattern === 'exponential') {
      factors.push({
        factor: 'exponential_network_growth',
        score: 75,
        weight: 0.9,
        description: 'Crescimento exponencial da rede de afiliados',
        evidence: {
          pattern: behaviorProfile.networkGrowthPattern
        }
      });
    }

    // Fator 4: Atividade em horários atípicos
    const nightHours = behaviorProfile.typicalActivityHours.filter(h => h >= 0 && h <= 6).length;
    if (nightHours > 3) {
      factors.push({
        factor: 'unusual_activity_hours',
        score: (nightHours / 7) * 40,
        weight: 0.4,
        description: 'Atividade frequente em horários atípicos',
        evidence: {
          nightHours,
          totalActiveHours: behaviorProfile.typicalActivityHours.length
        }
      });
    }

    return factors;
  }

  /**
   * Busca histórico de indicações
   */
  private async getIndicationsHistory(affiliateId: string): Promise<any[]> {
    try {
      return await this.prisma.referral.findMany({
        where: {
          affiliateId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 dias
          }
        },
        select: {
          createdAt: true,
          customerId: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Busca histórico de sessões
   */
  private async getSessionHistory(affiliateId: string): Promise<any[]> {
    try {
      return await this.prisma.userSession.findMany({
        where: {
          user: {
            affiliate: {
              id: affiliateId
            }
          },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 dias
          }
        },
        select: {
          createdAt: true,
          ipAddress: true,
          userAgent: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Calcula média de indicações por dia
   */
  private calculateAverageIndicationsPerDay(indications: any[]): number {
    if (indications.length === 0) return 0;

    const days = Math.max(1, Math.ceil(
      (Date.now() - new Date(indications[indications.length - 1].createdAt).getTime()) / (24 * 60 * 60 * 1000)
    ));

    return indications.length / days;
  }

  /**
   * Calcula média de indicações por semana
   */
  private calculateAverageIndicationsPerWeek(indications: any[]): number {
    return this.calculateAverageIndicationsPerDay(indications) * 7;
  }

  /**
   * Calcula horários típicos de atividade
   */
  private calculateTypicalActivityHours(sessions: any[]): number[] {
    const hourCounts: { [hour: number]: number } = {};

    sessions.forEach(session => {
      const hour = new Date(session.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Retornar horários com atividade significativa (>= 5% das sessões)
    const totalSessions = sessions.length;
    const threshold = Math.max(1, totalSessions * 0.05);

    return Object.entries(hourCounts)
      .filter(([_, count]) => count >= threshold)
      .map(([hour, _]) => parseInt(hour))
      .sort((a, b) => a - b);
  }

  /**
   * Extrai endereços IP comuns
   */
  private extractCommonIpAddresses(sessions: any[]): string[] {
    const ipCounts: { [ip: string]: number } = {};

    sessions.forEach(session => {
      if (session.ipAddress) {
        ipCounts[session.ipAddress] = (ipCounts[session.ipAddress] || 0) + 1;
      }
    });

    // Retornar IPs usados em pelo menos 2 sessões
    return Object.entries(ipCounts)
      .filter(([_, count]) => count >= 2)
      .map(([ip, _]) => ip);
  }

  /**
   * Extrai fingerprints de dispositivos
   */
  private extractDeviceFingerprints(sessions: any[]): string[] {
    const fingerprints = new Set<string>();

    sessions.forEach(session => {
      if (session.userAgent) {
        // Simplificado: usar user agent como fingerprint
        fingerprints.add(session.userAgent);
      }
    });

    return Array.from(fingerprints);
  }

  /**
   * Analisa padrão de crescimento da rede
   */
  private async analyzeNetworkGrowthPattern(affiliateId: string): Promise<'linear' | 'exponential' | 'irregular'> {
    try {
      // Buscar crescimento da rede nos últimos 30 dias
      const growthData = [];
      const now = new Date();

      for (let i = 29; i >= 0; i--) {
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

        growthData.push(networkSize);
      }

      // Analisar padrão de crescimento
      if (growthData.length < 7) return 'irregular';

      const recentGrowth = growthData.slice(-7);
      const earlierGrowth = growthData.slice(0, 7);

      const recentAvg = recentGrowth.reduce((a, b) => a + b, 0) / recentGrowth.length;
      const earlierAvg = earlierGrowth.reduce((a, b) => a + b, 0) / earlierGrowth.length;

      if (earlierAvg === 0) return 'irregular';

      const growthRatio = recentAvg / earlierAvg;

      if (growthRatio > 2) return 'exponential';
      if (growthRatio > 0.8 && growthRatio < 1.2) return 'linear';
      return 'irregular';

    } catch (error) {
      return 'irregular';
    }
  }
}

