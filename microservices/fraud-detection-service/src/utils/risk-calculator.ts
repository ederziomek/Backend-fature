// ===============================================
// CALCULADORA DE RISCO
// ===============================================

import { RiskAssessment, RiskFactor, BehaviorProfile } from '../types/fraud.types';

export class RiskCalculator {
  
  /**
   * Calcula avaliação de risco para um afiliado
   */
  calculateRiskAssessment(
    affiliateId: string,
    riskFactors: RiskFactor[],
    behaviorProfile?: BehaviorProfile
  ): RiskAssessment {
    
    // Calcular score geral baseado nos fatores de risco
    const overallRiskScore = this.calculateOverallRiskScore(riskFactors);
    
    // Determinar nível de risco
    const riskLevel = this.determineRiskLevel(overallRiskScore);
    
    // Gerar recomendações baseadas no risco
    const recommendations = this.generateRecommendations(riskLevel, riskFactors, behaviorProfile);
    
    return {
      affiliateId,
      overallRiskScore,
      riskLevel,
      riskFactors,
      recommendations,
      assessedAt: new Date()
    };
  }

  /**
   * Calcula score geral de risco
   */
  private calculateOverallRiskScore(riskFactors: RiskFactor[]): number {
    if (riskFactors.length === 0) return 0;
    
    // Calcular score ponderado
    const totalWeightedScore = riskFactors.reduce((total, factor) => {
      return total + (factor.score * factor.weight);
    }, 0);
    
    const totalWeight = riskFactors.reduce((total, factor) => total + factor.weight, 0);
    
    if (totalWeight === 0) return 0;
    
    const weightedAverage = totalWeightedScore / totalWeight;
    
    // Aplicar boost para múltiplos fatores de alto risco
    const highRiskFactors = riskFactors.filter(f => f.score > 70).length;
    const boost = Math.min(highRiskFactors * 5, 20); // Máximo 20 pontos de boost
    
    return Math.min(weightedAverage + boost, 100);
  }

  /**
   * Determina nível de risco baseado no score
   */
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 85) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Gera recomendações baseadas no risco
   */
  private generateRecommendations(
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    riskFactors: RiskFactor[],
    behaviorProfile?: BehaviorProfile
  ): string[] {
    const recommendations: string[] = [];
    
    switch (riskLevel) {
      case 'critical':
        recommendations.push('Bloquear conta imediatamente');
        recommendations.push('Suspender todas as comissões pendentes');
        recommendations.push('Iniciar investigação urgente');
        recommendations.push('Notificar equipe de segurança');
        break;
        
      case 'high':
        recommendations.push('Suspender comissões temporariamente');
        recommendations.push('Requerer verificação adicional de identidade');
        recommendations.push('Monitorar atividades de perto');
        recommendations.push('Iniciar investigação detalhada');
        break;
        
      case 'medium':
        recommendations.push('Aumentar frequência de monitoramento');
        recommendations.push('Revisar atividades recentes');
        recommendations.push('Considerar verificação adicional');
        break;
        
      case 'low':
        recommendations.push('Continuar monitoramento normal');
        recommendations.push('Revisar periodicamente');
        break;
    }
    
    // Recomendações específicas baseadas nos fatores de risco
    riskFactors.forEach(factor => {
      switch (factor.factor) {
        case 'multiple_accounts_same_ip':
          recommendations.push('Verificar se contas pertencem à mesma pessoa');
          recommendations.push('Solicitar comprovante de endereço');
          break;
          
        case 'rapid_indications':
          recommendations.push('Verificar qualidade das indicações');
          recommendations.push('Analisar padrões de marketing');
          break;
          
        case 'suspicious_betting_patterns':
          recommendations.push('Investigar padrões de apostas dos indicados');
          recommendations.push('Verificar se apostas são legítimas');
          break;
          
        case 'network_growth_anomaly':
          recommendations.push('Analisar estratégias de crescimento');
          recommendations.push('Verificar sustentabilidade do crescimento');
          break;
      }
    });
    
    // Remover duplicatas
    return [...new Set(recommendations)];
  }

  /**
   * Calcula score de risco para um fator específico
   */
  calculateFactorRiskScore(
    factorType: string,
    value: number,
    threshold: number,
    maxValue?: number
  ): number {
    switch (factorType) {
      case 'threshold_exceeded':
        return value > threshold ? Math.min((value / threshold) * 50 + 50, 100) : 0;
        
      case 'percentage_deviation':
        return Math.min((value / 100) * 100, 100);
        
      case 'frequency_anomaly':
        const normalizedValue = maxValue ? value / maxValue : value;
        return Math.min(normalizedValue * 100, 100);
        
      default:
        return Math.min(value, 100);
    }
  }

  /**
   * Combina múltiplos scores de risco
   */
  combineRiskScores(scores: number[], weights?: number[]): number {
    if (scores.length === 0) return 0;
    
    if (weights && weights.length === scores.length) {
      const weightedSum = scores.reduce((sum, score, index) => sum + (score * weights[index]), 0);
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    
    // Se não há pesos, usar média simples
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Calcula confiança na avaliação de risco
   */
  calculateConfidence(
    riskFactors: RiskFactor[],
    dataQuality: number = 1.0,
    sampleSize: number = 1
  ): number {
    if (riskFactors.length === 0) return 0;
    
    // Confiança baseada no número de fatores
    const factorConfidence = Math.min(riskFactors.length / 3, 1); // Máximo com 3+ fatores
    
    // Confiança baseada na qualidade dos dados
    const qualityConfidence = Math.max(0, Math.min(dataQuality, 1));
    
    // Confiança baseada no tamanho da amostra
    const sampleConfidence = Math.min(Math.log(sampleSize + 1) / Math.log(10), 1);
    
    // Combinar todas as confianças
    return (factorConfidence + qualityConfidence + sampleConfidence) / 3;
  }

  /**
   * Normaliza score de risco para uma escala específica
   */
  normalizeRiskScore(score: number, minScore: number = 0, maxScore: number = 100): number {
    return Math.max(minScore, Math.min(maxScore, score));
  }

  /**
   * Calcula tendência de risco baseada em histórico
   */
  calculateRiskTrend(historicalScores: number[]): {
    trend: 'increasing' | 'decreasing' | 'stable';
    rate: number;
    confidence: number;
  } {
    if (historicalScores.length < 2) {
      return { trend: 'stable', rate: 0, confidence: 0 };
    }
    
    // Calcular tendência linear simples
    const n = historicalScores.length;
    const xSum = (n * (n - 1)) / 2; // Soma de 0 + 1 + 2 + ... + (n-1)
    const ySum = historicalScores.reduce((sum, score) => sum + score, 0);
    const xySum = historicalScores.reduce((sum, score, index) => sum + (score * index), 0);
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6; // Soma de 0² + 1² + 2² + ... + (n-1)²
    
    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    
    // Determinar tendência
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 1) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }
    
    // Calcular confiança baseada na consistência da tendência
    const confidence = Math.min(Math.abs(slope) / 10, 1);
    
    return {
      trend,
      rate: Math.abs(slope),
      confidence
    };
  }
}

