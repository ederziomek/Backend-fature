// ===============================================
// CONTROLADOR DE DASHBOARD - ADMIN SERVICE
// ===============================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from '@/services/dashboard.service';
import { ApiResponse } from '@/types';

export class DashboardController {
  /**
   * Obtém métricas do dashboard
   */
  static async getDashboardMetrics(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const metrics = await DashboardService.getDashboardMetrics();

      return reply.status(200).send({
        success: true,
        data: metrics,
        message: 'Métricas do dashboard obtidas com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message,
        statusCode: 500
      });
    }
  }

  /**
   * Atualiza métricas do dashboard
   */
  static async refreshDashboard(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const metrics = await DashboardService.refreshMetrics();

      return reply.status(200).send({
        success: true,
        data: metrics,
        message: 'Dashboard atualizado com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message,
        statusCode: 500
      });
    }
  }

  /**
   * Limpa cache do dashboard
   */
  static async clearCache(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      await DashboardService.clearCache();

      return reply.status(200).send({
        success: true,
        message: 'Cache do dashboard limpo com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message,
        statusCode: 500
      });
    }
  }
}

