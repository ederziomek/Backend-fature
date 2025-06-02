// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { GamificationController } from '@/controllers/gamification';
import { authMiddleware } from '@/middleware/auth';

export async function gamificationRoutes(fastify: FastifyInstance) {
  // Aplicar middleware de autenticação em todas as rotas
  fastify.addHook('preHandler', authMiddleware);

  // === SEQUÊNCIAS ===

  // Listar sequências
  fastify.get('/sequences', {
    schema: {
      description: 'Lista sequências de gamificação disponíveis para o afiliado',
      tags: ['Gamificação'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'paused', 'completed', 'expired'],
            description: 'Filtrar por status da sequência'
          },
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Página atual'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: 'Itens por página'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                sequences: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' },
                      description: { type: 'string', nullable: true },
                      days: { type: 'integer' },
                      rewards: { type: 'object' },
                      isActive: { type: 'boolean' },
                      progress: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          currentDay: { type: 'integer' },
                          status: { type: 'string' },
                          startedAt: { type: 'string', format: 'date-time' },
                          lastClaimAt: { type: 'string', format: 'date-time', nullable: true },
                          completedAt: { type: 'string', format: 'date-time', nullable: true }
                        }
                      }
                    }
                  }
                },
                total: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, GamificationController.getSequences);

  // Iniciar sequência
  fastify.post('/sequences/:sequenceId/start', {
    schema: {
      description: 'Inicia uma sequência de gamificação para o afiliado',
      tags: ['Gamificação'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['sequenceId'],
        properties: {
          sequenceId: {
            type: 'string',
            format: 'uuid',
            description: 'ID da sequência'
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                sequenceId: { type: 'string', format: 'uuid' },
                sequenceName: { type: 'string' },
                currentDay: { type: 'integer' },
                totalDays: { type: 'integer' },
                status: { type: 'string' },
                startedAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }, GamificationController.startSequence);

  // Reivindicar recompensa da sequência
  fastify.post('/sequences/claim', {
    schema: {
      description: 'Reivindica recompensa de um dia da sequência',
      tags: ['Gamificação'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['sequenceId', 'day'],
        properties: {
          sequenceId: {
            type: 'string',
            format: 'uuid',
            description: 'ID da sequência'
          },
          day: {
            type: 'integer',
            minimum: 1,
            description: 'Dia da sequência para reivindicar'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                day: { type: 'integer' },
                reward: { type: 'object' },
                currentDay: { type: 'integer' },
                status: { type: 'string' },
                isCompleted: { type: 'boolean' },
                nextClaimAvailable: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, GamificationController.claimSequenceReward);

  // === BAÚS ===

  // Listar baús
  fastify.get('/chests', {
    schema: {
      description: 'Lista baús de recompensa do afiliado',
      tags: ['Gamificação'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['available', 'opened', 'expired'],
            description: 'Filtrar por status do baú'
          },
          rarity: {
            type: 'string',
            enum: ['common', 'rare', 'epic', 'legendary'],
            description: 'Filtrar por raridade do baú'
          },
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Página atual'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: 'Itens por página'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                chests: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      status: { type: 'string' },
                      earnedAt: { type: 'string', format: 'date-time' },
                      openedAt: { type: 'string', format: 'date-time', nullable: true },
                      expiresAt: { type: 'string', format: 'date-time', nullable: true },
                      rewards: { type: 'object', nullable: true },
                      chest: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string' },
                          description: { type: 'string', nullable: true },
                          rarity: { type: 'string' },
                          rewards: { type: 'object' }
                        }
                      }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    pages: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, GamificationController.getChests);

  // Abrir baú
  fastify.post('/chests/open', {
    schema: {
      description: 'Abre um baú de recompensa',
      tags: ['Gamificação'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['chestId'],
        properties: {
          chestId: {
            type: 'string',
            format: 'uuid',
            description: 'ID do baú para abrir'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                chestId: { type: 'string', format: 'uuid' },
                chestName: { type: 'string' },
                rarity: { type: 'string' },
                reward: { type: 'object' },
                openedAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }, GamificationController.openChest);

  // === RANKINGS ===

  // Listar rankings
  fastify.get('/rankings', {
    schema: {
      description: 'Lista rankings disponíveis',
      tags: ['Gamificação'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['draft', 'active', 'completed', 'cancelled'],
            description: 'Filtrar por status do ranking'
          },
          type: {
            type: 'string',
            enum: ['monthly', 'quarterly', 'annual', 'special_event'],
            description: 'Filtrar por tipo do ranking'
          },
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Página atual'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: 'Itens por página'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                rankings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' },
                      description: { type: 'string', nullable: true },
                      type: { type: 'string' },
                      status: { type: 'string' },
                      startDate: { type: 'string', format: 'date-time' },
                      endDate: { type: 'string', format: 'date-time' },
                      prizes: { type: 'object' },
                      rules: { type: 'object' },
                      participantCount: { type: 'integer' },
                      isParticipating: { type: 'boolean' },
                      myParticipation: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          score: { type: 'number' },
                          position: { type: 'integer', nullable: true },
                          prize: { type: 'object', nullable: true }
                        }
                      }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    pages: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, GamificationController.getRankings);

  // Participar de ranking
  fastify.post('/rankings/join', {
    schema: {
      description: 'Participa de um ranking',
      tags: ['Gamificação'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['rankingId'],
        properties: {
          rankingId: {
            type: 'string',
            format: 'uuid',
            description: 'ID do ranking para participar'
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                participantId: { type: 'string', format: 'uuid' },
                rankingId: { type: 'string', format: 'uuid' },
                score: { type: 'number' },
                position: { type: 'integer', nullable: true },
                joinedAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }, GamificationController.joinRanking);

  // Leaderboard do ranking
  fastify.get('/rankings/:rankingId/leaderboard', {
    schema: {
      description: 'Obtém leaderboard de um ranking específico',
      tags: ['Gamificação'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['rankingId'],
        properties: {
          rankingId: {
            type: 'string',
            format: 'uuid',
            description: 'ID do ranking'
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50,
            description: 'Número máximo de participantes no leaderboard'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                rankingId: { type: 'string', format: 'uuid' },
                leaderboard: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      position: { type: 'integer' },
                      affiliateId: { type: 'string', format: 'uuid' },
                      affiliateName: { type: 'string' },
                      referralCode: { type: 'string' },
                      score: { type: 'number' },
                      prize: { type: 'object', nullable: true },
                      updatedAt: { type: 'string', format: 'date-time' }
                    }
                  }
                },
                totalParticipants: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, GamificationController.getRankingLeaderboard);
}

