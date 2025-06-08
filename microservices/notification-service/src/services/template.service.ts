import { PrismaClient } from '@prisma/client';
import { NotificationCache } from '@/config/redis';
import {
  NotificationTemplate,
  NotificationType,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from '@/types';

export class TemplateService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Cria um novo template
   */
  async createTemplate(data: CreateTemplateRequest): Promise<NotificationTemplate> {
    // Validar variáveis no conteúdo
    this.validateTemplateVariables(data.content, data.variables);
    if (data.subject) {
      this.validateTemplateVariables(data.subject, data.variables);
    }

    const template = await this.prisma.notificationTemplate.create({
      data: {
        name: data.name,
        type: data.type,
        subject: data.subject,
        content: data.content,
        variables: data.variables,
      },
    });

    // Limpar cache relacionado
    await this.clearTemplateCache(template.id);

    return template;
  }

  /**
   * Atualiza um template existente
   */
  async updateTemplate(id: string, data: UpdateTemplateRequest): Promise<NotificationTemplate> {
    // Buscar template atual
    const existingTemplate = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      throw new Error('Template não encontrado');
    }

    // Validar variáveis se conteúdo foi alterado
    if (data.content || data.variables) {
      const content = data.content || existingTemplate.content;
      const variables = data.variables || existingTemplate.variables;
      this.validateTemplateVariables(content, variables);
    }

    if (data.subject || data.variables) {
      const subject = data.subject || existingTemplate.subject;
      const variables = data.variables || existingTemplate.variables;
      if (subject) {
        this.validateTemplateVariables(subject, variables);
      }
    }

    const template = await this.prisma.notificationTemplate.update({
      where: { id },
      data,
    });

    // Limpar cache
    await this.clearTemplateCache(id);

    return template;
  }

  /**
   * Busca template por ID
   */
  async getTemplate(id: string): Promise<NotificationTemplate | null> {
    return await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
  }

  /**
   * Lista templates com filtros
   */
  async listTemplates(
    type?: NotificationType,
    isActive?: boolean,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    templates: NotificationTemplate[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where: any = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive;

    const [templates, total] = await Promise.all([
      this.prisma.notificationTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificationTemplate.count({ where }),
    ]);

    return {
      templates,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Deleta um template
   */
  async deleteTemplate(id: string): Promise<void> {
    // Verificar se template está sendo usado
    const usageCount = await this.prisma.notificationLog.count({
      where: { templateId: id },
    });

    if (usageCount > 0) {
      // Apenas desativar se estiver sendo usado
      await this.prisma.notificationTemplate.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Deletar se não estiver sendo usado
      await this.prisma.notificationTemplate.delete({
        where: { id },
      });
    }

    // Limpar cache
    await this.clearTemplateCache(id);
  }

  /**
   * Duplica um template
   */
  async duplicateTemplate(id: string, newName: string): Promise<NotificationTemplate> {
    const originalTemplate = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!originalTemplate) {
      throw new Error('Template não encontrado');
    }

    const duplicatedTemplate = await this.prisma.notificationTemplate.create({
      data: {
        name: newName,
        type: originalTemplate.type,
        subject: originalTemplate.subject,
        content: originalTemplate.content,
        variables: originalTemplate.variables,
        isActive: false, // Criar como inativo por padrão
      },
    });

    return duplicatedTemplate;
  }

  /**
   * Valida se todas as variáveis usadas no template estão declaradas
   */
  private validateTemplateVariables(content: string, declaredVariables: string[]): void {
    // Extrair variáveis do template (formato {{variavel}})
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const usedVariables = new Set<string>();
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      if (match[1]) {
        const variable = match[1].trim();
        usedVariables.add(variable);
      }
    }

    // Verificar se todas as variáveis usadas estão declaradas
    const undeclaredVariables = Array.from(usedVariables).filter(
      variable => !declaredVariables.includes(variable)
    );

    if (undeclaredVariables.length > 0) {
      throw new Error(
        `Variáveis não declaradas encontradas no template: ${undeclaredVariables.join(', ')}`
      );
    }

    // Verificar se há variáveis declaradas mas não usadas (warning)
    const unusedVariables = declaredVariables.filter(
      variable => !usedVariables.has(variable)
    );

    if (unusedVariables.length > 0) {
      console.warn(
        `Variáveis declaradas mas não utilizadas no template: ${unusedVariables.join(', ')}`
      );
    }
  }

  /**
   * Limpa cache do template
   */
  private async clearTemplateCache(templateId: string): Promise<void> {
    await NotificationCache.deleteTemplate(templateId);
  }

  /**
   * Busca templates por categoria (baseado no nome ou variáveis)
   */
  async getTemplatesByCategory(category: string): Promise<NotificationTemplate[]> {
    return await this.prisma.notificationTemplate.findMany({
      where: {
        OR: [
          { name: { contains: category, mode: 'insensitive' } },
          { variables: { has: category } },
        ],
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Testa renderização de um template
   */
  async testTemplate(
    id: string,
    variables: Record<string, any>
  ): Promise<{ subject?: string; content: string }> {
    const template = await this.getTemplate(id);
    if (!template) {
      throw new Error('Template não encontrado');
    }

    // Importar Handlebars aqui para evitar problemas de dependência circular
    const Handlebars = require('handlebars');

    try {
      const contentTemplate = Handlebars.compile(template.content);
      const content = contentTemplate(variables);

      let subject: string | undefined;
      if (template.subject) {
        const subjectTemplate = Handlebars.compile(template.subject);
        subject = subjectTemplate(variables);
      }

      return { subject, content };
    } catch (error) {
      throw new Error(`Erro ao renderizar template: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca estatísticas de uso dos templates
   */
  async getTemplateUsageStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{
    templateId: string;
    templateName: string;
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
  }>> {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const stats = await this.prisma.notificationLog.groupBy({
      by: ['templateId'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        // Assumindo que temos campos para contar sucessos/falhas
      },
    });

    // Buscar nomes dos templates
    const templateIds = stats.map(stat => stat.templateId);
    const templates = await this.prisma.notificationTemplate.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, name: true },
    });

    const templateMap = new Map(templates.map(t => [t.id, t.name]));

    // Calcular estatísticas detalhadas para cada template
    const detailedStats = await Promise.all(
      stats.map(async (stat) => {
        const [sent, delivered, failed] = await Promise.all([
          this.prisma.notificationLog.count({
            where: {
              templateId: stat.templateId,
              status: { in: ['SENT', 'DELIVERED'] },
              ...where,
            },
          }),
          this.prisma.notificationLog.count({
            where: {
              templateId: stat.templateId,
              status: 'DELIVERED',
              ...where,
            },
          }),
          this.prisma.notificationLog.count({
            where: {
              templateId: stat.templateId,
              status: 'FAILED',
              ...where,
            },
          }),
        ]);

        return {
          templateId: stat.templateId,
          templateName: templateMap.get(stat.templateId) || 'Template Desconhecido',
          totalSent: sent,
          totalDelivered: delivered,
          totalFailed: failed,
          deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
        };
      })
    );

    return detailedStats.sort((a, b) => b.totalSent - a.totalSent);
  }

  /**
   * Cria templates padrão do sistema
   */
  async createDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        name: 'Boas-vindas',
        type: NotificationType.EMAIL,
        subject: 'Bem-vindo ao Fature 100x, {{userName}}!',
        content: `
          <h1>Bem-vindo ao Fature 100x!</h1>
          <p>Olá {{userName}},</p>
          <p>É um prazer tê-lo conosco! Sua conta foi criada com sucesso.</p>
          <p>Seu código de afiliado é: <strong>{{affiliateCode}}</strong></p>
          <p>Comece agora mesmo a indicar amigos e ganhar comissões!</p>
          <p>Atenciosamente,<br>Equipe Fature 100x</p>
        `,
        variables: ['userName', 'affiliateCode'],
      },
      {
        name: 'Comissão CPA',
        type: NotificationType.EMAIL,
        subject: 'Nova comissão CPA recebida - R$ {{commissionAmount}}',
        content: `
          <h1>Parabéns! Nova comissão recebida!</h1>
          <p>Olá {{userName}},</p>
          <p>Você recebeu uma nova comissão CPA de <strong>R$ {{commissionAmount}}</strong>!</p>
          <p>Cliente: {{customerName}}</p>
          <p>Data: {{commissionDate}}</p>
          <p>Continue indicando e ganhe ainda mais!</p>
        `,
        variables: ['userName', 'commissionAmount', 'customerName', 'commissionDate'],
      },
      {
        name: 'Level Up',
        type: NotificationType.EMAIL,
        subject: 'Parabéns! Você subiu de level!',
        content: `
          <h1>🎉 Parabéns pelo seu progresso!</h1>
          <p>Olá {{userName}},</p>
          <p>Você acaba de atingir o <strong>{{newLevel}}</strong> na categoria <strong>{{category}}</strong>!</p>
          <p>Seu novo percentual de RevShare é: <strong>{{newRevSharePercentage}}%</strong></p>
          <p>Continue assim e alcance níveis ainda maiores!</p>
        `,
        variables: ['userName', 'newLevel', 'category', 'newRevSharePercentage'],
      },
    ];

    for (const template of defaultTemplates) {
      try {
        // Verificar se já existe
        const existing = await this.prisma.notificationTemplate.findFirst({
          where: { name: template.name },
        });

        if (!existing) {
          await this.createTemplate(template);
          console.log(`Template padrão criado: ${template.name}`);
        }
      } catch (error) {
        console.error(`Erro ao criar template padrão ${template.name}:`, error);
      }
    }
  }
}

