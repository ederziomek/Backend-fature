import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AffiliateService } from '@/services/affiliate.service';
import { CommissionService } from '@/services/commission.service';
import { 
  CreateAffiliateRequest,
  UpdateAffiliateRequest,
  ProcessTransactionRequest,
  GetHierarchyRequest,
  GetReportRequest,
  ApiResponse,
  AffiliateCategory,
  AffiliateStatus
} from '@/types';

export class AffiliateController {
  /**
   * Cria um novo afiliado
   */
  static async createAffiliate(
    request: FastifyRequest<{ Body: CreateAffiliateRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { userId, sponsorCode } = request.body;

      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'ID do usuário é obrigatório',
          statusCode: 400
        });
      }

      const affiliate = await AffiliateService.createAffiliate({
        userId,
        sponsorCode
      });

      return reply.status(201).send({
        success: true,
        data: affiliate,
        message: 'Afiliado criado com sucesso',
        statusCode: 201
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Busca afiliado por ID
   */
  static async getAffiliate(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;

      const affiliate = await AffiliateService.getAffiliateById(id);

      if (!affiliate) {
        return reply.status(404).send({
          success: false,
          error: 'Afiliado não encontrado',
          statusCode: 404
        });
      }

      return reply.status(200).send({
        success: true,
        data: affiliate,
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Busca afiliado por código
   */
  static async getAffiliateByCode(
    request: FastifyRequest<{ Params: { code: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { code } = request.params;

      const affiliate = await AffiliateService.getAffiliateByCode(code);

      if (!affiliate) {
        return reply.status(404).send({
          success: false,
          error: 'Afiliado não encontrado',
          statusCode: 404
        });
      }

      return reply.status(200).send({
        success: true,
        data: affiliate,
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Atualiza dados do afiliado
   */
  static async updateAffiliate(
    request: FastifyRequest<{ 
      Params: { id: string };
      Body: UpdateAffiliateRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const affiliate = await AffiliateService.updateAffiliate(id, updateData);

      return reply.status(200).send({
        success: true,
        data: affiliate,
        message: 'Afiliado atualizado com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Lista afiliados com filtros
   */
  static async listAffiliates(
    request: FastifyRequest<{ 
      Querystring: {
        category?: AffiliateCategory;
        status?: AffiliateStatus;
        sponsorId?: string;
        search?: string;
        limit?: string;
        offset?: string;
      }
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const {
        category,
        status,
        sponsorId,
        search,
        limit = '50',
        offset = '0'
      } = request.query;

      const result = await AffiliateService.listAffiliates({
        category,
        status,
        sponsorId,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return reply.status(200).send({
        success: true,
        data: result,
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Obtém hierarquia MLM do afiliado
   */
  static async getHierarchy(
    request: FastifyRequest<{ 
      Params: { id: string };
      Querystring: { maxLevels?: string; includeInactive?: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const { maxLevels = '5' } = request.query;

      const hierarchy = await AffiliateService.getHierarchy(
        id, 
        parseInt(maxLevels)
      );

      return reply.status(200).send({
        success: true,
        data: hierarchy,
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Obtém estrutura MLM completa
   */
  static async getMLMStructure(
    request: FastifyRequest<{ 
      Params: { id: string };
      Querystring: { maxDepth?: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const { maxDepth = '3' } = request.query;

      const structure = await AffiliateService.getMLMStructure(
        id, 
        parseInt(maxDepth)
      );

      return reply.status(200).send({
        success: true,
        data: structure,
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Processa transação e calcula comissões
   */
  static async processTransaction(
    request: FastifyRequest<{ Body: ProcessTransactionRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const {
        customerId,
        affiliateId,
        type,
        amount,
        validationModel,
        metadata
      } = request.body;

      // Validações básicas
      if (!customerId || !affiliateId || !type || !amount || !validationModel) {
        return reply.status(400).send({
          success: false,
          error: 'Todos os campos são obrigatórios',
          statusCode: 400
        });
      }

      if (amount <= 0) {
        return reply.status(400).send({
          success: false,
          error: 'Valor deve ser maior que zero',
          statusCode: 400
        });
      }

      // Gerar ID da transação
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calcular comissões CPA
      const result = await CommissionService.calculateCPACommissions({
        transactionAmount: amount,
        affiliateId,
        transactionType: type,
        validationModel,
        customerId,
        transactionId,
        metadata
      });

      return reply.status(200).send({
        success: true,
        data: {
          transactionId,
          ...result
        },
        message: 'Transação processada com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Gera relatório do afiliado
   */
  static async generateReport(
    request: FastifyRequest<{ 
      Params: { id: string };
      Querystring: {
        startDate: string;
        endDate: string;
        includeCommissions?: string;
        includeIndications?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const {
        startDate,
        endDate,
        includeCommissions = 'true',
        includeIndications = 'true'
      } = request.query;

      if (!startDate || !endDate) {
        return reply.status(400).send({
          success: false,
          error: 'Data de início e fim são obrigatórias',
          statusCode: 400
        });
      }

      const report = await AffiliateService.generateReport({
        affiliateId: id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        includeCommissions: includeCommissions === 'true',
        includeIndications: includeIndications === 'true'
      });

      return reply.status(200).send({
        success: true,
        data: report,
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Obtém filhos diretos do afiliado
   */
  static async getDirectChildren(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;

      const children = await AffiliateService.getDirectChildren(id);

      return reply.status(200).send({
        success: true,
        data: children,
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }

  /**
   * Atualiza atividade do afiliado
   */
  static async updateActivity(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;

      await AffiliateService.updateActivity(id);

      return reply.status(200).send({
        success: true,
        message: 'Atividade atualizada com sucesso',
        statusCode: 200
      });

    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        statusCode: 400
      });
    }
  }
}

