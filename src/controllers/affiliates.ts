// @ts-nocheck
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@/config/database';
import { CommissionService } from '@/services/commission';

export class AffiliatesController {
  /**
   * Retorna dados do afiliado autenticado
   */
  static async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      // Buscar dados do afiliado
      const affiliate = await prisma.affiliate.findFirst({
        where: { userId },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
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

      // Calcular categoria e level baseado em referrals validados
      const categoryInfo = CommissionService.calculateCategoryAndLevel(affiliate.validatedReferrals);

      // Calcular próximo level
      const nextLevelInfo = CommissionService.getRevShareConfig(affiliate.validatedReferrals + 1);
      const nextCategoryInfo = CommissionService.calculateCategoryAndLevel(nextLevelInfo.minReferrals);

      return reply.send({
        success: true,
        data: {
          id: affiliate.id,
          referralCode: affiliate.referralCode,
          status: affiliate.status,
          joinedAt: affiliate.createdAt,
          totalReferrals: affiliate.totalReferrals,
          validatedReferrals: affiliate.validatedReferrals,
          activeReferrals: affiliate.activeReferrals,
          lifetimeVolume: Number(affiliate.lifetimeVolume),
          lifetimeCommissions: Number(affiliate.lifetimeCommissions),
          currentMonthVolume: Number(affiliate.currentMonthVolume),
          currentMonthCommissions: Number(affiliate.currentMonthCommissions),
          negativeCarryover: Number(affiliate.negativeCarryover),
          currentCategory: {
            category: categoryInfo.category,
            level: categoryInfo.level,
            revTotal: categoryInfo.revTotal,
            revLevel1: categoryInfo.revLevel1,
            revLevels2to5: categoryInfo.revLevels2to5,
            minReferrals: CommissionService.getRevShareConfig(affiliate.validatedReferrals).minReferrals,
            maxReferrals: CommissionService.getRevShareConfig(affiliate.validatedReferrals).maxReferrals
          },
          nextLevel: {
            category: nextCategoryInfo.category,
            level: nextCategoryInfo.level,
            revLevel1: nextCategoryInfo.revLevel1,
            referralsNeeded: nextLevelInfo.minReferrals - affiliate.validatedReferrals
          },
          user: affiliate.user
        }
      });

    } catch (error) {
      console.error('Erro ao buscar dados do afiliado:', error);
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
   * Retorna informações de categorias disponíveis
   */
  static async getCategories(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      // Buscar afiliado atual
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

      const currentCategoryInfo = CommissionService.calculateCategoryAndLevel(affiliate.validatedReferrals);

      // Estrutura resumida das categorias para o frontend
      const categories = [
        {
          name: 'Jogador',
          levels: 2,
          maxRevLevel1: 6.00,
          maxReferrals: 10,
          isCurrent: currentCategoryInfo.category === 'jogador'
        },
        {
          name: 'Iniciante',
          levels: 2,
          maxRevLevel1: 12.00,
          maxReferrals: 30,
          isCurrent: currentCategoryInfo.category === 'iniciante'
        },
        {
          name: 'Afiliado',
          levels: 7,
          maxRevLevel1: 18.00,
          maxReferrals: 100,
          isCurrent: currentCategoryInfo.category === 'afiliado'
        },
        {
          name: 'Profissional',
          levels: 30,
          maxRevLevel1: 24.00,
          maxReferrals: 1000,
          isCurrent: currentCategoryInfo.category === 'profissional'
        },
        {
          name: 'Expert',
          levels: 90,
          maxRevLevel1: 30.00,
          maxReferrals: 10000,
          isCurrent: currentCategoryInfo.category === 'expert'
        },
        {
          name: 'Mestre',
          levels: 100,
          maxRevLevel1: 35.00,
          maxReferrals: 100000,
          isCurrent: currentCategoryInfo.category === 'mestre'
        }
      ];

      return reply.send({
        success: true,
        data: {
          currentAffiliate: {
            validatedReferrals: affiliate.validatedReferrals,
            category: currentCategoryInfo.category,
            level: currentCategoryInfo.level,
            revLevel1: currentCategoryInfo.revLevel1
          },
          categories
        }
      });

    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
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
      const userId = request.currentUser?.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

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

      // Buscar afiliados diretos (nível 1)
      const directAffiliates = await prisma.affiliate.findMany({
        where: { parentId: currentAffiliate.id },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      // Buscar estatísticas da rede por nível
      const networkStats = await prisma.$queryRaw`
        WITH RECURSIVE network_hierarchy AS (
          SELECT id, user_id, parent_id, referral_code, validated_referrals, 1 as level
          FROM affiliates 
          WHERE parent_id = ${currentAffiliate.id}
          
          UNION ALL
          
          SELECT a.id, a.user_id, a.parent_id, a.referral_code, a.validated_referrals, nh.level + 1
          FROM affiliates a
          INNER JOIN network_hierarchy nh ON a.parent_id = nh.id
          WHERE nh.level < 5
        )
        SELECT 
          level,
          COUNT(*) as count,
          SUM(validated_referrals) as total_validated_referrals
        FROM network_hierarchy
        GROUP BY level
        ORDER BY level;
      `;

      return reply.send({
        success: true,
        data: {
          currentAffiliate: {
            id: currentAffiliate.id,
            referralCode: currentAffiliate.referralCode,
            validatedReferrals: currentAffiliate.validatedReferrals,
            totalReferrals: currentAffiliate.totalReferrals,
            category: CommissionService.calculateCategoryAndLevel(currentAffiliate.validatedReferrals).category,
            level: CommissionService.calculateCategoryAndLevel(currentAffiliate.validatedReferrals).level
          },
          directAffiliates: directAffiliates.map(affiliate => {
            const categoryInfo = CommissionService.calculateCategoryAndLevel(affiliate.validatedReferrals);
            return {
              id: affiliate.id,
              referralCode: affiliate.referralCode,
              validatedReferrals: affiliate.validatedReferrals,
              totalReferrals: affiliate.totalReferrals,
              category: categoryInfo.category,
              level: categoryInfo.level,
              joinedAt: affiliate.createdAt,
              user: affiliate.user
            };
          }),
          networkStats: networkStats.map(stat => ({
            level: Number(stat.level),
            count: Number(stat.count),
            totalValidatedReferrals: Number(stat.total_validated_referrals)
          }))
        }
      });

    } catch (error) {
      console.error('Erro ao buscar rede de afiliados:', error);
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
   * Retorna indicações do afiliado
   */
  static async getReferrals(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      const { page = 1, limit = 20, status } = request.query;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      // Buscar afiliado
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

      // Construir filtros
      const where: any = {
        affiliateId: affiliate.id
      };

      if (status === 'validated') {
        where.isValidated = true;
      } else if (status === 'pending') {
        where.isValidated = false;
      }

      // Calcular offset
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Buscar indicações
      const [referrals, total] = await Promise.all([
        prisma.referral.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.referral.count({ where })
      ]);

      // Estatísticas
      const stats = await prisma.referral.groupBy({
        by: ['isValidated'],
        where: { affiliateId: affiliate.id },
        _count: {
          _all: true
        }
      });

      const validatedCount = stats.find(s => s.isValidated)?._count._all || 0;
      const pendingCount = stats.find(s => !s.isValidated)?._count._all || 0;

      return reply.send({
        success: true,
        data: {
          referrals: referrals.map(referral => ({
            id: referral.id,
            customerId: referral.customerId,
            isValidated: referral.isValidated,
            validatedAt: referral.validatedAt,
            firstDeposit: referral.firstDeposit ? Number(referral.firstDeposit) : null,
            firstDepositAt: referral.firstDepositAt,
            totalBets: referral.totalBets,
            totalGgr: Number(referral.totalGgr),
            cpaProcessed: referral.cpaProcessed,
            cpaProcessedAt: referral.cpaProcessedAt,
            createdAt: referral.createdAt
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          },
          stats: {
            validated: validatedCount,
            pending: pendingCount,
            total: validatedCount + pendingCount
          }
        }
      });

    } catch (error) {
      console.error('Erro ao buscar indicações:', error);
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

