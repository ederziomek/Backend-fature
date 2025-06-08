// ===============================================
// SERVIÇO DE GESTÃO DE USUÁRIOS - ADMIN SERVICE
// ===============================================

import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { 
  UserManagement, 
  UserFilters, 
  PaginatedResponse,
  AdminUser,
  CreateAdminRequest,
  UpdateAdminRequest
} from '@/types';
import axios from 'axios';
import { adminConfig } from '@/config';
import bcrypt from 'bcryptjs';

export class UserManagementService {
  /**
   * Lista usuários com filtros e paginação
   */
  static async listUsers(filters: UserFilters): Promise<PaginatedResponse<UserManagement>> {
    try {
      const {
        status,
        isAffiliate,
        dateFrom,
        dateTo,
        search,
        page = 1,
        limit = 20
      } = filters;

      // Chamar Auth Service para obter usuários
      const response = await axios.get(`${adminConfig.services.auth}/api/v1/users`, {
        params: {
          status,
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
          search,
          page,
          limit
        }
      });

      const users = response.data.data.users || [];
      const total = response.data.data.total || 0;

      // Enriquecer dados com informações de afiliados
      const enrichedUsers = await Promise.all(
        users.map(async (user: any) => {
          let affiliateData = null;
          
          if (isAffiliate !== false) {
            try {
              const affiliateResponse = await axios.get(
                `${adminConfig.services.affiliate}/api/v1/affiliates/user/${user.id}`
              );
              affiliateData = affiliateResponse.data.data;
            } catch (error) {
              // Usuário não é afiliado
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            status: user.status,
            isAffiliate: !!affiliateData,
            affiliateCode: affiliateData?.affiliateCode,
            totalCommissions: affiliateData?.totalCommissions || 0,
            lastActivityAt: user.lastActivityAt ? new Date(user.lastActivityAt) : undefined,
            createdAt: new Date(user.createdAt)
          };
        })
      );

      // Filtrar por afiliado se necessário
      const filteredUsers = isAffiliate !== undefined 
        ? enrichedUsers.filter(user => user.isAffiliate === isAffiliate)
        : enrichedUsers;

      return {
        items: filteredUsers,
        pagination: {
          page,
          limit,
          total: filteredUsers.length,
          pages: Math.ceil(filteredUsers.length / limit)
        }
      };

    } catch (error: any) {
      console.error('Erro ao listar usuários:', error);
      throw error;
    }
  }

  /**
   * Obtém detalhes de um usuário
   */
  static async getUserDetails(userId: string): Promise<UserManagement | null> {
    try {
      // Buscar usuário no Auth Service
      const userResponse = await axios.get(`${adminConfig.services.auth}/api/v1/users/${userId}`);
      const user = userResponse.data.data;

      if (!user) return null;

      // Buscar dados de afiliado se existir
      let affiliateData = null;
      try {
        const affiliateResponse = await axios.get(
          `${adminConfig.services.affiliate}/api/v1/affiliates/user/${userId}`
        );
        affiliateData = affiliateResponse.data.data;
      } catch (error) {
        // Usuário não é afiliado
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        isAffiliate: !!affiliateData,
        affiliateCode: affiliateData?.affiliateCode,
        totalCommissions: affiliateData?.totalCommissions || 0,
        lastActivityAt: user.lastActivityAt ? new Date(user.lastActivityAt) : undefined,
        createdAt: new Date(user.createdAt)
      };

    } catch (error: any) {
      console.error('Erro ao obter detalhes do usuário:', error);
      throw error;
    }
  }

  /**
   * Atualiza status de um usuário
   */
  static async updateUserStatus(
    userId: string, 
    status: string, 
    adminId: string
  ): Promise<void> {
    try {
      // Atualizar no Auth Service
      await axios.put(`${adminConfig.services.auth}/api/v1/users/${userId}/status`, {
        status,
        updatedBy: adminId
      });

      // Log de auditoria
      await this.logAdminAction({
        action: 'user.status.updated',
        resource: 'user',
        resourceId: userId,
        adminId,
        details: { newStatus: status }
      });

    } catch (error: any) {
      console.error('Erro ao atualizar status do usuário:', error);
      throw error;
    }
  }

  /**
   * Suspende um usuário
   */
  static async suspendUser(
    userId: string, 
    reason: string, 
    adminId: string
  ): Promise<void> {
    try {
      // Suspender no Auth Service
      await axios.post(`${adminConfig.services.auth}/api/v1/users/${userId}/suspend`, {
        reason,
        suspendedBy: adminId
      });

      // Se for afiliado, suspender também
      try {
        await axios.put(`${adminConfig.services.affiliate}/api/v1/affiliates/user/${userId}`, {
          status: 'suspended'
        });
      } catch (error) {
        // Usuário não é afiliado
      }

      // Log de auditoria
      await this.logAdminAction({
        action: 'user.suspended',
        resource: 'user',
        resourceId: userId,
        adminId,
        details: { reason }
      });

    } catch (error: any) {
      console.error('Erro ao suspender usuário:', error);
      throw error;
    }
  }

  /**
   * Reativa um usuário
   */
  static async reactivateUser(userId: string, adminId: string): Promise<void> {
    try {
      // Reativar no Auth Service
      await axios.post(`${adminConfig.services.auth}/api/v1/users/${userId}/reactivate`, {
        reactivatedBy: adminId
      });

      // Se for afiliado, reativar também
      try {
        await axios.put(`${adminConfig.services.affiliate}/api/v1/affiliates/user/${userId}`, {
          status: 'active'
        });
      } catch (error) {
        // Usuário não é afiliado
      }

      // Log de auditoria
      await this.logAdminAction({
        action: 'user.reactivated',
        resource: 'user',
        resourceId: userId,
        adminId,
        details: {}
      });

    } catch (error: any) {
      console.error('Erro ao reativar usuário:', error);
      throw error;
    }
  }

  /**
   * Lista administradores
   */
  static async listAdmins(): Promise<AdminUser[]> {
    try {
      const admins = await prisma.adminUser.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });

      return admins.map(admin => ({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role as any,
        status: admin.status as any,
        permissions: admin.permissions as any[],
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }));

    } catch (error: any) {
      console.error('Erro ao listar administradores:', error);
      throw error;
    }
  }

  /**
   * Cria novo administrador
   */
  static async createAdmin(data: CreateAdminRequest, createdBy: string): Promise<AdminUser> {
    try {
      // Verificar se email já existe
      const existingAdmin = await prisma.adminUser.findUnique({
        where: { email: data.email }
      });

      if (existingAdmin) {
        throw new Error('Email já está em uso');
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(data.password, adminConfig.security.bcryptRounds);

      // Criar administrador
      const admin = await prisma.adminUser.create({
        data: {
          email: data.email,
          name: data.name,
          password: hashedPassword,
          role: data.role,
          status: 'active',
          permissions: data.permissions || []
        }
      });

      // Log de auditoria
      await this.logAdminAction({
        action: 'admin.created',
        resource: 'admin',
        resourceId: admin.id,
        adminId: createdBy,
        details: { 
          email: data.email,
          name: data.name,
          role: data.role
        }
      });

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role as any,
        status: admin.status as any,
        permissions: admin.permissions as any[],
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      };

    } catch (error: any) {
      console.error('Erro ao criar administrador:', error);
      throw error;
    }
  }

  /**
   * Atualiza administrador
   */
  static async updateAdmin(
    adminId: string, 
    data: UpdateAdminRequest, 
    updatedBy: string
  ): Promise<AdminUser> {
    try {
      const admin = await prisma.adminUser.update({
        where: { id: adminId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      // Log de auditoria
      await this.logAdminAction({
        action: 'admin.updated',
        resource: 'admin',
        resourceId: adminId,
        adminId: updatedBy,
        details: data
      });

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role as any,
        status: admin.status as any,
        permissions: admin.permissions as any[],
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      };

    } catch (error: any) {
      console.error('Erro ao atualizar administrador:', error);
      throw error;
    }
  }

  /**
   * Remove administrador
   */
  static async deleteAdmin(adminId: string, deletedBy: string): Promise<void> {
    try {
      await prisma.adminUser.delete({
        where: { id: adminId }
      });

      // Log de auditoria
      await this.logAdminAction({
        action: 'admin.deleted',
        resource: 'admin',
        resourceId: adminId,
        adminId: deletedBy,
        details: {}
      });

    } catch (error: any) {
      console.error('Erro ao remover administrador:', error);
      throw error;
    }
  }

  /**
   * Log de ação administrativa
   */
  private static async logAdminAction(data: {
    action: string;
    resource: string;
    resourceId: string;
    adminId: string;
    details: any;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          adminId: data.adminId,
          details: data.details,
          severity: 'info',
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error);
    }
  }
}

