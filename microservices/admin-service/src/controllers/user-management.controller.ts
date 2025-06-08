// ===============================================
// CONTROLADOR DE GESTÃO DE USUÁRIOS - ADMIN SERVICE
// ===============================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserManagementService } from '@/services/user-management.service';
import { 
  UserFilters, 
  CreateAdminRequest, 
  UpdateAdminRequest,
  ApiResponse 
} from '@/types';

export class UserManagementController {
  /**
   * Lista usuários com filtros
   */
  static async listUsers(
    request: FastifyRequest<{ Querystring: UserFilters }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const filters = request.query;
      const result = await UserManagementService.listUsers(filters);

      return reply.status(200).send({
        success: true,
        data: result,
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
   * Obtém detalhes de um usuário
   */
  static async getUserDetails(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const user = await UserManagementService.getUserDetails(id);

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'Usuário não encontrado',
          statusCode: 404
        });
      }

      return reply.status(200).send({
        success: true,
        data: user,
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
   * Atualiza status de um usuário
   */
  static async updateUserStatus(
    request: FastifyRequest<{ 
      Params: { id: string };
      Body: { status: string } 
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const { status } = request.body;
      const adminId = (request as any).admin?.id; // Vem do middleware de auth

      await UserManagementService.updateUserStatus(id, status, adminId);

      return reply.status(200).send({
        success: true,
        message: 'Status do usuário atualizado com sucesso',
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
   * Suspende um usuário
   */
  static async suspendUser(
    request: FastifyRequest<{ 
      Params: { id: string };
      Body: { reason: string } 
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const { reason } = request.body;
      const adminId = (request as any).admin?.id;

      await UserManagementService.suspendUser(id, reason, adminId);

      return reply.status(200).send({
        success: true,
        message: 'Usuário suspenso com sucesso',
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
   * Reativa um usuário
   */
  static async reactivateUser(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const adminId = (request as any).admin?.id;

      await UserManagementService.reactivateUser(id, adminId);

      return reply.status(200).send({
        success: true,
        message: 'Usuário reativado com sucesso',
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
   * Lista administradores
   */
  static async listAdmins(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const admins = await UserManagementService.listAdmins();

      return reply.status(200).send({
        success: true,
        data: admins,
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
   * Cria novo administrador
   */
  static async createAdmin(
    request: FastifyRequest<{ Body: CreateAdminRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const data = request.body;
      const createdBy = (request as any).admin?.id;

      const admin = await UserManagementService.createAdmin(data, createdBy);

      return reply.status(201).send({
        success: true,
        data: admin,
        message: 'Administrador criado com sucesso',
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
   * Atualiza administrador
   */
  static async updateAdmin(
    request: FastifyRequest<{ 
      Params: { id: string };
      Body: UpdateAdminRequest 
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const data = request.body;
      const updatedBy = (request as any).admin?.id;

      const admin = await UserManagementService.updateAdmin(id, data, updatedBy);

      return reply.status(200).send({
        success: true,
        data: admin,
        message: 'Administrador atualizado com sucesso',
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
   * Remove administrador
   */
  static async deleteAdmin(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const deletedBy = (request as any).admin?.id;

      await UserManagementService.deleteAdmin(id, deletedBy);

      return reply.status(200).send({
        success: true,
        message: 'Administrador removido com sucesso',
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

