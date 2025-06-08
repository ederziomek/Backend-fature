// ===============================================
// SERVIÇO DE DISTRIBUIÇÃO DE PRÊMIOS
// ===============================================

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { 
  Competition, 
  Prize, 
  PrizeDistribution, 
  PrizeDistributionRequest,
  RankingEntry
} from '../types/rankings.types';

export class PrizeDistributionService {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  /**
   * Distribui prêmios automaticamente baseado no ranking final
   */
  async distributeAutomaticPrizes(competition: Competition): Promise<PrizeDistribution[]> {
    const distributions: PrizeDistribution[] = [];

    // Ordenar ranking por posição
    const sortedRankings = competition.rankings.sort((a, b) => a.position - b.position);

    for (const prize of competition.prizes) {
      if (prize.distributionMethod === 'automatic') {
        const recipients = this.determineRecipients(prize, sortedRankings);
        
        for (const recipientId of recipients) {
          const distribution = await this.createDistribution({
            competitionId: competition.id,
            prizeId: prize.id,
            recipientIds: [recipientId],
            distributionMethod: 'automatic',
            notes: `Distribuição automática - Posição: ${this.getRecipientPosition(recipientId, sortedRankings)}`
          });

          distributions.push(distribution);
        }
      }
    }

    return distributions;
  }

  /**
   * Cria uma distribuição de prêmio
   */
  async createDistribution(request: PrizeDistributionRequest): Promise<PrizeDistribution> {
    // Para cada recipient, criar uma distribuição separada
    const recipientId = request.recipientIds[0]; // Simplificado para um recipient por vez

    const distribution: PrizeDistribution = {
      id: uuidv4(),
      competitionId: request.competitionId,
      prizeId: request.prizeId,
      recipientId,
      amount: 0, // Será definido baseado no prêmio
      status: 'pending',
      notes: request.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Buscar informações do prêmio para definir o valor
    const prize = await this.getPrizeInfo(request.prizeId, request.competitionId);
    if (prize) {
      distribution.amount = prize.value;
    }

    // Salvar no cache
    await this.redis.setex(
      `distribution:${distribution.id}`,
      86400, // 24 horas
      JSON.stringify(distribution)
    );

    // Processar distribuição baseado no tipo
    await this.processDistribution(distribution, prize);

    return distribution;
  }

  /**
   * Processa a distribuição baseado no tipo de prêmio
   */
  private async processDistribution(distribution: PrizeDistribution, prize: Prize | null): Promise<void> {
    if (!prize) return;

    try {
      switch (prize.type) {
        case 'cash':
          await this.processCashPrize(distribution, prize);
          break;
        
        case 'bonus':
          await this.processBonusPrize(distribution, prize);
          break;
        
        case 'commission_boost':
          await this.processCommissionBoost(distribution, prize);
          break;
        
        case 'special_privilege':
          await this.processSpecialPrivilege(distribution, prize);
          break;
      }

      // Atualizar status para processando
      distribution.status = 'processing';
      distribution.updatedAt = new Date();

      await this.redis.setex(
        `distribution:${distribution.id}`,
        86400,
        JSON.stringify(distribution)
      );

    } catch (error) {
      distribution.status = 'failed';
      distribution.notes = `Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      distribution.updatedAt = new Date();

      await this.redis.setex(
        `distribution:${distribution.id}`,
        86400,
        JSON.stringify(distribution)
      );
    }
  }

  /**
   * Processa prêmio em dinheiro
   */
  private async processCashPrize(distribution: PrizeDistribution, prize: Prize): Promise<void> {
    // Implementação simplificada - em produção integraria com sistema de pagamentos
    
    // Simular processamento de pagamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Criar transação de prêmio
    try {
      // await this.prisma.transaction.create({
      //   data: {
      //     type: 'prize',
      //     amount: distribution.amount.toString(),
      //     affiliateId: distribution.recipientId,
      //     description: `Prêmio em dinheiro: ${prize.description}`,
      //     status: 'completed',
      //     metadata: {
      //       competitionId: distribution.competitionId,
      //       prizeId: distribution.prizeId,
      //       distributionId: distribution.id
      //     }
      //   }
      // });

      distribution.status = 'completed';
      distribution.distributedAt = new Date();
      distribution.transactionId = `tx_${uuidv4()}`;

    } catch (error) {
      throw new Error(`Falha ao processar pagamento: ${error}`);
    }
  }

  /**
   * Processa prêmio de bônus
   */
  private async processBonusPrize(distribution: PrizeDistribution, prize: Prize): Promise<void> {
    // Implementação simplificada - adicionar bônus à conta do afiliado
    
    try {
      // await this.prisma.affiliateBonus.create({
      //   data: {
      //     affiliateId: distribution.recipientId,
      //     amount: distribution.amount.toString(),
      //     type: 'competition_prize',
      //     description: prize.description,
      //     expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 dias
      //     metadata: {
      //       competitionId: distribution.competitionId,
      //       prizeId: distribution.prizeId
      //     }
      //   }
      // });

      distribution.status = 'completed';
      distribution.distributedAt = new Date();

    } catch (error) {
      throw new Error(`Falha ao processar bônus: ${error}`);
    }
  }

  /**
   * Processa boost de comissão
   */
  private async processCommissionBoost(distribution: PrizeDistribution, prize: Prize): Promise<void> {
    // Implementação simplificada - aplicar boost temporário
    
    try {
      // await this.prisma.affiliateCommissionBoost.create({
      //   data: {
      //     affiliateId: distribution.recipientId,
      //     multiplier: distribution.amount / 100, // Converter para multiplicador
      //     description: prize.description,
      //     startDate: new Date(),
      //     endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      //     metadata: {
      //       competitionId: distribution.competitionId,
      //       prizeId: distribution.prizeId
      //     }
      //   }
      // });

      distribution.status = 'completed';
      distribution.distributedAt = new Date();

    } catch (error) {
      throw new Error(`Falha ao processar boost: ${error}`);
    }
  }

  /**
   * Processa privilégio especial
   */
  private async processSpecialPrivilege(distribution: PrizeDistribution, prize: Prize): Promise<void> {
    // Implementação simplificada - conceder privilégio especial
    
    try {
      // await this.prisma.affiliatePrivilege.create({
      //   data: {
      //     affiliateId: distribution.recipientId,
      //     privilegeType: prize.description,
      //     grantedAt: new Date(),
      //     expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
      //     metadata: {
      //       competitionId: distribution.competitionId,
      //       prizeId: distribution.prizeId
      //     }
      //   }
      // });

      distribution.status = 'completed';
      distribution.distributedAt = new Date();

    } catch (error) {
      throw new Error(`Falha ao processar privilégio: ${error}`);
    }
  }

  /**
   * Determina os recipients de um prêmio baseado na posição
   */
  private determineRecipients(prize: Prize, rankings: RankingEntry[]): string[] {
    const recipients: string[] = [];

    if (typeof prize.position === 'number') {
      // Prêmio para posição específica
      const winner = rankings.find(r => r.position === prize.position && r.isEligible);
      if (winner) {
        recipients.push(winner.affiliateId);
      }
    } else {
      // Prêmio para faixa de posições
      const { from, to } = prize.position;
      const winners = rankings.filter(r => 
        r.position >= from && 
        r.position <= to && 
        r.isEligible
      );
      recipients.push(...winners.map(w => w.affiliateId));
    }

    return recipients;
  }

  /**
   * Busca informações do prêmio
   */
  private async getPrizeInfo(prizeId: string, competitionId: string): Promise<Prize | null> {
    // Implementação simplificada - em produção buscaria do banco
    // Por enquanto, retorna prêmio mock
    return {
      id: prizeId,
      position: 1,
      type: 'cash',
      value: 1000,
      description: 'Prêmio em dinheiro para 1º lugar',
      distributionMethod: 'automatic'
    };
  }

  /**
   * Busca posição do recipient no ranking
   */
  private getRecipientPosition(recipientId: string, rankings: RankingEntry[]): number {
    const entry = rankings.find(r => r.affiliateId === recipientId);
    return entry ? entry.position : 0;
  }

  /**
   * Lista distribuições de uma competição
   */
  async getDistributions(competitionId: string): Promise<PrizeDistribution[]> {
    // Implementação simplificada - retorna distribuições mock
    return [
      {
        id: 'dist-1',
        competitionId,
        prizeId: 'prize-1',
        recipientId: 'affiliate-1',
        amount: 1000,
        status: 'completed',
        distributedAt: new Date(),
        transactionId: 'tx_123',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  /**
   * Atualiza status de uma distribuição
   */
  async updateDistributionStatus(
    distributionId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
    notes?: string
  ): Promise<PrizeDistribution | null> {
    const cached = await this.redis.get(`distribution:${distributionId}`);
    if (!cached) return null;

    const distribution: PrizeDistribution = JSON.parse(cached);
    distribution.status = status;
    distribution.updatedAt = new Date();
    
    if (notes) {
      distribution.notes = notes;
    }

    if (status === 'completed') {
      distribution.distributedAt = new Date();
    }

    await this.redis.setex(
      `distribution:${distributionId}`,
      86400,
      JSON.stringify(distribution)
    );

    return distribution;
  }
}

