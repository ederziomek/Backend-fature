import { WeeklyGoals, ChestGoal, ChestReward, PersonalizedGoals } from '../types/gamification';
import { PotentialAnalysisService } from '../algorithms/potentialAnalysisService';

export class ChestService {
  private weeklyGoals: Map<string, WeeklyGoals> = new Map();
  private potentialAnalysis: PotentialAnalysisService;

  constructor() {
    this.potentialAnalysis = new PotentialAnalysisService();
  }

  async generateWeeklyGoals(affiliateId: string): Promise<WeeklyGoals> {
    const weekStartDate = this.getWeekStartDate();
    const weekKey = `${affiliateId}_${weekStartDate.toISOString().split('T')[0]}`;

    // Verificar se já existem metas para esta semana
    let existingGoals = this.weeklyGoals.get(weekKey);
    if (existingGoals) {
      return existingGoals;
    }

    // Gerar novas metas personalizadas
    const personalizedGoals = await this.potentialAnalysis.calculatePersonalizedGoals(affiliateId);
    
    const weeklyGoals: WeeklyGoals = {
      affiliateId,
      weekStartDate,
      silver: {
        goal: personalizedGoals.goals.silver,
        reward: personalizedGoals.rewards.silver,
        completed: false
      },
      gold: {
        goal: personalizedGoals.goals.gold,
        reward: personalizedGoals.rewards.gold,
        completed: false
      },
      sapphire: {
        goal: personalizedGoals.goals.sapphire,
        reward: personalizedGoals.rewards.sapphire,
        completed: false
      },
      diamond: {
        goal: personalizedGoals.goals.diamond,
        reward: personalizedGoals.rewards.diamond,
        completed: false
      },
      resetDate: this.getWeekEndDate(weekStartDate),
      createdAt: new Date()
    };

    this.weeklyGoals.set(weekKey, weeklyGoals);
    return weeklyGoals;
  }

  async calculateGoalDifficulty(affiliateId: string, chestType: string): Promise<number> {
    const analysis = await this.potentialAnalysis.analyzeAffiliatePotential(affiliateId);
    
    // Retornar taxa de sucesso baseada no tipo de baú e análise
    switch (chestType) {
      case 'silver':
        return analysis.confidenceLevel * 0.75; // 75% da confiança
      case 'gold':
        return analysis.confidenceLevel * 0.45; // 45% da confiança
      case 'sapphire':
        return analysis.confidenceLevel * 0.20; // 20% da confiança
      case 'diamond':
        return analysis.confidenceLevel * 0.08; // 8% da confiança
      default:
        return 0.1;
    }
  }

  async openChest(affiliateId: string, chestType: 'silver' | 'gold' | 'sapphire' | 'diamond'): Promise<ChestReward | null> {
    const weekStartDate = this.getWeekStartDate();
    const weekKey = `${affiliateId}_${weekStartDate.toISOString().split('T')[0]}`;
    
    const weeklyGoals = this.weeklyGoals.get(weekKey);
    if (!weeklyGoals) {
      throw new Error('No weekly goals found for affiliate');
    }

    const chestGoal = weeklyGoals[chestType];
    if (!chestGoal.completed) {
      throw new Error(`${chestType} chest goal not completed yet`);
    }

    // Verificar se já foi aberto
    if (chestGoal.completedAt) {
      throw new Error(`${chestType} chest already opened`);
    }

    // Marcar como aberto
    chestGoal.completedAt = new Date();
    this.weeklyGoals.set(weekKey, weeklyGoals);

    // Criar recompensa
    const reward: ChestReward = {
      chestType,
      amount: chestGoal.reward,
      affiliateId,
      goalAchieved: chestGoal.goal,
      rewardedAt: new Date()
    };

    // Processar pagamento
    await this.processChestReward(reward);

    return reward;
  }

  async updateProgress(affiliateId: string, indicationsCount: number): Promise<void> {
    const weekStartDate = this.getWeekStartDate();
    const weekKey = `${affiliateId}_${weekStartDate.toISOString().split('T')[0]}`;
    
    let weeklyGoals = this.weeklyGoals.get(weekKey);
    if (!weeklyGoals) {
      weeklyGoals = await this.generateWeeklyGoals(affiliateId);
    }

    // Atualizar status de conclusão dos baús
    this.updateChestCompletion(weeklyGoals.silver, indicationsCount);
    this.updateChestCompletion(weeklyGoals.gold, indicationsCount);
    this.updateChestCompletion(weeklyGoals.sapphire, indicationsCount);
    this.updateChestCompletion(weeklyGoals.diamond, indicationsCount);

    this.weeklyGoals.set(weekKey, weeklyGoals);
  }

  private updateChestCompletion(chest: ChestGoal, currentCount: number): void {
    if (!chest.completed && currentCount >= chest.goal) {
      chest.completed = true;
    }
  }

  async resetWeeklyGoals(): Promise<void> {
    const now = new Date();
    const keysToRemove: string[] = [];

    // Identificar metas antigas para remoção
    for (const [key, goals] of this.weeklyGoals.entries()) {
      if (goals.resetDate < now) {
        keysToRemove.push(key);
      }
    }

    // Remover metas antigas
    keysToRemove.forEach(key => this.weeklyGoals.delete(key));

    console.log(`Reset ${keysToRemove.length} expired weekly goals`);
  }

  async getWeeklyGoals(affiliateId: string): Promise<WeeklyGoals | null> {
    const weekStartDate = this.getWeekStartDate();
    const weekKey = `${affiliateId}_${weekStartDate.toISOString().split('T')[0]}`;
    
    return this.weeklyGoals.get(weekKey) || null;
  }

  async getChestHistory(affiliateId: string, weeks: number = 4): Promise<ChestReward[]> {
    const rewards: ChestReward[] = [];
    
    // Buscar recompensas das últimas semanas
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekStartDate = this.getWeekStartDate(weekStart);
      const weekKey = `${affiliateId}_${weekStartDate.toISOString().split('T')[0]}`;
      
      const weeklyGoals = this.weeklyGoals.get(weekKey);
      if (weeklyGoals) {
        // Adicionar recompensas desta semana
        if (weeklyGoals.silver.completedAt) {
          rewards.push({
            chestType: 'silver',
            amount: weeklyGoals.silver.reward,
            affiliateId,
            goalAchieved: weeklyGoals.silver.goal,
            rewardedAt: weeklyGoals.silver.completedAt
          });
        }
        // Repetir para outros tipos de baú...
      }
    }

    return rewards.sort((a, b) => b.rewardedAt.getTime() - a.rewardedAt.getTime());
  }

  private async processChestReward(reward: ChestReward): Promise<void> {
    // Integração com sistema de pagamentos
    console.log(`Processing chest reward: ${reward.chestType} - R$ ${reward.amount} for affiliate ${reward.affiliateId}`);
    
    // TODO: Integrar com affiliates-service para creditar valor
  }

  private getWeekStartDate(date?: Date): Date {
    const now = date || new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Segunda-feira
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private getWeekEndDate(weekStart: Date): Date {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Domingo
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  async getAllActiveGoals(): Promise<WeeklyGoals[]> {
    const now = new Date();
    return Array.from(this.weeklyGoals.values())
      .filter(goals => goals.resetDate > now);
  }

  async getGoalsByAffiliate(affiliateId: string): Promise<WeeklyGoals | null> {
    return await this.getWeeklyGoals(affiliateId);
  }
}

