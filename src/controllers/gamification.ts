// @ts-nocheck
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@/config/database';
import { SequenceStatus, ChestStatus, RankingStatus, ChestRarity } from '@prisma/client';

interface ClaimSequenceRewardBody {
  sequenceId: string;
  day: number;
}

interface OpenChestBody {
  chestId: string;
}

interface JoinRankingBody {
  rankingId: string;
}

interface UpdateScoreBody {
  rankingId: string;
  score: number;
}

interface SequenceFilters {
  status?: SequenceStatus;
  page?: number;
  limit?: number;
}

interface ChestFilters {
  status?: ChestStatus;
  rarity?: ChestRarity;
  page?: number;
  limit?: number;
}

interface RankingFilters {
  status?: RankingStatus;
  type?: string;
  page?: number;
  limit?: number;
}

export class GamificationController {
  /**
   * Lista sequências disponíveis para o afiliado
   */
  static async getSequences(request: any, reply: FastifyReply) {
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

      // Buscar afiliado do usuário
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

      const { status, page = 1, limit = 20 } = request.query;

      // Buscar sequências ativas
      const sequences = await prisma.sequence.findMany({
        where: {
          isActive: true
        },
        include: {
          affiliateSequences: {
            where: {
              affiliateId: affiliate.id
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Mapear sequências com progresso do afiliado
      const sequencesWithProgress = sequences.map(sequence => {
        const affiliateSequence = sequence.affiliateSequences[0];
        
        return {
          id: sequence.id,
          name: sequence.name,
          description: sequence.description,
          days: sequence.days,
          rewards: sequence.rewards,
          isActive: sequence.isActive,
          progress: affiliateSequence ? {
            id: affiliateSequence.id,
            currentDay: affiliateSequence.currentDay,
            status: affiliateSequence.status,
            startedAt: affiliateSequence.startedAt,
            lastClaimAt: affiliateSequence.lastClaimAt,
            completedAt: affiliateSequence.completedAt
          } : null
        };
      });

      return reply.send({
        success: true,
        data: {
          sequences: sequencesWithProgress,
          total: sequences.length
        }
      });

    } catch (error) {
      console.error('Erro ao listar sequências:', error);
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
   * Inicia uma sequência para o afiliado
   */
  static async startSequence(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      const { sequenceId } = request.params;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      // Buscar afiliado do usuário
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

      // Verificar se a sequência existe e está ativa
      const sequence = await prisma.sequence.findUnique({
        where: { id: sequenceId }
      });

      if (!sequence || !sequence.isActive) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SEQUENCE_NOT_FOUND',
            message: 'Sequência não encontrada ou inativa'
          }
        });
      }

      // Verificar se o afiliado já iniciou esta sequência
      const existingProgress = await prisma.affiliateSequence.findFirst({
        where: {
          affiliateId: affiliate.id,
          sequenceId: sequenceId
        }
      });

      if (existingProgress) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'SEQUENCE_ALREADY_STARTED',
            message: 'Sequência já foi iniciada'
          }
        });
      }

      // Criar progresso da sequência
      const affiliateSequence = await prisma.affiliateSequence.create({
        data: {
          affiliateId: affiliate.id,
          sequenceId: sequenceId,
          currentDay: 1,
          status: 'active'
        },
        include: {
          sequence: true
        }
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: affiliateSequence.id,
          sequenceId: affiliateSequence.sequenceId,
          sequenceName: affiliateSequence.sequence.name,
          currentDay: affiliateSequence.currentDay,
          totalDays: affiliateSequence.sequence.days,
          status: affiliateSequence.status,
          startedAt: affiliateSequence.startedAt
        }
      });

    } catch (error) {
      console.error('Erro ao iniciar sequência:', error);
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
   * Reivindica recompensa de um dia da sequência
   */
  static async claimSequenceReward(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      const { sequenceId, day } = request.body;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      // Buscar afiliado do usuário
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

      // Buscar progresso da sequência
      const affiliateSequence = await prisma.affiliateSequence.findFirst({
        where: {
          affiliateId: affiliate.id,
          sequenceId: sequenceId
        },
        include: {
          sequence: true
        }
      });

      if (!affiliateSequence) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SEQUENCE_NOT_STARTED',
            message: 'Sequência não foi iniciada'
          }
        });
      }

      // Verificar se o dia é válido
      if (day !== affiliateSequence.currentDay) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_DAY',
            message: 'Dia inválido para reivindicar recompensa'
          }
        });
      }

      // Verificar se já foi reivindicado hoje
      const today = new Date();
      const lastClaim = affiliateSequence.lastClaimAt;
      
      if (lastClaim && lastClaim.toDateString() === today.toDateString()) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'ALREADY_CLAIMED_TODAY',
            message: 'Recompensa já foi reivindicada hoje'
          }
        });
      }

      // Obter recompensa do dia
      const rewards = affiliateSequence.sequence.rewards as any;
      const dayReward = rewards[`day${day}`] || rewards.daily;

      // Atualizar progresso
      const isCompleted = day >= affiliateSequence.sequence.days;
      const updatedSequence = await prisma.affiliateSequence.update({
        where: { id: affiliateSequence.id },
        data: {
          currentDay: isCompleted ? affiliateSequence.sequence.days : day + 1,
          lastClaimAt: today,
          completedAt: isCompleted ? today : null,
          status: isCompleted ? 'completed' : 'active'
        }
      });

      // Aplicar recompensas (aqui você pode implementar a lógica específica)
      // Por exemplo: adicionar pontos, criar baús, etc.

      return reply.send({
        success: true,
        data: {
          day: day,
          reward: dayReward,
          currentDay: updatedSequence.currentDay,
          status: updatedSequence.status,
          isCompleted: isCompleted,
          nextClaimAvailable: !isCompleted
        }
      });

    } catch (error) {
      console.error('Erro ao reivindicar recompensa:', error);
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
   * Lista baús do afiliado
   */
  static async getChests(request: any, reply: FastifyReply) {
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

      // Buscar afiliado do usuário
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

      const { status, rarity, page = 1, limit = 20 } = request.query;

      // Construir filtros
      const where: any = {
        affiliateId: affiliate.id
      };

      if (status) {
        where.status = status;
      }

      // Calcular offset
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Buscar baús do afiliado
      const [chests, total] = await Promise.all([
        prisma.affiliateChest.findMany({
          where,
          include: {
            chest: true
          },
          orderBy: { earnedAt: 'desc' },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.affiliateChest.count({ where })
      ]);

      // Filtrar por raridade se especificado
      let filteredChests = chests;
      if (rarity) {
        filteredChests = chests.filter(ac => ac.chest.rarity === rarity);
      }

      return reply.send({
        success: true,
        data: {
          chests: filteredChests.map(affiliateChest => ({
            id: affiliateChest.id,
            status: affiliateChest.status,
            earnedAt: affiliateChest.earnedAt,
            openedAt: affiliateChest.openedAt,
            expiresAt: affiliateChest.expiresAt,
            rewards: affiliateChest.rewards,
            chest: {
              id: affiliateChest.chest.id,
              name: affiliateChest.chest.name,
              description: affiliateChest.chest.description,
              rarity: affiliateChest.chest.rarity,
              rewards: affiliateChest.chest.rewards
            }
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Erro ao listar baús:', error);
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
   * Abre um baú
   */
  static async openChest(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      const { chestId } = request.body;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      // Buscar afiliado do usuário
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

      // Buscar baú do afiliado
      const affiliateChest = await prisma.affiliateChest.findFirst({
        where: {
          id: chestId,
          affiliateId: affiliate.id
        },
        include: {
          chest: true
        }
      });

      if (!affiliateChest) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CHEST_NOT_FOUND',
            message: 'Baú não encontrado'
          }
        });
      }

      if (affiliateChest.status !== 'available') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'CHEST_NOT_AVAILABLE',
            message: 'Baú não está disponível para abertura'
          }
        });
      }

      // Verificar se não expirou
      if (affiliateChest.expiresAt && affiliateChest.expiresAt < new Date()) {
        await prisma.affiliateChest.update({
          where: { id: chestId },
          data: { status: 'expired' }
        });

        return reply.status(400).send({
          success: false,
          error: {
            code: 'CHEST_EXPIRED',
            message: 'Baú expirou'
          }
        });
      }

      // Simular abertura do baú (aqui você pode implementar lógica de probabilidade)
      const chestRewards = affiliateChest.chest.rewards as any;
      const possibleRewards = chestRewards.possible || [];
      
      // Selecionar recompensa aleatória
      const selectedReward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];

      // Atualizar baú como aberto
      const updatedChest = await prisma.affiliateChest.update({
        where: { id: chestId },
        data: {
          status: 'opened',
          openedAt: new Date(),
          rewards: selectedReward
        }
      });

      return reply.send({
        success: true,
        data: {
          chestId: updatedChest.id,
          chestName: affiliateChest.chest.name,
          rarity: affiliateChest.chest.rarity,
          reward: selectedReward,
          openedAt: updatedChest.openedAt
        }
      });

    } catch (error) {
      console.error('Erro ao abrir baú:', error);
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
   * Lista rankings disponíveis
   */
  static async getRankings(request: any, reply: FastifyReply) {
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

      // Buscar afiliado do usuário
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

      const { status, type, page = 1, limit = 20 } = request.query;

      // Construir filtros
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (type) {
        where.type = type;
      }

      // Calcular offset
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Buscar rankings
      const [rankings, total] = await Promise.all([
        prisma.ranking.findMany({
          where,
          include: {
            participants: {
              where: {
                affiliateId: affiliate.id
              }
            },
            _count: {
              select: {
                participants: true
              }
            }
          },
          orderBy: { startDate: 'desc' },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.ranking.count({ where })
      ]);

      return reply.send({
        success: true,
        data: {
          rankings: rankings.map(ranking => ({
            id: ranking.id,
            name: ranking.name,
            description: ranking.description,
            type: ranking.type,
            status: ranking.status,
            startDate: ranking.startDate,
            endDate: ranking.endDate,
            prizes: ranking.prizes,
            rules: ranking.rules,
            participantCount: ranking._count.participants,
            isParticipating: ranking.participants.length > 0,
            myParticipation: ranking.participants[0] || null
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Erro ao listar rankings:', error);
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
   * Participa de um ranking
   */
  static async joinRanking(request: any, reply: FastifyReply) {
    try {
      const userId = request.currentUser?.id;
      const { rankingId } = request.body;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de acesso inválido'
          }
        });
      }

      // Buscar afiliado do usuário
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

      // Verificar se o ranking existe e está ativo
      const ranking = await prisma.ranking.findUnique({
        where: { id: rankingId }
      });

      if (!ranking || ranking.status !== 'active') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'RANKING_NOT_AVAILABLE',
            message: 'Ranking não encontrado ou não está ativo'
          }
        });
      }

      // Verificar se já está participando
      const existingParticipation = await prisma.rankingParticipant.findUnique({
        where: {
          rankingId_affiliateId: {
            rankingId: rankingId,
            affiliateId: affiliate.id
          }
        }
      });

      if (existingParticipation) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'ALREADY_PARTICIPATING',
            message: 'Já está participando deste ranking'
          }
        });
      }

      // Criar participação
      const participant = await prisma.rankingParticipant.create({
        data: {
          rankingId: rankingId,
          affiliateId: affiliate.id,
          score: 0
        }
      });

      return reply.status(201).send({
        success: true,
        data: {
          participantId: participant.id,
          rankingId: participant.rankingId,
          score: participant.score,
          position: null,
          joinedAt: participant.createdAt
        }
      });

    } catch (error) {
      console.error('Erro ao participar do ranking:', error);
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
   * Obtém leaderboard de um ranking
   */
  static async getRankingLeaderboard(request: any, reply: FastifyReply) {
    try {
      const { rankingId } = request.params;
      const { limit = 50 } = request.query;

      // Buscar participantes ordenados por score
      const participants = await prisma.rankingParticipant.findMany({
        where: { rankingId },
        include: {
          affiliate: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { score: 'desc' },
        take: parseInt(limit)
      });

      // Adicionar posições
      const leaderboard = participants.map((participant, index) => ({
        position: index + 1,
        affiliateId: participant.affiliateId,
        affiliateName: participant.affiliate.user.name,
        referralCode: participant.affiliate.referralCode,
        score: Number(participant.score),
        prize: participant.prize,
        updatedAt: participant.updatedAt
      }));

      return reply.send({
        success: true,
        data: {
          rankingId,
          leaderboard,
          totalParticipants: participants.length
        }
      });

    } catch (error) {
      console.error('Erro ao buscar leaderboard:', error);
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

