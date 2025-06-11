import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ConfigurationService } from '../services/configurationService';
import { ValidationService } from '../services/validationService';
import { VersioningService } from '../services/versioningService';
import { ConfigurationUpdate } from '../types/configuration';

export class ConfigurationController {
  private configurationService: ConfigurationService;
  private validationService: ValidationService;
  private versioningService: VersioningService;

  constructor() {
    this.configurationService = new ConfigurationService();
    this.validationService = new ValidationService();
    this.versioningService = new VersioningService();
  }

  async getConfiguration(request: FastifyRequest<{ 
    Params: { section: string } 
  }>, reply: FastifyReply) {
    try {
      const { section } = request.params;
      
      const configuration = await this.configurationService.getConfiguration(section);
      
      if (!configuration) {
        return reply.status(404).send({
          error: 'Configuration not found'
        });
      }

      return reply.send({
        success: true,
        data: configuration
      });
    } catch (error) {
      return reply.status(500).send({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateConfiguration(request: FastifyRequest<{ 
    Params: { section: string }
  }>, reply: FastifyReply) {
    try {
      const { section } = request.params;
      const body = request.body as { data: any; reason: string; userId?: string };
      
      const updateData: ConfigurationUpdate = {
        section,
        data: body.data,
        reason: body.reason,
        userId: body.userId || 'system'
      };

      // Validar dados de entrada
      const isValid = await this.validationService.validateConfiguration(section, updateData.data);
      if (!isValid) {
        return reply.status(400).send({
          error: 'Validation failed',
          message: 'Configuration data is invalid'
        });
      }

      // Atualizar configuração
      await this.configurationService.updateConfiguration(updateData.section, updateData.data, 'latest');
      
      // Criar versão
      const version = await this.versioningService.createVersion(updateData);

      return reply.send({
        success: true,
        data: {
          section,
          version: version.version,
          updatedAt: version.createdAt
        }
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async validateConfiguration(request: FastifyRequest<{ 
    Params: { section: string }
  }>, reply: FastifyReply) {
    try {
      const { section } = request.params;
      const body = request.body as { data: any };

      const isValid = await this.validationService.validateConfiguration(section, body.data);
      
      return reply.send({
        success: true,
        valid: isValid
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getConfigurationHistory(request: FastifyRequest<{ 
    Params: { section: string } 
  }>, reply: FastifyReply) {
    try {
      const { section } = request.params;
      
      const history = await this.versioningService.getHistory(section);
      
      return reply.send({
        success: true,
        data: history
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async rollbackConfiguration(request: FastifyRequest<{ 
    Params: { section: string }
  }>, reply: FastifyReply) {
    try {
      const { section } = request.params;
      const body = request.body as { version: string };
      
      await this.versioningService.rollbackToVersion(section, body.version);
      
      return reply.send({
        success: true,
        message: 'Configuration rolled back successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async exportAllConfigurations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const configurations = await this.configurationService.exportAll();
      
      return reply.send({
        success: true,
        data: configurations
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async importConfigurations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as { data: any };
      
      await this.configurationService.importAll(body.data);
      
      return reply.send({
        success: true,
        message: 'Configurations imported successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

