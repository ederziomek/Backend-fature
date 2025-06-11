import axios from 'axios';

export class ConfigurationClient {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 300000; // 5 minutos

  constructor(configServiceUrl?: string) {
    this.baseUrl = configServiceUrl || process.env.CONFIG_SERVICE_URL || 'http://localhost:3001/api';
  }

  async getConfiguration(section: string): Promise<any> {
    // Verificar cache
    const cached = this.cache.get(section);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/configurations/${section}`);
      const data = response.data.data;

      // Atualizar cache
      this.cache.set(section, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      console.error(`Error fetching configuration for section ${section}:`, error);
      
      // Retornar cache expirado se disponível
      if (cached) {
        return cached.data;
      }

      // Retornar configuração padrão
      return this.getDefaultConfiguration(section);
    }
  }

  async getRankingsConfig(): Promise<any> {
    return await this.getConfiguration('rankings');
  }

  async getSecurityConfig(): Promise<any> {
    return await this.getConfiguration('security');
  }

  async getCategoriesConfig(): Promise<any> {
    return await this.getConfiguration('categories');
  }

  async getGamificationConfig(): Promise<any> {
    return await this.getConfiguration('gamification');
  }

  async getVaultConfig(): Promise<any> {
    return await this.getConfiguration('vault');
  }

  async getCPAConfig(): Promise<any> {
    return await this.getConfiguration('cpa');
  }

  async getSystemConfig(): Promise<any> {
    return await this.getConfiguration('system');
  }

  invalidateCache(section?: string): void {
    if (section) {
      this.cache.delete(section);
    } else {
      this.cache.clear();
    }
  }

  private getDefaultConfiguration(section: string): any {
    // Configurações padrão de fallback
    const defaults: any = {
      rankings: {
        active: {
          individual_indications: {
            name: 'Indicação Válida',
            criteria: 'Número de indicações válidas individuais',
            ngrPercentage: 2,
            enabled: true
          },
          network_indications: {
            name: 'Indicação da Rede do Afiliado',
            criteria: 'Somatória total de indicações válidas da rede',
            ngrPercentage: 2,
            enabled: true
          }
        },
        distribution: {
          weeklyPercentage: 50,
          monthlyPercentage: 50,
          positionRanges: [
            { positions: '1', percentage: 30 },
            { positions: '2-3', percentage: 25 },
            { positions: '4-10', percentage: 25 },
            { positions: '11-50', percentage: 20 }
          ]
        }
      },
      security: {
        fraudDetection: {
          jogador: { indicationsPerHour: 2, flagEnabled: true },
          iniciante: { indicationsPerHour: 3, flagEnabled: true },
          afiliado: { indicationsPerHour: 5, flagEnabled: true },
          profissional: { indicationsPerHour: 8, flagEnabled: true },
          expert: { indicationsPerHour: 12, flagEnabled: false },
          mestre: { indicationsPerHour: 20, flagEnabled: false },
          lenda: { indicationsPerHour: 50, flagEnabled: false }
        }
      },
      categories: {
        jogador: { levels: 5, indicationRange: [0, 9], revShareRange: [25, 30], bonification: 50 },
        iniciante: { levels: 5, indicationRange: [10, 49], revShareRange: [30, 35], bonification: 100 },
        afiliado: { levels: 5, indicationRange: [50, 199], revShareRange: [35, 40], bonification: 200 },
        profissional: { levels: 5, indicationRange: [200, 499], revShareRange: [40, 45], bonification: 500 },
        expert: { levels: 5, indicationRange: [500, 999], revShareRange: [45, 50], bonification: 1000 },
        mestre: { levels: 5, indicationRange: [1000, 1999], revShareRange: [50, 55], bonification: 2000 },
        lenda: { levels: 5, indicationRange: [2000, 999999], revShareRange: [55, 60], bonification: 5000 }
      }
    };

    return defaults[section] || {};
  }
}

