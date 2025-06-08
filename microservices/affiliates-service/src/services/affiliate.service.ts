import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { 
  AffiliateData, 
  CreateAffiliateRequest,
  UpdateAffiliateRequest,
  MLMHierarchy,
  AffiliateCategory,
  AffiliateStatus,
  AffiliateReport,
  GetReportRequest
} from '@/types';
import { EventService } from './event.service';
import { AuditService } from './audit.service';
import { v4 as uuidv4 } from 'uuid';

export class AffiliateService {
  /**
   * Cria um novo afiliado
   */
  static async createAffiliate(data: CreateAffiliateRequest): Promise<AffiliateData> {
    try {
      // Verificar se usuário já é afiliado
      const existingAffiliate = await prisma.affiliate.findUnique({
        where: { userId: data.userId }
      });

      if (existingAffiliate) {
        throw new Error('Usuário já é afiliado');
      }

      // Gerar código único do afiliado
      const affiliateCode = await this.generateUniqueAffiliateCode();

      // Buscar sponsor se código foi fornecido
      let sponsorId: string | undefined;
      if (data.sponsorCode) {
        const sponsor = await prisma.affiliate.findUnique({
          where: { affiliateCode: data.sponsorCode }
        });

        if (!sponsor) {
          throw new Error('Código de sponsor inválido');
        }

        if (sponsor.status !== 'active') {
          throw new Error('Sponsor não está ativo');
        }

        sponsorId = sponsor.id;
      }

      // Criar afiliado
      const affiliate = await prisma.affiliate.create({
        data: {
          userId: data.userId,
          affiliateCode,
          sponsorId,
          category: 'jogador',
          categoryLevel: 1,
          status: 'active',
          directIndications: 0,
          totalIndications: 0,
          totalCommissions: 0,
          availableBalance: 0,
          lockedBalance: 0,
          lastActivityAt: new Date()
        }
      });

      // Atualizar contadores do sponsor
      if (sponsorId) {
        await this.updateSponsorCounters(sponsorId);
      }

      // Publicar evento
      await EventService.publishAffiliateCreated({
        affiliateId: affiliate.id,
        userId: data.userId,
        affiliateCode,
        sponsorId,
        timestamp: new Date()
      });

      // Log de auditoria
      await AuditService.log({
        action: 'affiliate.created',
        resource: 'affiliate',
        resourceId: affiliate.id,
        details: {
          userId: data.userId,
          affiliateCode,
          sponsorId,
          sponsorCode: data.sponsorCode
        },
        severity: 'info'
      });

      return affiliate as AffiliateData;

    } catch (error: any) {
      await AuditService.log({
        action: 'affiliate.create.error',
        resource: 'affiliate',
        details: {
          error: error.message,
          userId: data.userId,
          sponsorCode: data.sponsorCode
        },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Busca afiliado por ID
   */
  static async getAffiliateById(id: string): Promise<AffiliateData | null> {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true
          }
        },
        sponsor: {
          select: {
            id: true,
            affiliateCode: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return affiliate as AffiliateData | null;
  }

  /**
   * Busca afiliado por código
   */
  static async getAffiliateByCode(code: string): Promise<AffiliateData | null> {
    const affiliate = await prisma.affiliate.findUnique({
      where: { affiliateCode: code }
    });

    return affiliate as AffiliateData | null;
  }

  /**
   * Busca afiliado por ID do usuário
   */
  static async getAffiliateByUserId(userId: string): Promise<AffiliateData | null> {
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId }
    });

    return affiliate as AffiliateData | null;
  }

  /**
   * Atualiza dados do afiliado
   */
  static async updateAffiliate(id: string, data: UpdateAffiliateRequest): Promise<AffiliateData> {
    try {
      const affiliate = await prisma.affiliate.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      // Log de auditoria
      await AuditService.log({
        action: 'affiliate.updated',
        resource: 'affiliate',
        resourceId: id,
        details: data,
        severity: 'info'
      });

      return affiliate as AffiliateData;

    } catch (error: any) {
      await AuditService.log({
        action: 'affiliate.update.error',
        resource: 'affiliate',
        resourceId: id,
        details: {
          error: error.message,
          updateData: data
        },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Obtém hierarquia MLM do afiliado
   */
  static async getHierarchy(affiliateId: string, maxLevels: number = 5): Promise<AffiliateData[]> {
    const hierarchy: AffiliateData[] = [];
    let currentAffiliate = await this.getAffiliateById(affiliateId);

    // Subir na hierarquia até encontrar o sponsor ou atingir o limite
    let level = 0;
    while (currentAffiliate && level < maxLevels) {
      hierarchy.push(currentAffiliate);
      
      if (currentAffiliate.sponsorId) {
        currentAffiliate = await this.getAffiliateById(currentAffiliate.sponsorId);
        level++;
      } else {
        break;
      }
    }

    return hierarchy;
  }

  /**
   * Obtém estrutura MLM completa (afiliado + descendentes)
   */
  static async getMLMStructure(affiliateId: string, maxDepth: number = 3): Promise<MLMHierarchy> {
    const affiliate = await this.getAffiliateById(affiliateId);
    
    if (!affiliate) {
      throw new Error('Afiliado não encontrado');
    }

    const structure: MLMHierarchy = {
      affiliate,
      level: 0,
      children: [],
      totalChildren: 0,
      directChildren: 0
    };

    if (maxDepth > 0) {
      const children = await this.getDirectChildren(affiliateId);
      structure.directChildren = children.length;
      structure.totalChildren = children.length;

      for (const child of children) {
        const childStructure = await this.getMLMStructure(child.id, maxDepth - 1);
        childStructure.level = 1;
        structure.children.push(childStructure);
        structure.totalChildren += childStructure.totalChildren;
      }
    }

    return structure;
  }

  /**
   * Obtém filhos diretos do afiliado
   */
  static async getDirectChildren(affiliateId: string): Promise<AffiliateData[]> {
    const children = await prisma.affiliate.findMany({
      where: { 
        sponsorId: affiliateId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' }
    });

    return children as AffiliateData[];
  }

  /**
   * Gera relatório do afiliado
   */
  static async generateReport(request: GetReportRequest): Promise<AffiliateReport> {
    const { affiliateId, startDate, endDate, includeCommissions = true, includeIndications = true } = request;

    // Buscar métricas do período
    const [commissions, indications, affiliate] = await Promise.all([
      includeCommissions ? this.getCommissionsInPeriod(affiliateId, startDate, endDate) : [],
      includeIndications ? this.getIndicationsInPeriod(affiliateId, startDate, endDate) : [],
      this.getAffiliateById(affiliateId)
    ]);

    if (!affiliate) {
      throw new Error('Afiliado não encontrado');
    }

    // Calcular métricas
    const commissionsEarned = commissions.reduce((sum, c) => sum + c.finalAmount, 0);
    const bonusesEarned = indications.reduce((sum, i) => sum + i.bonusAmount, 0);
    const totalEarnings = commissionsEarned + bonusesEarned;

    // Calcular taxa de conversão (indicações validadas / total de indicações)
    const totalIndications = indications.length;
    const validatedIndications = indications.filter(i => i.status === 'validated').length;
    const conversionRate = totalIndications > 0 ? (validatedIndications / totalIndications) * 100 : 0;

    return {
      period: {
        start: startDate,
        end: endDate
      },
      metrics: {
        directIndications: affiliate.directIndications,
        totalIndications: affiliate.totalIndications,
        commissionsEarned,
        bonusesEarned,
        totalEarnings,
        conversionRate
      },
      commissions,
      indications
    };
  }

  /**
   * Lista afiliados com filtros
   */
  static async listAffiliates(filters: {
    category?: AffiliateCategory;
    status?: AffiliateStatus;
    sponsorId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.category) where.category = filters.category;
    if (filters.status) where.status = filters.status;
    if (filters.sponsorId) where.sponsorId = filters.sponsorId;
    
    if (filters.search) {
      where.OR = [
        { affiliateCode: { contains: filters.search, mode: 'insensitive' } },
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } }
      ];
    }

    const [affiliates, total] = await Promise.all([
      prisma.affiliate.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0
      }),
      prisma.affiliate.count({ where })
    ]);

    return {
      affiliates: affiliates as AffiliateData[],
      total,
      hasMore: (filters.offset || 0) + affiliates.length < total
    };
  }

  /**
   * Atualiza atividade do afiliado
   */
  static async updateActivity(affiliateId: string): Promise<void> {
    await prisma.affiliate.update({
      where: { id: affiliateId },
      data: { lastActivityAt: new Date() }
    });
  }

  /**
   * Gera código único do afiliado
   */
  private static async generateUniqueAffiliateCode(): Promise<string> {
    let code: string;
    let isUnique = false;

    do {
      // Gerar código alfanumérico de 8 caracteres
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Verificar se é único
      const existing = await prisma.affiliate.findUnique({
        where: { affiliateCode: code }
      });
      
      isUnique = !existing;
    } while (!isUnique);

    return code;
  }

  /**
   * Atualiza contadores do sponsor
   */
  private static async updateSponsorCounters(sponsorId: string): Promise<void> {
    // Contar indicações diretas
    const directCount = await prisma.affiliate.count({
      where: { sponsorId }
    });

    // Contar indicações totais (recursivo)
    const totalCount = await this.countTotalIndications(sponsorId);

    await prisma.affiliate.update({
      where: { id: sponsorId },
      data: {
        directIndications: directCount,
        totalIndications: totalCount
      }
    });
  }

  /**
   * Conta indicações totais recursivamente
   */
  private static async countTotalIndications(affiliateId: string): Promise<number> {
    const directChildren = await prisma.affiliate.findMany({
      where: { sponsorId: affiliateId },
      select: { id: true }
    });

    let total = directChildren.length;

    for (const child of directChildren) {
      total += await this.countTotalIndications(child.id);
    }

    return total;
  }

  /**
   * Busca comissões no período
   */
  private static async getCommissionsInPeriod(
    affiliateId: string, 
    startDate: Date, 
    endDate: Date
  ) {
    return prisma.commission.findMany({
      where: {
        affiliateId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Busca indicações no período
   */
  private static async getIndicationsInPeriod(
    affiliateId: string, 
    startDate: Date, 
    endDate: Date
  ) {
    return prisma.indication.findMany({
      where: {
        sourceAffiliateId: affiliateId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

