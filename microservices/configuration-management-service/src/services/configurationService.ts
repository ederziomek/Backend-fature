import Redis from 'ioredis';
import { ConfigurationSchema } from '../types/configuration';

export class ConfigurationService {
  private redis: Redis;
  private configurations: Map<string, any> = new Map();

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });
    
    this.loadDefaultConfigurations();
  }

  private async loadDefaultConfigurations() {
    // Carregar configurações padrão do sistema
    const defaultConfig: Partial<ConfigurationSchema> = {
      categories: {
        jogador: {
          levels: 5,
          indicationRange: [0, 9],
          revShareRange: [25, 30],
          bonification: 50,
          features: ['dashboard_basic', 'wallet', 'content']
        },
        iniciante: {
          levels: 5,
          indicationRange: [10, 49],
          revShareRange: [30, 35],
          bonification: 100,
          features: ['dashboard_basic', 'wallet', 'content', 'reports_basic', 'chests_basic']
        },
        afiliado: {
          levels: 5,
          indicationRange: [50, 199],
          revShareRange: [35, 40],
          bonification: 200,
          features: ['dashboard_basic', 'wallet', 'content', 'reports_basic', 'chests_all', 'rankings_basic']
        },
        profissional: {
          levels: 5,
          indicationRange: [200, 499],
          revShareRange: [40, 45],
          bonification: 500,
          features: ['dashboard_basic', 'wallet', 'content', 'reports_advanced', 'chests_all', 'rankings_basic', 'network_management', 'api_basic']
        },
        expert: {
          levels: 5,
          indicationRange: [500, 999],
          revShareRange: [45, 50],
          bonification: 1000,
          features: ['all']
        },
        mestre: {
          levels: 5,
          indicationRange: [1000, 1999],
          revShareRange: [50, 55],
          bonification: 2000,
          features: ['all']
        },
        lenda: {
          levels: 5,
          indicationRange: [2000, 999999],
          revShareRange: [55, 60],
          bonification: 5000,
          features: ['all']
        }
      },
      cpa: {
        values: {
          level1: 50,
          level2: 25,
          level3: 15,
          level4: 10,
          level5: 5
        },
        validationCriteria: {
          option1: {
            minimumDeposit: 30,
            minimumBets: 10
          },
          option2: {
            minimumDeposit: 30,
            minimumGGR: 20
          }
        }
      },
      gamification: {
        dailyIndication: {
          day1: { base: 10, bonus: 0, total: 10 },
          day2: { base: 10, bonus: 5, total: 15 },
          day3: { base: 10, bonus: 0, total: 10 },
          day4: { base: 10, bonus: 10, total: 20 },
          day5: { base: 10, bonus: 0, total: 10 },
          day6: { base: 10, bonus: 15, total: 25 },
          day7: { base: 10, bonus: 20, total: 30 }
        },
        chests: {
          silver: { successRate: [70, 80], type: 'financial' },
          gold: { successRate: [40, 50], type: 'financial' },
          sapphire: { successRate: [15, 25], type: 'financial' },
          diamond: { successRate: [5, 10], type: 'financial' }
        },
        algorithm: {
          historicalWindow: 8,
          recentDataWeight: 0.7,
          oldDataWeight: 0.3,
          seasonalityFactor: 1.1,
          trendFactor: 1.2,
          minimumGoal: 1
        }
      },
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
      vault: {
        schedule: {
          frequency: 'weekly',
          dayOfWeek: 1,
          hour: 10,
          timezone: 'America/Sao_Paulo'
        },
        limits: {
          minimumAmount: 100
        },
        distribution: {
          affiliatesPercentage: 96,
          rankingsPercentage: 4
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
        },
        inactivityReduction: {
          schedule: {
            '1_week': 5,
            '2_weeks': 10,
            '3_weeks': 20,
            '4_weeks': 30,
            '5_weeks': 40,
            '6_weeks': 50,
            '7_weeks': 60,
            '8_weeks': 75,
            '9_weeks': 100
          },
          reactivation: {
            jogador: 1,
            iniciante: 2,
            afiliado: 3,
            profissional: 5,
            expert: 8,
            mestre: 12,
            lenda: 20
          }
        }
      },
      system: {
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        language: 'pt-BR',
        cacheTTL: 3600,
        backupSchedule: '0 2 * * *'
      }
    };

    // Salvar configurações padrão
    for (const [section, config] of Object.entries(defaultConfig)) {
      await this.setConfiguration(section, config);
    }
  }

  async getConfiguration(section: string): Promise<any> {
    try {
      // Tentar buscar do cache local primeiro
      if (this.configurations.has(section)) {
        return this.configurations.get(section);
      }

      // Buscar do Redis
      const cached = await this.redis.get(`config:${section}`);
      if (cached) {
        const config = JSON.parse(cached);
        this.configurations.set(section, config);
        return config;
      }

      return null;
    } catch (error) {
      console.error(`Error getting configuration for section ${section}:`, error);
      return null;
    }
  }

  async setConfiguration(section: string, data: any): Promise<void> {
    try {
      // Salvar no cache local
      this.configurations.set(section, data);

      // Salvar no Redis
      await this.redis.set(`config:${section}`, JSON.stringify(data));
      
      // Definir TTL se configurado
      const ttl = await this.getConfiguration('system');
      if (ttl?.cacheTTL) {
        await this.redis.expire(`config:${section}`, ttl.cacheTTL);
      }
    } catch (error) {
      console.error(`Error setting configuration for section ${section}:`, error);
      throw error;
    }
  }

  async updateConfiguration(section: string, data: any, versionId: string): Promise<void> {
    await this.setConfiguration(section, data);
    
    // Invalidar cache de outros serviços
    await this.invalidateCache(section);
    
    // Log da atualização
    console.log(`Configuration updated: ${section} (version: ${versionId})`);
  }

  async invalidateCache(section: string): Promise<void> {
    try {
      // Publicar evento de invalidação para outros serviços
      await this.redis.publish('config:invalidate', JSON.stringify({ section }));
    } catch (error) {
      console.error(`Error invalidating cache for section ${section}:`, error);
    }
  }

  async exportAll(): Promise<any> {
    const allConfigs: any = {};
    
    for (const [section, config] of this.configurations.entries()) {
      allConfigs[section] = config;
    }

    return allConfigs;
  }

  async importAll(data: any): Promise<void> {
    for (const [section, config] of Object.entries(data)) {
      await this.setConfiguration(section, config);
    }
  }

  async getAllSections(): Promise<string[]> {
    return Array.from(this.configurations.keys());
  }
}

