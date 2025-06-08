// ===============================================
// GAMIFICATION SERVICE - SISTEMA DE GAMIFICAÇÃO
// ===============================================

import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { 
  GamificationData,
  ChestReward,
  ChestRarity,
  SequenceData,
  RankingData,
  AffiliateData,
  GamificationEvent
} from '@/types';
import { AffiliateService } from './affiliate.service';
import { EventService } from './event.service';
import { AuditService } from './audit.service';

export class GamificationService {
  /**
   * Processa sequência diária de indicações
   */
  static async processSequence(affiliateId: string): Promise<SequenceData> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Verificar se já fez indicação hoje
      const todayIndication = await prisma.transaction.findFirst({
        where: {
          customer: {
            referredBy: affiliateId
          },
          createdAt: {
            gte: today,
            lt: tomorrow
          },
          status: 'completed'
        }
      });

      if (!todayIndication) {
        // Quebrar sequência se não fez indicação hoje
        await this.resetSequence(affiliateId);
        return {
          currentStreak: 0,
          lastIndicationDate: null,
          nextReward: null,
          streakBroken: true
        };
      }

      // Buscar sequência atual
      let sequence = await prisma.sequence.findUnique({
        where: { affiliateId }
      });

      if (!sequence) {
        // Criar nova sequência
        sequence = await prisma.sequence.create({
          data: {
            affiliateId,
            currentStreak: 1,
            lastIndicationDate: today,
            totalRewards: 0,
            status: 'active'
          }
        });
      } else {
        // Verificar se é consecutiva
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        const lastDate = new Date(sequence.lastIndicationDate);
        lastDate.setHours(0, 0, 0, 0);

        if (lastDate.getTime() === yesterday.getTime()) {
          // Sequência consecutiva - incrementar
          sequence = await prisma.sequence.update({
            where: { id: sequence.id },
            data: {
              currentStreak: sequence.currentStreak + 1,
              lastIndicationDate: today
            }
          });
        } else if (lastDate.getTime() !== today.getTime()) {
          // Quebrou sequência - resetar
          sequence = await prisma.sequence.update({
            where: { id: sequence.id },
            data: {
              currentStreak: 1,
              lastIndicationDate: today
            }
          });
        }
      }

      // Verificar se ganhou recompensa
      const reward = await this.checkSequenceReward(sequence.currentStreak);
      if (reward) {
        await this.grantSequenceReward(affiliateId, reward);
        
        await prisma.sequence.update({
          where: { id: sequence.id },
          data: {
            totalRewards: sequence.totalRewards + reward.amount
          }
        });
      }

      // Publicar evento
      await EventService.publishSequenceUpdated({
        affiliateId,
        currentStreak: sequence.currentStreak,
        reward: reward,
        timestamp: new Date()
      });

      return {
        currentStreak: sequence.currentStreak,
        lastIndicationDate: sequence.lastIndicationDate,
        nextReward: await this.getNextSequenceReward(sequence.currentStreak + 1),
        streakBroken: false,
        rewardEarned: reward
      };

    } catch (error: any) {
      await AuditService.log({
        action: 'gamification.sequence.error',
        resource: 'sequence',
        resourceId: affiliateId,
        details: {
          error: error.message
        },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Gera baú de recompensa baseado na performance
   */
  static async generateChest(affiliateId: string, trigger: string): Promise<ChestReward> {
    try {
      const affiliate = await AffiliateService.getById(affiliateId);
      if (!affiliate) {
        throw new Error('Afiliado não encontrado');
      }

      // Determinar raridade baseada na categoria
      const rarity = this.determineChestRarity(affiliate.category, trigger);
      
      // Gerar conteúdo do baú
      const content = await this.generateChestContent(rarity, affiliate.category);
      
      // Criar registro do baú
      const chest = await prisma.chest.create({
        data: {
          affiliateId,
          rarity,
          content: content,
          trigger,
          status: 'available',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
        }
      });

      // Publicar evento
      await EventService.publishChestGenerated({
        chestId: chest.id,
        affiliateId,
        rarity,
        trigger,
        timestamp: new Date()
      });

      return {
        id: chest.id,
        rarity,
        content,
        trigger,
        expiresAt: chest.expiresAt
      };

    } catch (error: any) {
      await AuditService.log({
        action: 'gamification.chest.error',
        resource: 'chest',
        resourceId: affiliateId,
        details: {
          error: error.message,
          trigger
        },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Abre baú de recompensa
   */
  static async openChest(chestId: string, affiliateId: string): Promise<ChestReward> {
    try {
      const chest = await prisma.chest.findUnique({
        where: { id: chestId }
      });

      if (!chest) {
        throw new Error('Baú não encontrado');
      }

      if (chest.affiliateId !== affiliateId) {
        throw new Error('Baú não pertence ao afiliado');
      }

      if (chest.status !== 'available') {
        throw new Error('Baú já foi aberto ou expirou');
      }

      if (chest.expiresAt < new Date()) {
        throw new Error('Baú expirado');
      }

      // Marcar como aberto
      await prisma.chest.update({
        where: { id: chestId },
        data: {
          status: 'opened',
          openedAt: new Date()
        }
      });

      // Aplicar recompensas
      await this.applyChestRewards(affiliateId, chest.content);

      // Publicar evento
      await EventService.publishChestOpened({
        chestId,
        affiliateId,
        content: chest.content,
        timestamp: new Date()
      });

      return {
        id: chest.id,
        rarity: chest.rarity,
        content: chest.content,
        trigger: chest.trigger,
        expiresAt: chest.expiresAt
      };

    } catch (error: any) {
      await AuditService.log({
        action: 'gamification.chest.open.error',
        resource: 'chest',
        resourceId: chestId,
        details: {
          error: error.message,
          affiliateId
        },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Atualiza ranking de afiliados
   */
  static async updateRanking(rankingId: string): Promise<RankingData> {
    try {
      const ranking = await prisma.ranking.findUnique({
        where: { id: rankingId },
        include: {
          criteria: true
        }
      });

      if (!ranking) {
        throw new Error('Ranking não encontrado');
      }

      if (ranking.status !== 'active') {
        throw new Error('Ranking não está ativo');
      }

      // Calcular posições baseado nos critérios
      const positions = await this.calculateRankingPositions(ranking);
      
      // Atualizar posições no banco
      await this.updateRankingPositions(rankingId, positions);

      // Verificar se ranking terminou
      if (ranking.endDate <= new Date()) {
        await this.finalizeRanking(rankingId);
      }

      return {
        id: ranking.id,
        name: ranking.name,
        positions: positions,
        status: ranking.status,
        endDate: ranking.endDate
      };

    } catch (error: any) {
      await AuditService.log({
        action: 'gamification.ranking.error',
        resource: 'ranking',
        resourceId: rankingId,
        details: {
          error: error.message
        },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Determina raridade do baú baseada na categoria
   */
  private static determineChestRarity(category: string, trigger: string): ChestRarity {
    const rarityMap: Record<string, ChestRarity> = {
      'jogador': 'common',
      'iniciante': 'common',
      'afiliado': 'rare',
      'profissional': 'rare',
      'expert': 'epic',
      'mestre': 'epic',
      'lenda': 'legendary'
    };

    let baseRarity = rarityMap[category] || 'common';

    // Aumentar raridade para triggers especiais
    if (trigger === 'level_up' || trigger === 'milestone') {
      const rarityUpgrade: Record<ChestRarity, ChestRarity> = {
        'common': 'rare',
        'rare': 'epic',
        'epic': 'legendary',
        'legendary': 'legendary'
      };
      baseRarity = rarityUpgrade[baseRarity];
    }

    return baseRarity;
  }

  /**
   * Gera conteúdo do baú baseado na raridade
   */
  private static async generateChestContent(rarity: ChestRarity, category: string): Promise<any> {
    const contentMap = {
      'common': {
        money: { min: 10, max: 50 },
        bonusMultiplier: { min: 1.1, max: 1.3 },
        items: ['boost_24h', 'extra_indication']
      },
      'rare': {
        money: { min: 50, max: 150 },
        bonusMultiplier: { min: 1.3, max: 1.6 },
        items: ['boost_48h', 'double_commission', 'extra_revshare']
      },
      'epic': {
        money: { min: 150, max: 500 },
        bonusMultiplier: { min: 1.6, max: 2.0 },
        items: ['boost_week', 'triple_commission', 'category_boost']
      },
      'legendary': {
        money: { min: 500, max: 2000 },
        bonusMultiplier: { min: 2.0, max: 3.0 },
        items: ['boost_month', 'mega_commission', 'instant_level_up']
      }
    };

    const config = contentMap[rarity];
    const money = Math.floor(Math.random() * (config.money.max - config.money.min + 1)) + config.money.min;
    const multiplier = Math.random() * (config.bonusMultiplier.max - config.bonusMultiplier.min) + config.bonusMultiplier.min;
    const item = config.items[Math.floor(Math.random() * config.items.length)];

    return {
      money,
      bonusMultiplier: Math.round(multiplier * 100) / 100,
      specialItem: item,
      rarity
    };
  }

  /**
   * Aplica recompensas do baú ao afiliado
   */
  private static async applyChestRewards(affiliateId: string, content: any): Promise<void> {
    // Adicionar dinheiro ao saldo
    if (content.money > 0) {
      await prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          availableBalance: {
            increment: content.money
          }
        }
      });
    }

    // Aplicar item especial (implementar lógica específica)
    if (content.specialItem) {
      await this.applySpecialItem(affiliateId, content.specialItem, content.bonusMultiplier);
    }
  }

  /**
   * Aplica item especial do baú
   */
  private static async applySpecialItem(affiliateId: string, item: string, multiplier: number): Promise<void> {
    const expiresAt = new Date();
    
    switch (item) {
      case 'boost_24h':
        expiresAt.setHours(expiresAt.getHours() + 24);
        break;
      case 'boost_48h':
        expiresAt.setHours(expiresAt.getHours() + 48);
        break;
      case 'boost_week':
        expiresAt.setDate(expiresAt.getDate() + 7);
        break;
      case 'boost_month':
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        break;
    }

    // Criar boost temporário
    await prisma.affiliateBoost.create({
      data: {
        affiliateId,
        type: item,
        multiplier,
        expiresAt,
        isActive: true
      }
    });
  }

  /**
   * Verifica recompensa de sequência
   */
  private static async checkSequenceReward(streak: number): Promise<{ amount: number; type: string } | null> {
    const rewards = {
      3: { amount: 25, type: 'sequence_3' },
      7: { amount: 70, type: 'sequence_7' },
      15: { amount: 150, type: 'sequence_15' },
      30: { amount: 500, type: 'sequence_30' }
    };

    return rewards[streak as keyof typeof rewards] || null;
  }

  /**
   * Concede recompensa de sequência
   */
  private static async grantSequenceReward(affiliateId: string, reward: { amount: number; type: string }): Promise<void> {
    await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        availableBalance: {
          increment: reward.amount
        }
      }
    });

    await AuditService.log({
      action: 'gamification.sequence.reward',
      resource: 'affiliate',
      resourceId: affiliateId,
      details: {
        rewardType: reward.type,
        amount: reward.amount
      },
      severity: 'info'
    });
  }

  /**
   * Obtém próxima recompensa de sequência
   */
  private static async getNextSequenceReward(nextStreak: number): Promise<{ amount: number; type: string } | null> {
    const rewards = [3, 7, 15, 30];
    const nextRewardStreak = rewards.find(r => r > nextStreak);
    
    if (nextRewardStreak) {
      return await this.checkSequenceReward(nextRewardStreak);
    }
    
    return null;
  }

  /**
   * Reseta sequência do afiliado
   */
  private static async resetSequence(affiliateId: string): Promise<void> {
    await prisma.sequence.updateMany({
      where: { affiliateId },
      data: {
        currentStreak: 0,
        lastIndicationDate: null
      }
    });
  }

  /**
   * Calcula posições do ranking
   */
  private static async calculateRankingPositions(ranking: any): Promise<any[]> {
    // Implementar lógica de cálculo baseada nos critérios
    // Por agora, retorna array vazio
    return [];
  }

  /**
   * Atualiza posições do ranking
   */
  private static async updateRankingPositions(rankingId: string, positions: any[]): Promise<void> {
    // Implementar atualização das posições
  }

  /**
   * Finaliza ranking e distribui prêmios
   */
  private static async finalizeRanking(rankingId: string): Promise<void> {
    await prisma.ranking.update({
      where: { id: rankingId },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });
  }
}

