import { FastifyInstance } from 'fastify';
import { AffiliateController } from '@/controllers/affiliate.controller';
import { AdvancedAffiliateController } from '@/controllers/advanced.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

export async function affiliateRoutes(fastify: FastifyInstance) {
  // Configurar documentação Swagger para o grupo de rotas
  await fastify.register(async function (fastify) {
    fastify.addSchema({
      $id: 'AffiliateResponse',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        message: { type: 'string' },
        error: { type: 'string' },
        statusCode: { type: 'number' }
      }
    });

    fastify.addSchema({
      $id: 'CreateAffiliateRequest',
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string', description: 'ID do usuário' },
        sponsorCode: { type: 'string', description: 'Código do sponsor (opcional)' }
      }
    });

    fastify.addSchema({
      $id: 'ProcessTransactionRequest',
      type: 'object',
      required: ['customerId', 'affiliateId', 'type', 'amount', 'validationModel'],
      properties: {
        customerId: { type: 'string', description: 'ID do cliente' },
        affiliateId: { type: 'string', description: 'ID do afiliado' },
        type: { 
          type: 'string', 
          enum: ['deposit', 'bet', 'sale', 'withdrawal'],
          description: 'Tipo da transação' 
        },
        amount: { type: 'number', minimum: 0, description: 'Valor da transação' },
        validationModel: { 
          type: 'string', 
          enum: ['1.1', '1.2'],
          description: 'Modelo de validação CPA' 
        },
        metadata: { type: 'object', description: 'Metadados adicionais' }
      }
    });

    // Criar afiliado
    fastify.post('/affiliates', {
      schema: {
        tags: ['Afiliados'],
        summary: 'Criar novo afiliado',
        description: 'Cria um novo afiliado no sistema com código único',
        body: { $ref: 'CreateAffiliateRequest' },
        response: {
          201: {
            description: 'Afiliado criado com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  affiliateCode: { type: 'string' },
                  category: { type: 'string', enum: ['jogador', 'iniciante', 'afiliado', 'profissional', 'expert', 'mestre', 'lenda'] },
                  categoryLevel: { type: 'number' },
                  status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'banned'] },
                  directIndications: { type: 'number' },
                  totalIndications: { type: 'number' },
                  totalCommissions: { type: 'number' },
                  availableBalance: { type: 'number' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              },
              message: { type: 'string', example: 'Afiliado criado com sucesso' },
              statusCode: { type: 'number', example: 201 }
            }
          },
          400: {
            description: 'Erro de validação',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'ID do usuário é obrigatório' },
              statusCode: { type: 'number', example: 400 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AffiliateController.createAffiliate);

    // Buscar afiliado por ID
    fastify.get('/affiliates/:id', {
      schema: {
        tags: ['Afiliados'],
        summary: 'Buscar afiliado por ID',
        description: 'Retorna dados completos do afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Afiliado encontrado',
            $ref: 'AffiliateResponse'
          },
          404: {
            description: 'Afiliado não encontrado',
            $ref: 'AffiliateResponse'
          }
        }
      },
      preHandler: [authMiddleware]
    }, AffiliateController.getAffiliate);

    // Buscar afiliado por código
    fastify.get('/affiliates/code/:code', {
      schema: {
        tags: ['Afiliados'],
        summary: 'Buscar afiliado por código',
        description: 'Retorna dados do afiliado pelo código único',
        params: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Código do afiliado' }
          },
          required: ['code']
        },
        response: {
          200: { $ref: 'AffiliateResponse' },
          404: { $ref: 'AffiliateResponse' }
        }
      }
    }, AffiliateController.getAffiliateByCode);

    // Atualizar afiliado
    fastify.put('/affiliates/:id', {
      schema: {
        tags: ['Afiliados'],
        summary: 'Atualizar dados do afiliado',
        description: 'Atualiza categoria, level ou status do afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        body: {
          type: 'object',
          properties: {
            category: { 
              type: 'string', 
              enum: ['jogador', 'iniciante', 'afiliado', 'profissional', 'expert', 'mestre', 'lenda'],
              description: 'Nova categoria do afiliado'
            },
            categoryLevel: { type: 'number', minimum: 1, description: 'Novo level da categoria' },
            status: { 
              type: 'string', 
              enum: ['active', 'inactive', 'suspended', 'banned'],
              description: 'Novo status do afiliado'
            }
          }
        },
        response: {
          200: { $ref: 'AffiliateResponse' },
          400: { $ref: 'AffiliateResponse' },
          404: { $ref: 'AffiliateResponse' }
        }
      },
      preHandler: [authMiddleware]
    }, AffiliateController.updateAffiliate);

    // Listar afiliados
    fastify.get('/affiliates', {
      schema: {
        tags: ['Afiliados'],
        summary: 'Listar afiliados',
        description: 'Lista afiliados com filtros opcionais',
        querystring: {
          type: 'object',
          properties: {
            category: { 
              type: 'string', 
              enum: ['jogador', 'iniciante', 'afiliado', 'profissional', 'expert', 'mestre', 'lenda'],
              description: 'Filtrar por categoria'
            },
            status: { 
              type: 'string', 
              enum: ['active', 'inactive', 'suspended', 'banned'],
              description: 'Filtrar por status'
            },
            sponsorId: { type: 'string', description: 'Filtrar por sponsor' },
            search: { type: 'string', description: 'Busca textual por código, nome ou email' },
            limit: { type: 'string', default: '50', description: 'Limite de resultados' },
            offset: { type: 'string', default: '0', description: 'Offset para paginação' }
          }
        },
        response: {
          200: {
            description: 'Lista de afiliados',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  affiliates: { type: 'array', items: { type: 'object' } },
                  total: { type: 'number' },
                  hasMore: { type: 'boolean' }
                }
              },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AffiliateController.listAffiliates);

    // Obter hierarquia MLM (5 níveis)
    fastify.get('/affiliates/:id/hierarchy', {
      schema: {
        tags: ['Afiliados', 'MLM'],
        summary: 'Obter hierarquia MLM',
        description: 'Retorna a hierarquia MLM do afiliado (até 5 níveis para comissões)',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        querystring: {
          type: 'object',
          properties: {
            maxLevels: { type: 'string', default: '5', description: 'Máximo de níveis MLM' }
          }
        },
        response: {
          200: {
            description: 'Hierarquia MLM',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: { type: 'object' },
                description: 'Array com afiliados da hierarquia (1º ao 5º nível)'
              },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AffiliateController.getHierarchy);

    // Obter estrutura MLM completa
    fastify.get('/affiliates/:id/structure', {
      schema: {
        tags: ['Afiliados', 'MLM'],
        summary: 'Obter estrutura MLM completa',
        description: 'Retorna a estrutura MLM com descendentes do afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        querystring: {
          type: 'object',
          properties: {
            maxDepth: { type: 'string', default: '3', description: 'Profundidade máxima da estrutura' }
          }
        },
        response: {
          200: { $ref: 'AffiliateResponse' }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.getMLMStructure);

    // Processar transação e calcular comissões CPA
    fastify.post('/affiliates/process-transaction', {
      schema: {
        tags: ['Afiliados', 'Comissões'],
        summary: 'Processar transação CPA',
        description: 'Processa transação e calcula comissões CPA conforme modelo de validação',
        body: { $ref: 'ProcessTransactionRequest' },
        response: {
          200: {
            description: 'Transação processada com sucesso',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  transactionId: { type: 'string' },
                  commissions: { type: 'array', items: { type: 'object' } },
                  totalDistributed: { type: 'number' },
                  validationPassed: { type: 'boolean' },
                  bonusTriggered: { type: 'boolean' },
                  levelUpTriggered: { type: 'boolean' },
                  newCategory: { type: 'string' },
                  newCategoryLevel: { type: 'number' }
                }
              },
              message: { type: 'string', example: 'Transação processada com sucesso' },
              statusCode: { type: 'number', example: 200 }
            }
          },
          400: { $ref: 'AffiliateResponse' }
        }
      },
      preHandler: [authMiddleware]
    }, AffiliateController.processTransaction);

    // Gerar relatório do afiliado
    fastify.get('/affiliates/:id/report', {
      schema: {
        tags: ['Afiliados', 'Relatórios'],
        summary: 'Gerar relatório do afiliado',
        description: 'Gera relatório detalhado de performance do afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Data de início' },
            endDate: { type: 'string', format: 'date', description: 'Data de fim' },
            includeCommissions: { type: 'string', default: 'true', description: 'Incluir comissões' },
            includeIndications: { type: 'string', default: 'true', description: 'Incluir indicações' }
          }
        },
        response: {
          200: {
            description: 'Relatório gerado',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  period: { type: 'object' },
                  metrics: { type: 'object' },
                  commissions: { type: 'array' },
                  indications: { type: 'array' }
                }
              },
              statusCode: { type: 'number', example: 200 }
            }
          },
          400: { $ref: 'AffiliateResponse' }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.generateReport);

    // Obter filhos diretos (1º nível)
    fastify.get('/affiliates/:id/children', {
      schema: {
        tags: ['Afiliados', 'MLM'],
        summary: 'Obter filhos diretos',
        description: 'Retorna indicações diretas do afiliado (1º nível MLM)',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Filhos diretos',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: { type: 'object' },
                description: 'Array com indicações diretas (1º nível MLM)'
              },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AffiliateController.getDirectChildren);

    // Atualizar atividade do afiliado
    fastify.post('/affiliates/:id/activity', {
      schema: {
        tags: ['Afiliados'],
        summary: 'Atualizar atividade',
        description: 'Atualiza timestamp da última atividade do afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Atividade atualizada',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Atividade atualizada com sucesso' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AffiliateController.updateActivity);
  });
}


    // ===============================================
    // ROTAS AVANÇADAS - REVSHARE
    // ===============================================

    // Calcular RevShare para período específico
    fastify.post('/affiliates/:id/revshare/calculate', {
      schema: {
        tags: ['RevShare'],
        summary: 'Calcular RevShare',
        description: 'Calcula RevShare para um afiliado em período específico',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        body: {
          type: 'object',
          required: ['period'],
          properties: {
            period: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['weekly', 'monthly', 'custom'] },
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' }
              },
              required: ['type']
            }
          }
        },
        response: {
          200: {
            description: 'RevShare calculado',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAdvancedAffiliateController.calculateRevShare);

    // Processar RevShare automático
    fastify.post('/affiliates/revshare/process-automatic', {
      schema: {
        tags: ['RevShare'],
        summary: 'Processar RevShare automático',
        description: 'Processa RevShare automaticamente para todos os afiliados',
        body: {
          type: 'object',
          required: ['period'],
          properties: {
            period: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['weekly', 'monthly'] }
              },
              required: ['type']
            }
          }
        },
        response: {
          200: {
            description: 'Processamento iniciado',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Processamento iniciado' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.processAutomaticRevShare);

    // ===============================================
    // ROTAS AVANÇADAS - GAMIFICAÇÃO
    // ===============================================

    // Processar sequência diária
    fastify.post('/affiliates/:id/sequence/process', {
      schema: {
        tags: ['Gamificação'],
        summary: 'Processar sequência',
        description: 'Processa sequência diária de indicações do afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Sequência processada',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.processSequence);

    // Gerar baú de recompensa
    fastify.post('/affiliates/:id/chest/generate', {
      schema: {
        tags: ['Gamificação'],
        summary: 'Gerar baú',
        description: 'Gera baú de recompensa para o afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        body: {
          type: 'object',
          required: ['trigger'],
          properties: {
            trigger: { 
              type: 'string', 
              enum: ['level_up', 'milestone', 'sequence', 'manual'],
              description: 'Trigger que gerou o baú' 
            }
          }
        },
        response: {
          200: {
            description: 'Baú gerado',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.generateChest);

    // Abrir baú de recompensa
    fastify.post('/affiliates/:id/chest/:chestId/open', {
      schema: {
        tags: ['Gamificação'],
        summary: 'Abrir baú',
        description: 'Abre baú de recompensa do afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' },
            chestId: { type: 'string', description: 'ID do baú' }
          },
          required: ['id', 'chestId']
        },
        response: {
          200: {
            description: 'Baú aberto',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.openChest);

    // Listar baús disponíveis
    fastify.get('/affiliates/:id/chests', {
      schema: {
        tags: ['Gamificação'],
        summary: 'Listar baús',
        description: 'Lista baús disponíveis do afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        querystring: {
          type: 'object',
          properties: {
            status: { 
              type: 'string', 
              enum: ['available', 'opened', 'expired'],
              description: 'Filtrar por status' 
            }
          }
        },
        response: {
          200: {
            description: 'Lista de baús',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'array' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.listChests);

    // ===============================================
    // ROTAS AVANÇADAS - RELATÓRIOS
    // ===============================================

    // Gerar relatório de performance
    fastify.post('/affiliates/:id/reports/performance', {
      schema: {
        tags: ['Relatórios'],
        summary: 'Relatório de performance',
        description: 'Gera relatório detalhado de performance do afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        body: {
          type: 'object',
          required: ['startDate', 'endDate', 'format'],
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Data inicial' },
            endDate: { type: 'string', format: 'date', description: 'Data final' },
            format: { 
              type: 'string', 
              enum: ['pdf', 'excel', 'csv', 'json'],
              description: 'Formato do relatório' 
            }
          }
        },
        response: {
          200: {
            description: 'Relatório gerado',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.generatePerformanceReport);

    // Gerar relatório de comissões
    fastify.post('/affiliates/:id/reports/commissions', {
      schema: {
        tags: ['Relatórios'],
        summary: 'Relatório de comissões',
        description: 'Gera relatório detalhado de comissões do afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        body: {
          type: 'object',
          required: ['startDate', 'endDate', 'format'],
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Data inicial' },
            endDate: { type: 'string', format: 'date', description: 'Data final' },
            format: { 
              type: 'string', 
              enum: ['pdf', 'excel', 'csv', 'json'],
              description: 'Formato do relatório' 
            },
            type: {
              type: 'string',
              enum: ['all', 'cpa', 'revshare'],
              description: 'Tipo de comissão'
            }
          }
        },
        response: {
          200: {
            description: 'Relatório gerado',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.generateCommissionReport);

    // Gerar relatório de rede
    fastify.post('/affiliates/:id/reports/network', {
      schema: {
        tags: ['Relatórios'],
        summary: 'Relatório de rede',
        description: 'Gera relatório da estrutura de rede MLM do afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        body: {
          type: 'object',
          required: ['startDate', 'endDate', 'format'],
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Data inicial' },
            endDate: { type: 'string', format: 'date', description: 'Data final' },
            format: { 
              type: 'string', 
              enum: ['pdf', 'excel', 'json'],
              description: 'Formato do relatório' 
            },
            levels: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Número de níveis para incluir'
            }
          }
        },
        response: {
          200: {
            description: 'Relatório gerado',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.generateNetworkReport);

    // Download de relatório
    fastify.get('/affiliates/reports/:reportId/download', {
      schema: {
        tags: ['Relatórios'],
        summary: 'Download de relatório',
        description: 'Faz download de relatório gerado',
        params: {
          type: 'object',
          properties: {
            reportId: { type: 'string', description: 'ID do relatório' }
          },
          required: ['reportId']
        },
        response: {
          200: {
            description: 'Arquivo do relatório',
            type: 'string',
            format: 'binary'
          }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.downloadReport);

    // ===============================================
    // ROTAS AVANÇADAS - WEBHOOKS
    // ===============================================

    // Configurar webhook
    fastify.post('/affiliates/:id/webhooks', {
      schema: {
        tags: ['Webhooks'],
        summary: 'Configurar webhook',
        description: 'Configura webhook para eventos do afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        body: {
          type: 'object',
          required: ['url', 'events'],
          properties: {
            url: { type: 'string', format: 'uri', description: 'URL do webhook' },
            events: { 
              type: 'array',
              items: { type: 'string' },
              description: 'Eventos para notificar'
            },
            secret: { type: 'string', description: 'Secret para validação' }
          }
        },
        response: {
          201: {
            description: 'Webhook configurado',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              statusCode: { type: 'number', example: 201 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.configureWebhook);

    // Listar webhooks
    fastify.get('/affiliates/:id/webhooks', {
      schema: {
        tags: ['Webhooks'],
        summary: 'Listar webhooks',
        description: 'Lista webhooks configurados para o afiliado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do afiliado' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Lista de webhooks',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'array' },
              statusCode: { type: 'number', example: 200 }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, AdvancedAffiliateController.listWebhooks);
  });
}

