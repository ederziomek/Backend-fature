import { 
  ConfigurationSchemaValidator,
  CategoryConfigSchema,
  CPAConfigSchema,
  GamificationConfigSchema,
  RankingsConfigSchema,
  VaultConfigSchema,
  SecurityConfigSchema,
  SystemConfigSchema
} from '../schemas/configurationSchema';

export class ValidationService {
  async validateConfiguration(section: string, data: any): Promise<boolean> {
    try {
      switch (section) {
        case 'categories':
          return this.validateCategories(data);
        case 'cpa':
          return this.validateCPA(data);
        case 'gamification':
          return this.validateGamification(data);
        case 'rankings':
          return this.validateRankings(data);
        case 'vault':
          return this.validateVault(data);
        case 'security':
          return this.validateSecurity(data);
        case 'system':
          return this.validateSystem(data);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Validation error for section ${section}:`, error);
      return false;
    }
  }

  private validateCategories(data: any): boolean {
    try {
      // Validar cada categoria
      for (const [categoryName, categoryConfig] of Object.entries(data)) {
        const result = CategoryConfigSchema.safeParse(categoryConfig);
        if (!result.success) {
          console.error(`Category validation failed for ${categoryName}:`, result.error);
          return false;
        }

        // Validações de negócio específicas
        const config = result.data;
        
        // Verificar se o range de indicações é válido
        if (config.indicationRange[0] >= config.indicationRange[1]) {
          console.error(`Invalid indication range for category ${categoryName}`);
          return false;
        }

        // Verificar se o range de RevShare é válido
        if (config.revShareRange[0] >= config.revShareRange[1]) {
          console.error(`Invalid RevShare range for category ${categoryName}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Categories validation error:', error);
      return false;
    }
  }

  private validateCPA(data: any): boolean {
    try {
      const result = CPAConfigSchema.safeParse(data);
      if (!result.success) {
        console.error('CPA validation failed:', result.error);
        return false;
      }

      // Validações de negócio específicas
      const config = result.data;

      // Verificar se os valores CPA são decrescentes por nível
      const values = Object.values(config.values);
      for (let i = 1; i < values.length; i++) {
        if (values[i] > values[i - 1]) {
          console.error('CPA values should be decreasing by level');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('CPA validation error:', error);
      return false;
    }
  }

  private validateGamification(data: any): boolean {
    try {
      const result = GamificationConfigSchema.safeParse(data);
      if (!result.success) {
        console.error('Gamification validation failed:', result.error);
        return false;
      }

      // Validações de negócio específicas
      const config = result.data;

      // Verificar se há exatamente 7 dias na indicação diária
      const dailyKeys = Object.keys(config.dailyIndication);
      if (dailyKeys.length !== 7) {
        console.error('Daily indication must have exactly 7 days');
        return false;
      }

      // Verificar se os valores de peso do algoritmo somam 1
      const totalWeight = config.algorithm.recentDataWeight + config.algorithm.oldDataWeight;
      if (Math.abs(totalWeight - 1) > 0.01) {
        console.error('Algorithm weights must sum to 1');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Gamification validation error:', error);
      return false;
    }
  }

  private validateRankings(data: any): boolean {
    try {
      const result = RankingsConfigSchema.safeParse(data);
      if (!result.success) {
        console.error('Rankings validation failed:', result.error);
        return false;
      }

      // Validações de negócio específicas
      const config = result.data;

      // Verificar se há exatamente 2 rankings ativos
      const activeRankings = Object.values(config.active).filter(r => r.enabled);
      if (activeRankings.length !== 2) {
        console.error('Must have exactly 2 active rankings');
        return false;
      }

      // Verificar se a soma dos percentuais de distribuição é 100%
      const totalDistribution = config.distribution.weeklyPercentage + config.distribution.monthlyPercentage;
      if (totalDistribution !== 100) {
        console.error('Distribution percentages must sum to 100%');
        return false;
      }

      // Verificar se a soma dos percentuais de posição é 100%
      const totalPositionPercentage = config.distribution.positionRanges.reduce(
        (sum, range) => sum + range.percentage, 0
      );
      if (totalPositionPercentage !== 100) {
        console.error('Position range percentages must sum to 100%');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Rankings validation error:', error);
      return false;
    }
  }

  private validateVault(data: any): boolean {
    try {
      const result = VaultConfigSchema.safeParse(data);
      if (!result.success) {
        console.error('Vault validation failed:', result.error);
        return false;
      }

      // Validações de negócio específicas
      const config = result.data;

      // Verificar se a soma dos percentuais de distribuição é 100%
      const totalDistribution = config.distribution.affiliatesPercentage + config.distribution.rankingsPercentage;
      if (totalDistribution !== 100) {
        console.error('Vault distribution percentages must sum to 100%');
        return false;
      }

      // Verificar se o valor máximo é maior que o mínimo (se definido)
      if (config.limits.maximumAmount && config.limits.maximumAmount <= config.limits.minimumAmount) {
        console.error('Maximum amount must be greater than minimum amount');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Vault validation error:', error);
      return false;
    }
  }

  private validateSecurity(data: any): boolean {
    try {
      const result = SecurityConfigSchema.safeParse(data);
      if (!result.success) {
        console.error('Security validation failed:', result.error);
        return false;
      }

      // Validações de negócio específicas
      const config = result.data;

      // Verificar se todas as categorias têm configuração de detecção de fraude
      const requiredCategories = ['jogador', 'iniciante', 'afiliado', 'profissional', 'expert', 'mestre', 'lenda'];
      for (const category of requiredCategories) {
        if (!config.fraudDetection[category]) {
          console.error(`Missing fraud detection config for category: ${category}`);
          return false;
        }
        if (!config.inactivityReduction.reactivation[category]) {
          console.error(`Missing reactivation config for category: ${category}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Security validation error:', error);
      return false;
    }
  }

  private validateSystem(data: any): boolean {
    try {
      const result = SystemConfigSchema.safeParse(data);
      if (!result.success) {
        console.error('System validation failed:', result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('System validation error:', error);
      return false;
    }
  }

  async validateFullConfiguration(data: any): Promise<boolean> {
    try {
      const result = ConfigurationSchemaValidator.safeParse(data);
      if (!result.success) {
        console.error('Full configuration validation failed:', result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Full configuration validation error:', error);
      return false;
    }
  }
}

