import { DailyProgress } from '../types/gamification';

export class DailyIndicationService {
  private dailyProgresses: Map<string, DailyProgress> = new Map();

  async trackDailyIndication(affiliateId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar para início do dia

    let progress = this.dailyProgresses.get(affiliateId);

    if (!progress || this.shouldResetCycle(progress, today)) {
      // Iniciar novo ciclo
      progress = {
        affiliateId,
        currentDay: 1,
        cycleStartDate: today,
        completedDays: [true, false, false, false, false, false, false],
        nextReward: await this.getDailyReward(1),
        cycleComplete: false,
        lastIndicationDate: today
      };
    } else {
      // Verificar se é o próximo dia consecutivo
      const expectedDay = this.getExpectedDay(progress, today);
      
      if (expectedDay === progress.currentDay + 1) {
        // Próximo dia consecutivo
        progress.currentDay = expectedDay;
        progress.completedDays[expectedDay - 1] = true;
        progress.nextReward = expectedDay < 7 ? await this.getDailyReward(expectedDay + 1) : 0;
        progress.cycleComplete = expectedDay === 7;
        progress.lastIndicationDate = today;
      } else if (expectedDay > progress.currentDay + 1) {
        // Perdeu dias - resetar ciclo
        progress = {
          affiliateId,
          currentDay: 1,
          cycleStartDate: today,
          completedDays: [true, false, false, false, false, false, false],
          nextReward: await this.getDailyReward(1),
          cycleComplete: false,
          lastIndicationDate: today
        };
      }
      // Se expectedDay <= progress.currentDay, já fez indicação hoje
    }

    this.dailyProgresses.set(affiliateId, progress);

    // Processar recompensa
    if (progress.lastIndicationDate?.getTime() === today.getTime()) {
      await this.processReward(affiliateId, progress.currentDay);
    }
  }

  private shouldResetCycle(progress: DailyProgress, today: Date): boolean {
    const daysDiff = Math.floor((today.getTime() - progress.cycleStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Reset se passou mais de 7 dias ou se o ciclo foi completado há mais de 1 dia
    return daysDiff > 7 || (progress.cycleComplete && daysDiff > 0);
  }

  private getExpectedDay(progress: DailyProgress, today: Date): number {
    const daysDiff = Math.floor((today.getTime() - progress.cycleStartDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(daysDiff + 1, 7);
  }

  async calculateDailyReward(day: number): Promise<number> {
    // Buscar configuração do sistema de configurações centralizadas
    const config = await this.getDailyIndicationConfig();
    const dayKey = `day${day}`;
    
    return config[dayKey]?.total || 0;
  }

  async resetCycleOnFailure(affiliateId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newProgress: DailyProgress = {
      affiliateId,
      currentDay: 0,
      cycleStartDate: today,
      completedDays: [false, false, false, false, false, false, false],
      nextReward: await this.getDailyReward(1),
      cycleComplete: false
    };

    this.dailyProgresses.set(affiliateId, newProgress);
  }

  async getDailyProgress(affiliateId: string): Promise<DailyProgress | null> {
    return this.dailyProgresses.get(affiliateId) || null;
  }

  private async getDailyReward(day: number): Promise<number> {
    return await this.calculateDailyReward(day);
  }

  private async processReward(affiliateId: string, day: number): Promise<void> {
    const reward = await this.calculateDailyReward(day);
    
    // Aqui seria integrado com o sistema de pagamentos/carteira
    console.log(`Processing daily reward for affiliate ${affiliateId}: R$ ${reward} for day ${day}`);
    
    // TODO: Integrar com affiliates-service para creditar valor
  }

  private async getDailyIndicationConfig(): Promise<any> {
    // TODO: Integrar com configuration-management-service
    // Por enquanto, retornar configuração padrão
    return {
      day1: { base: 10, bonus: 0, total: 10 },
      day2: { base: 10, bonus: 5, total: 15 },
      day3: { base: 10, bonus: 0, total: 10 },
      day4: { base: 10, bonus: 10, total: 20 },
      day5: { base: 10, bonus: 0, total: 10 },
      day6: { base: 10, bonus: 15, total: 25 },
      day7: { base: 10, bonus: 20, total: 30 }
    };
  }

  async getAllActiveProgresses(): Promise<DailyProgress[]> {
    return Array.from(this.dailyProgresses.values());
  }

  async getProgressByAffiliate(affiliateId: string): Promise<DailyProgress | null> {
    return this.dailyProgresses.get(affiliateId) || null;
  }
}

