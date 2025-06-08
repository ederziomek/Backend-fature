// ===============================================
// SERVIÇO DE DASHBOARD - ADMIN SERVICE
// ===============================================

import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { DashboardMetrics, ChartData, SystemAlert } from '@/types';
import axios from 'axios';
import { adminConfig } from '@/config';

export class DashboardService {
  /**
   * Obtém métricas do dashboard
   */
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      // Verificar cache primeiro
      const cacheKey = 'dashboard:metrics';
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Calcular métricas
      const metrics = await this.calculateMetrics();
      
      // Cache por 5 minutos
      await redis.setex(cacheKey, 300, JSON.stringify(metrics));
      
      return metrics;

    } catch (error: any) {
      console.error('Erro ao obter métricas do dashboard:', error);
      throw error;
    }
  }

  /**
   * Calcula métricas do sistema
   */
  private static async calculateMetrics(): Promise<DashboardMetrics> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Métricas de overview
    const [
      totalUsers,
      totalAffiliates,
      totalCommissions,
      totalRevenue,
      activeUsers,
      pendingApprovals
    ] = await Promise.all([
      this.getTotalUsers(),
      this.getTotalAffiliates(),
      this.getTotalCommissions(),
      this.getTotalRevenue(),
      this.getActiveUsers(),
      this.getPendingApprovals()
    ]);

    // Métricas de crescimento
    const [
      usersGrowth,
      affiliatesGrowth,
      revenueGrowth,
      commissionsGrowth
    ] = await Promise.all([
      this.getUsersGrowth(lastMonth, currentMonth),
      this.getAffiliatesGrowth(lastMonth, currentMonth),
      this.getRevenueGrowth(lastMonth, currentMonth),
      this.getCommissionsGrowth(lastMonth, currentMonth)
    ]);

    // Dados para gráficos
    const [
      userRegistrations,
      affiliatePerformance,
      revenueByMonth,
      commissionsByType
    ] = await Promise.all([
      this.getUserRegistrationsChart(),
      this.getAffiliatePerformanceChart(),
      this.getRevenueByMonthChart(),
      this.getCommissionsByTypeChart()
    ]);

    // Alertas do sistema
    const alerts = await this.getSystemAlerts();

    return {
      overview: {
        totalUsers,
        totalAffiliates,
        totalCommissions,
        totalRevenue,
        activeUsers,
        pendingApprovals
      },
      growth: {
        usersGrowth,
        affiliatesGrowth,
        revenueGrowth,
        commissionsGrowth
      },
      charts: {
        userRegistrations,
        affiliatePerformance,
        revenueByMonth,
        commissionsByType
      },
      alerts
    };
  }

  /**
   * Obtém total de usuários
   */
  private static async getTotalUsers(): Promise<number> {
    try {
      // Chamar Auth Service
      const response = await axios.get(`${adminConfig.services.auth}/api/v1/users/count`);
      return response.data.data.count || 0;
    } catch (error) {
      console.error('Erro ao obter total de usuários:', error);
      return 0;
    }
  }

  /**
   * Obtém total de afiliados
   */
  private static async getTotalAffiliates(): Promise<number> {
    try {
      // Chamar Affiliate Service
      const response = await axios.get(`${adminConfig.services.affiliate}/api/v1/affiliates/count`);
      return response.data.data.count || 0;
    } catch (error) {
      console.error('Erro ao obter total de afiliados:', error);
      return 0;
    }
  }

  /**
   * Obtém total de comissões
   */
  private static async getTotalCommissions(): Promise<number> {
    try {
      // Chamar Affiliate Service
      const response = await axios.get(`${adminConfig.services.affiliate}/api/v1/commissions/total`);
      return response.data.data.total || 0;
    } catch (error) {
      console.error('Erro ao obter total de comissões:', error);
      return 0;
    }
  }

  /**
   * Obtém receita total
   */
  private static async getTotalRevenue(): Promise<number> {
    try {
      // Chamar Data Service
      const response = await axios.get(`${adminConfig.services.data}/api/v1/revenue/total`);
      return response.data.data.revenue || 0;
    } catch (error) {
      console.error('Erro ao obter receita total:', error);
      return 0;
    }
  }

  /**
   * Obtém usuários ativos (últimos 30 dias)
   */
  private static async getActiveUsers(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const response = await axios.get(`${adminConfig.services.auth}/api/v1/users/active`, {
        params: { since: thirtyDaysAgo.toISOString() }
      });
      return response.data.data.count || 0;
    } catch (error) {
      console.error('Erro ao obter usuários ativos:', error);
      return 0;
    }
  }

  /**
   * Obtém aprovações pendentes
   */
  private static async getPendingApprovals(): Promise<number> {
    try {
      const response = await axios.get(`${adminConfig.services.affiliate}/api/v1/commissions/pending`);
      return response.data.data.count || 0;
    } catch (error) {
      console.error('Erro ao obter aprovações pendentes:', error);
      return 0;
    }
  }

  /**
   * Calcula crescimento de usuários
   */
  private static async getUsersGrowth(lastMonth: Date, currentMonth: Date): Promise<number> {
    try {
      const [lastMonthCount, currentMonthCount] = await Promise.all([
        axios.get(`${adminConfig.services.auth}/api/v1/users/count`, {
          params: { 
            dateFrom: lastMonth.toISOString(),
            dateTo: currentMonth.toISOString()
          }
        }),
        axios.get(`${adminConfig.services.auth}/api/v1/users/count`, {
          params: { 
            dateFrom: currentMonth.toISOString()
          }
        })
      ]);

      const last = lastMonthCount.data.data.count || 0;
      const current = currentMonthCount.data.data.count || 0;

      if (last === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - last) / last) * 100);
    } catch (error) {
      console.error('Erro ao calcular crescimento de usuários:', error);
      return 0;
    }
  }

  /**
   * Calcula crescimento de afiliados
   */
  private static async getAffiliatesGrowth(lastMonth: Date, currentMonth: Date): Promise<number> {
    try {
      const [lastMonthCount, currentMonthCount] = await Promise.all([
        axios.get(`${adminConfig.services.affiliate}/api/v1/affiliates/count`, {
          params: { 
            dateFrom: lastMonth.toISOString(),
            dateTo: currentMonth.toISOString()
          }
        }),
        axios.get(`${adminConfig.services.affiliate}/api/v1/affiliates/count`, {
          params: { 
            dateFrom: currentMonth.toISOString()
          }
        })
      ]);

      const last = lastMonthCount.data.data.count || 0;
      const current = currentMonthCount.data.data.count || 0;

      if (last === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - last) / last) * 100);
    } catch (error) {
      console.error('Erro ao calcular crescimento de afiliados:', error);
      return 0;
    }
  }

  /**
   * Calcula crescimento de receita
   */
  private static async getRevenueGrowth(lastMonth: Date, currentMonth: Date): Promise<number> {
    try {
      const [lastMonthRevenue, currentMonthRevenue] = await Promise.all([
        axios.get(`${adminConfig.services.data}/api/v1/revenue/period`, {
          params: { 
            dateFrom: lastMonth.toISOString(),
            dateTo: currentMonth.toISOString()
          }
        }),
        axios.get(`${adminConfig.services.data}/api/v1/revenue/period`, {
          params: { 
            dateFrom: currentMonth.toISOString()
          }
        })
      ]);

      const last = lastMonthRevenue.data.data.revenue || 0;
      const current = currentMonthRevenue.data.data.revenue || 0;

      if (last === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - last) / last) * 100);
    } catch (error) {
      console.error('Erro ao calcular crescimento de receita:', error);
      return 0;
    }
  }

  /**
   * Calcula crescimento de comissões
   */
  private static async getCommissionsGrowth(lastMonth: Date, currentMonth: Date): Promise<number> {
    try {
      const [lastMonthCommissions, currentMonthCommissions] = await Promise.all([
        axios.get(`${adminConfig.services.affiliate}/api/v1/commissions/total`, {
          params: { 
            dateFrom: lastMonth.toISOString(),
            dateTo: currentMonth.toISOString()
          }
        }),
        axios.get(`${adminConfig.services.affiliate}/api/v1/commissions/total`, {
          params: { 
            dateFrom: currentMonth.toISOString()
          }
        })
      ]);

      const last = lastMonthCommissions.data.data.total || 0;
      const current = currentMonthCommissions.data.data.total || 0;

      if (last === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - last) / last) * 100);
    } catch (error) {
      console.error('Erro ao calcular crescimento de comissões:', error);
      return 0;
    }
  }

  /**
   * Obtém dados para gráfico de registros de usuários
   */
  private static async getUserRegistrationsChart(): Promise<ChartData[]> {
    try {
      const response = await axios.get(`${adminConfig.services.auth}/api/v1/users/registrations-chart`);
      return response.data.data.chart || [];
    } catch (error) {
      console.error('Erro ao obter gráfico de registros:', error);
      return [];
    }
  }

  /**
   * Obtém dados para gráfico de performance de afiliados
   */
  private static async getAffiliatePerformanceChart(): Promise<ChartData[]> {
    try {
      const response = await axios.get(`${adminConfig.services.affiliate}/api/v1/affiliates/performance-chart`);
      return response.data.data.chart || [];
    } catch (error) {
      console.error('Erro ao obter gráfico de performance:', error);
      return [];
    }
  }

  /**
   * Obtém dados para gráfico de receita por mês
   */
  private static async getRevenueByMonthChart(): Promise<ChartData[]> {
    try {
      const response = await axios.get(`${adminConfig.services.data}/api/v1/revenue/monthly-chart`);
      return response.data.data.chart || [];
    } catch (error) {
      console.error('Erro ao obter gráfico de receita:', error);
      return [];
    }
  }

  /**
   * Obtém dados para gráfico de comissões por tipo
   */
  private static async getCommissionsByTypeChart(): Promise<ChartData[]> {
    try {
      const response = await axios.get(`${adminConfig.services.affiliate}/api/v1/commissions/type-chart`);
      return response.data.data.chart || [];
    } catch (error) {
      console.error('Erro ao obter gráfico de comissões:', error);
      return [];
    }
  }

  /**
   * Obtém alertas do sistema
   */
  private static async getSystemAlerts(): Promise<SystemAlert[]> {
    try {
      // Buscar alertas do banco local
      const alerts = await prisma.systemAlert.findMany({
        where: {
          isRead: false
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });

      return alerts.map(alert => ({
        id: alert.id,
        type: alert.type as any,
        title: alert.title,
        message: alert.message,
        createdAt: alert.createdAt,
        isRead: alert.isRead,
        actionUrl: alert.actionUrl
      }));
    } catch (error) {
      console.error('Erro ao obter alertas do sistema:', error);
      return [];
    }
  }

  /**
   * Limpa cache do dashboard
   */
  static async clearCache(): Promise<void> {
    try {
      await redis.del('dashboard:metrics');
      console.log('Cache do dashboard limpo');
    } catch (error) {
      console.error('Erro ao limpar cache do dashboard:', error);
    }
  }

  /**
   * Força atualização das métricas
   */
  static async refreshMetrics(): Promise<DashboardMetrics> {
    try {
      await this.clearCache();
      return await this.getDashboardMetrics();
    } catch (error) {
      console.error('Erro ao atualizar métricas:', error);
      throw error;
    }
  }
}

