import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@/config/database';

export class AffiliatesController {
  /**
   * Retorna dados do afiliado autenticado
   */
  static async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).sub;

      // Buscar dados do afiliado
      const affiliate = await prisma.affiliate.findFirst({
        where: { userId }
      });

      if (!affiliate) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'AFFILIATE_NOT_FOUND',
            message: 'Afiliado não encontrado'
          }
        });
      }

      return reply.send({
        success: true,
        data: {
          id: affiliate.id,
          referralCode: affiliate.referralCode,
          category: affiliate.category,
          level: affiliate.level,
          status: affiliate.status,
          joinedAt: affiliate.createdAt
        }
      });

    } catch (error) {
      request.log.error('Erro ao buscar dados do afiliado:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  }

  /**
   * Retorna rede de afiliados do usuário
   */
  static async getNetwork(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).sub;

      // Buscar afiliado atual
      const currentAffiliate = await prisma.affiliate.findFirst({
        where: { userId }
      });

      if (!currentAffiliate) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'AFFILIATE_NOT_FOUND',
            message: 'Afiliado não encontrado'
          }
        });
      }

      // Buscar afiliados diretos
      const directAffiliates = await prisma.affiliate.findMany({
        where: { parentId: currentAffiliate.id },
        take: 10
      });

      return reply.send({
        success: true,
        data: {
          network: directAffiliates.map(affiliate => ({
            id: affiliate.id,
            referralCode: affiliate.referralCode,
            status: affiliate.status,
            joinedAt: affiliate.createdAt
          })),
          summary: {
            totalAffiliates: directAffiliates.length,
            activeAffiliates: directAffiliates.filter(a => a.status === 'active').length
          }
        }
      });

    } catch (error) {
      request.log.error('Erro ao buscar rede de afiliados:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  }

  /**
   * Retorna comissões do afiliado
   */
  static async getCommissions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      // Buscar comissões do afiliado
      const commissions = await prisma.commission.findMany({
        where: { affiliateId: id },
        take: 10
      });

      return reply.send({
        success: true,
        data: {
          commissions: commissions.map(commission => ({
            id: commission.id,
            amount: Number(commission.amount),
            level: commission.level,
            status: commission.status,
            calculatedAt: commission.createdAt
          })),
          summary: {
            totalAmount: commissions.reduce((sum, c) => sum + Number(c.amount), 0),
            count: commissions.length
          }
        }
      });

    } catch (error) {
      request.log.error('Erro ao buscar comissões do afiliado:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  }

  /**
   * Atualiza dados do afiliado
   */
  static async updateAffiliate(request: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.send({
        success: true,
        message: 'Endpoint em desenvolvimento'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  }
}

