import { ConfigurationClient } from '../../shared/configurationClient';

export class NotificationService {
  private configClient: ConfigurationClient;

  constructor() {
    this.configClient = new ConfigurationClient();
  }

  async sendCategoryProgressionNotification(affiliateId: string, oldCategory: string, newCategory: string, bonification: number): Promise<void> {
    const systemConfig = await this.configClient.getSystemConfig();
    
    const notification = {
      type: 'category_progression',
      affiliateId,
      title: 'Parabéns! Você subiu de categoria!',
      message: `Você progrediu de ${oldCategory} para ${newCategory} e recebeu R$ ${bonification} de bonificação!`,
      data: {
        oldCategory,
        newCategory,
        bonification
      },
      timestamp: new Date(),
      timezone: systemConfig.timezone || 'America/Sao_Paulo'
    };

    await this.sendNotification(notification);
  }

  async sendDailyIndicationReward(affiliateId: string, day: number, reward: number): Promise<void> {
    const notification = {
      type: 'daily_indication_reward',
      affiliateId,
      title: `Indicação Diária - Dia ${day}`,
      message: `Parabéns! Você recebeu R$ ${reward} pela sua indicação diária consecutiva!`,
      data: {
        day,
        reward,
        cycleDay: day
      },
      timestamp: new Date()
    };

    await this.sendNotification(notification);
  }

  async sendChestReward(affiliateId: string, chestType: string, reward: number): Promise<void> {
    const chestNames = {
      silver: 'Prata',
      gold: 'Ouro',
      sapphire: 'Safira',
      diamond: 'Diamante'
    };

    const notification = {
      type: 'chest_reward',
      affiliateId,
      title: `Baú ${chestNames[chestType]} Conquistado!`,
      message: `Você atingiu sua meta semanal e ganhou R$ ${reward} do baú ${chestNames[chestType]}!`,
      data: {
        chestType,
        reward,
        chestName: chestNames[chestType]
      },
      timestamp: new Date()
    };

    await this.sendNotification(notification);
  }

  async sendRankingReward(affiliateId: string, rankingType: string, position: number, reward: number): Promise<void> {
    const rankingNames = {
      individual_indications: 'Indicações Individuais',
      network_indications: 'Indicações da Rede'
    };

    const notification = {
      type: 'ranking_reward',
      affiliateId,
      title: `Posição no Ranking: ${position}º lugar`,
      message: `Você ficou em ${position}º lugar no ranking de ${rankingNames[rankingType]} e ganhou R$ ${reward}!`,
      data: {
        rankingType,
        position,
        reward,
        rankingName: rankingNames[rankingType]
      },
      timestamp: new Date()
    };

    await this.sendNotification(notification);
  }

  async sendVaultDistribution(affiliateId: string, amount: number): Promise<void> {
    const vaultConfig = await this.configClient.getVaultConfig();
    
    const notification = {
      type: 'vault_distribution',
      affiliateId,
      title: 'Cofre de Comissões Aberto!',
      message: `Suas comissões RevShare foram distribuídas: R$ ${amount}`,
      data: {
        amount,
        frequency: vaultConfig.schedule.frequency,
        distributionDate: new Date()
      },
      timestamp: new Date()
    };

    await this.sendNotification(notification);
  }

  async sendFraudAlert(affiliateId: string, reason: string, action: string): Promise<void> {
    const notification = {
      type: 'fraud_alert',
      affiliateId,
      title: 'Alerta de Segurança',
      message: `Detectamos atividade suspeita em sua conta: ${reason}. Ação tomada: ${action}`,
      data: {
        reason,
        action,
        alertLevel: 'high'
      },
      timestamp: new Date()
    };

    await this.sendNotification(notification);
  }

  async sendInactivityWarning(affiliateId: string, reductionPercentage: number, daysInactive: number): Promise<void> {
    const securityConfig = await this.configClient.getSecurityConfig();
    const affiliateCategory = await this.getAffiliateCategory(affiliateId);
    const reactivationRequired = securityConfig.inactivityReduction.reactivation[affiliateCategory] || 1;

    const notification = {
      type: 'inactivity_warning',
      affiliateId,
      title: 'Aviso de Inatividade',
      message: `Suas comissões RevShare foram reduzidas em ${reductionPercentage}% devido à inatividade de ${daysInactive} dias. Faça ${reactivationRequired} indicações para reativar.`,
      data: {
        reductionPercentage,
        daysInactive,
        reactivationRequired
      },
      timestamp: new Date()
    };

    await this.sendNotification(notification);
  }

  async sendWeeklyGoalsGenerated(affiliateId: string, goals: any): Promise<void> {
    const notification = {
      type: 'weekly_goals_generated',
      affiliateId,
      title: 'Novas Metas Semanais!',
      message: `Suas metas personalizadas da semana foram geradas. Prata: ${goals.silver}, Ouro: ${goals.gold}, Safira: ${goals.sapphire}, Diamante: ${goals.diamond}`,
      data: {
        goals,
        weekStart: new Date()
      },
      timestamp: new Date()
    };

    await this.sendNotification(notification);
  }

  private async sendNotification(notification: any): Promise<void> {
    // Implementar envio real baseado nas preferências do usuário
    console.log(`Sending notification to ${notification.affiliateId}:`, notification);
    
    // TODO: Implementar envio por diferentes canais
    // - Email
    // - SMS  
    // - Push notification
    // - In-app notification
    
    // Remover WhatsApp conforme especificação
  }

  private async getAffiliateCategory(affiliateId: string): Promise<string> {
    // TODO: Integrar com affiliates-service
    return 'afiliado';
  }

  async updateConfiguration(): Promise<void> {
    this.configClient.invalidateCache();
    console.log('Notification service configuration updated');
  }
}

