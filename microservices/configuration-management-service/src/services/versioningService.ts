import { v4 as uuidv4 } from 'uuid';
import { ConfigurationVersion, ConfigurationUpdate } from '../types/configuration';

export class VersioningService {
  private versions: Map<string, ConfigurationVersion[]> = new Map();

  async createVersion(updateData: ConfigurationUpdate): Promise<ConfigurationVersion> {
    const version: ConfigurationVersion = {
      id: uuidv4(),
      section: updateData.section,
      version: this.generateVersionNumber(updateData.section),
      data: updateData.data,
      createdBy: updateData.userId,
      createdAt: new Date(),
      reason: updateData.reason,
      approved: true, // Auto-aprovação por enquanto
      approvedBy: updateData.userId,
      approvedAt: new Date()
    };

    // Armazenar versão
    if (!this.versions.has(updateData.section)) {
      this.versions.set(updateData.section, []);
    }
    
    const sectionVersions = this.versions.get(updateData.section)!;
    sectionVersions.push(version);

    // Manter apenas as últimas 50 versões por seção
    if (sectionVersions.length > 50) {
      sectionVersions.splice(0, sectionVersions.length - 50);
    }

    return version;
  }

  private generateVersionNumber(section: string): string {
    const sectionVersions = this.versions.get(section) || [];
    const lastVersion = sectionVersions[sectionVersions.length - 1];
    
    if (!lastVersion) {
      return '1.0.0';
    }

    const [major, minor, patch] = lastVersion.version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  async getHistory(section: string, limit: number = 20): Promise<ConfigurationVersion[]> {
    const sectionVersions = this.versions.get(section) || [];
    return sectionVersions
      .slice(-limit)
      .reverse(); // Mais recentes primeiro
  }

  async getVersion(section: string, versionId: string): Promise<ConfigurationVersion | null> {
    const sectionVersions = this.versions.get(section) || [];
    return sectionVersions.find(v => v.id === versionId) || null;
  }

  async rollbackToVersion(section: string, versionId: string): Promise<void> {
    const version = await this.getVersion(section, versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found for section ${section}`);
    }

    // Criar nova versão com os dados da versão de rollback
    const rollbackUpdate: ConfigurationUpdate = {
      section,
      data: version.data,
      reason: `Rollback to version ${version.version}`,
      userId: 'system'
    };

    await this.createVersion(rollbackUpdate);
  }

  async compareVersions(section: string, version1Id: string, version2Id: string): Promise<any> {
    const v1 = await this.getVersion(section, version1Id);
    const v2 = await this.getVersion(section, version2Id);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    return {
      version1: {
        id: v1.id,
        version: v1.version,
        createdAt: v1.createdAt,
        data: v1.data
      },
      version2: {
        id: v2.id,
        version: v2.version,
        createdAt: v2.createdAt,
        data: v2.data
      },
      differences: this.calculateDifferences(v1.data, v2.data)
    };
  }

  private calculateDifferences(data1: any, data2: any): any {
    // Implementação simples de diff - pode ser expandida
    const differences: any = {};

    const allKeys = new Set([...Object.keys(data1), ...Object.keys(data2)]);
    
    for (const key of allKeys) {
      if (data1[key] !== data2[key]) {
        differences[key] = {
          old: data1[key],
          new: data2[key]
        };
      }
    }

    return differences;
  }

  async getLatestVersion(section: string): Promise<ConfigurationVersion | null> {
    const sectionVersions = this.versions.get(section) || [];
    return sectionVersions[sectionVersions.length - 1] || null;
  }

  async getAllVersions(): Promise<Map<string, ConfigurationVersion[]>> {
    return new Map(this.versions);
  }
}

