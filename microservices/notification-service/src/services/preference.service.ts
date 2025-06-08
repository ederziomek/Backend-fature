import { PrismaClient } from '@prisma/client';
import { NotificationCache } from '@/config/redis';
import {
  NotificationPreference,
  NotificationCategory,
  UpdatePreferencesRequest,
} from '@/types';

export class PreferenceService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Busca preferências do usuário
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference> {
    // Tentar buscar do cache primeiro
    const cached = await NotificationCache.getPreferences(userId);
    if (cached) {
      return JSON.parse(cached);
    }

    // Buscar do banco ou criar padrão
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Criar preferências padrão
      preferences = await this.createDefaultPreferences(userId);
    }

    // Salvar no cache
    await NotificationCache.setPreferences(
      userId,
      JSON.stringify(preferences),
      1800 // 30 minutos
    );

    return preferences;
  }

  /**
   * Atualiza preferências do usuário
   */
  async updateUserPreferences(
    userId: string,
    updates: UpdatePreferencesRequest
  ): Promise<NotificationPreference> {
    // Buscar preferências existentes ou criar
    let existingPreferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!existingPreferences) {
      existingPreferences = await this.createDefaultPreferences(userId);
    }

    // Atualizar preferências
    const updatedPreferences = await this.prisma.notificationPreference.update({
      where: { userId },
      data: {
        email: updates.email !== undefined ? updates.email : existingPreferences.email,
        sms: updates.sms !== undefined ? updates.sms : existingPreferences.sms,
        push: updates.push !== undefined ? updates.push : existingPreferences.push,
        categories: updates.categories !== undefined ? updates.categories : existingPreferences.categories,
      },
    });

    // Limpar cache
    await NotificationCache.deletePreferences(userId);

    return updatedPreferences;
  }

  /**
   * Cria preferências padrão para um usuário
   */
  async createDefaultPreferences(userId: string): Promise<NotificationPreference> {
    const defaultCategories = [
      NotificationCategory.WELCOME,
      NotificationCategory.CPA_COMMISSION,
      NotificationCategory.REVSHARE_COMMISSION,
      NotificationCategory.LEVEL_UP,
      NotificationCategory.SECURITY_ALERT,
    ];

    return await this.prisma.notificationPreference.create({
      data: {
        userId,
        email: true,
        sms: false,
        push: true,
        categories: defaultCategories,
      },
    });
  }

  /**
   * Desabilita todas as notificações para um usuário
   */
  async disableAllNotifications(userId: string): Promise<NotificationPreference> {
    const preferences = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        email: false,
        sms: false,
        push: false,
        categories: [],
      },
      create: {
        userId,
        email: false,
        sms: false,
        push: false,
        categories: [],
      },
    });

    // Limpar cache
    await NotificationCache.deletePreferences(userId);

    return preferences;
  }

  /**
   * Habilita todas as notificações para um usuário
   */
  async enableAllNotifications(userId: string): Promise<NotificationPreference> {
    const allCategories = Object.values(NotificationCategory);

    const preferences = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        email: true,
        sms: true,
        push: true,
        categories: allCategories,
      },
      create: {
        userId,
        email: true,
        sms: true,
        push: true,
        categories: allCategories,
      },
    });

    // Limpar cache
    await NotificationCache.deletePreferences(userId);

    return preferences;
  }

  /**
   * Adiciona uma categoria às preferências do usuário
   */
  async addCategoryPreference(
    userId: string,
    category: NotificationCategory
  ): Promise<NotificationPreference> {
    const preferences = await this.getUserPreferences(userId);
    
    if (!preferences.categories.includes(category)) {
      const updatedCategories = [...preferences.categories, category];
      
      return await this.updateUserPreferences(userId, {
        categories: updatedCategories,
      });
    }

    return preferences;
  }

  /**
   * Remove uma categoria das preferências do usuário
   */
  async removeCategoryPreference(
    userId: string,
    category: NotificationCategory
  ): Promise<NotificationPreference> {
    const preferences = await this.getUserPreferences(userId);
    
    const updatedCategories = preferences.categories.filter(cat => cat !== category);
    
    return await this.updateUserPreferences(userId, {
      categories: updatedCategories,
    });
  }

  /**
   * Verifica se o usuário aceita um tipo específico de notificação
   */
  async canSendNotification(
    userId: string,
    type: 'email' | 'sms' | 'push',
    category: NotificationCategory
  ): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);
    
    // Verificar se o tipo está habilitado
    if (!preferences[type]) {
      return false;
    }

    // Verificar se a categoria está habilitada
    if (preferences.categories.length > 0 && !preferences.categories.includes(category)) {
      return false;
    }

    return true;
  }

  /**
   * Lista usuários que aceitam um tipo específico de notificação
   */
  async getUsersWithPreference(
    type: 'email' | 'sms' | 'push',
    category?: NotificationCategory,
    limit: number = 1000,
    offset: number = 0
  ): Promise<string[]> {
    const where: any = {
      [type]: true,
    };

    if (category) {
      where.categories = {
        has: category,
      };
    }

    const preferences = await this.prisma.notificationPreference.findMany({
      where,
      select: { userId: true },
      take: limit,
      skip: offset,
    });

    return preferences.map(p => p.userId);
  }

  /**
   * Busca estatísticas de preferências
   */
  async getPreferencesStats(): Promise<{
    totalUsers: number;
    emailEnabled: number;
    smsEnabled: number;
    pushEnabled: number;
    categoriesStats: Record<NotificationCategory, number>;
  }> {
    const [
      totalUsers,
      emailEnabled,
      smsEnabled,
      pushEnabled,
      allPreferences,
    ] = await Promise.all([
      this.prisma.notificationPreference.count(),
      this.prisma.notificationPreference.count({ where: { email: true } }),
      this.prisma.notificationPreference.count({ where: { sms: true } }),
      this.prisma.notificationPreference.count({ where: { push: true } }),
      this.prisma.notificationPreference.findMany({
        select: { categories: true },
      }),
    ]);

    // Contar categorias
    const categoriesStats: Record<NotificationCategory, number> = {} as any;
    
    Object.values(NotificationCategory).forEach(category => {
      categoriesStats[category] = 0;
    });

    allPreferences.forEach(pref => {
      pref.categories.forEach(category => {
        if (categoriesStats[category] !== undefined) {
          categoriesStats[category]++;
        }
      });
    });

    return {
      totalUsers,
      emailEnabled,
      smsEnabled,
      pushEnabled,
      categoriesStats,
    };
  }

  /**
   * Exporta preferências de um usuário
   */
  async exportUserPreferences(userId: string): Promise<{
    userId: string;
    preferences: NotificationPreference;
    exportedAt: Date;
  }> {
    const preferences = await this.getUserPreferences(userId);
    
    return {
      userId,
      preferences,
      exportedAt: new Date(),
    };
  }

  /**
   * Importa preferências para um usuário
   */
  async importUserPreferences(
    userId: string,
    preferencesData: Partial<UpdatePreferencesRequest>
  ): Promise<NotificationPreference> {
    // Validar dados de entrada
    if (preferencesData.categories) {
      const validCategories = Object.values(NotificationCategory);
      const invalidCategories = preferencesData.categories.filter(
        cat => !validCategories.includes(cat)
      );
      
      if (invalidCategories.length > 0) {
        throw new Error(`Categorias inválidas: ${invalidCategories.join(', ')}`);
      }
    }

    return await this.updateUserPreferences(userId, preferencesData);
  }

  /**
   * Migra preferências antigas para novo formato (se necessário)
   */
  async migratePreferences(): Promise<void> {
    // Esta função pode ser usada para migrar dados quando o schema mudar
    console.log('Iniciando migração de preferências...');
    
    // Buscar usuários sem preferências definidas
    // e criar preferências padrão para eles
    
    // Implementar lógica de migração conforme necessário
    
    console.log('Migração de preferências concluída');
  }

  /**
   * Limpa cache de preferências de um usuário
   */
  async clearUserPreferencesCache(userId: string): Promise<void> {
    await NotificationCache.deletePreferences(userId);
  }

  /**
   * Limpa cache de preferências de múltiplos usuários
   */
  async clearMultipleUsersPreferencesCache(userIds: string[]): Promise<void> {
    await Promise.all(
      userIds.map(userId => NotificationCache.deletePreferences(userId))
    );
  }
}

