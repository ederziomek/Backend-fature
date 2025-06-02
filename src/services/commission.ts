// @ts-nocheck
import { prisma } from '@/config/database';
import { CommissionType, CpaValidationModel } from '@prisma/client';

// Estrutura de RevShare baseada no documento
const REVSHARE_STRUCTURE = [
  // JOGADOR
  { category: "jogador", level: 1, minReferrals: 0, maxReferrals: 4, revTotal: 5.00, revLevel1: 1.00, revLevels2to5: 1.00 },
  { category: "jogador", level: 2, minReferrals: 5, maxReferrals: 10, revTotal: 10.00, revLevel1: 6.00, revLevels2to5: 1.00 },
  
  // INICIANTE
  { category: "iniciante", level: 1, minReferrals: 11, maxReferrals: 20, revTotal: 14.00, revLevel1: 6.00, revLevels2to5: 2.00 },
  { category: "iniciante", level: 2, minReferrals: 21, maxReferrals: 30, revTotal: 20.00, revLevel1: 12.00, revLevels2to5: 2.00 },
  
  // AFILIADO
  { category: "afiliado", level: 1, minReferrals: 31, maxReferrals: 40, revTotal: 24.00, revLevel1: 12.00, revLevels2to5: 3.00 },
  { category: "afiliado", level: 2, minReferrals: 41, maxReferrals: 50, revTotal: 25.00, revLevel1: 13.00, revLevels2to5: 3.00 },
  { category: "afiliado", level: 3, minReferrals: 51, maxReferrals: 60, revTotal: 26.00, revLevel1: 14.00, revLevels2to5: 3.00 },
  { category: "afiliado", level: 4, minReferrals: 61, maxReferrals: 70, revTotal: 27.00, revLevel1: 15.00, revLevels2to5: 3.00 },
  { category: "afiliado", level: 5, minReferrals: 71, maxReferrals: 80, revTotal: 28.00, revLevel1: 16.00, revLevels2to5: 3.00 },
  { category: "afiliado", level: 6, minReferrals: 81, maxReferrals: 90, revTotal: 29.00, revLevel1: 17.00, revLevels2to5: 3.00 },
  { category: "afiliado", level: 7, minReferrals: 91, maxReferrals: 100, revTotal: 30.00, revLevel1: 18.00, revLevels2to5: 3.00 },
  
  // PROFISSIONAL (30 levels)
  { category: "profissional", level: 1, minReferrals: 101, maxReferrals: 130, revTotal: 34.00, revLevel1: 18.00, revLevels2to5: 4.00 },
  { category: "profissional", level: 2, minReferrals: 131, maxReferrals: 160, revTotal: 34.21, revLevel1: 18.21, revLevels2to5: 4.00 },
  { category: "profissional", level: 3, minReferrals: 161, maxReferrals: 190, revTotal: 34.41, revLevel1: 18.41, revLevels2to5: 4.00 },
  { category: "profissional", level: 4, minReferrals: 191, maxReferrals: 220, revTotal: 34.62, revLevel1: 18.62, revLevels2to5: 4.00 },
  { category: "profissional", level: 5, minReferrals: 221, maxReferrals: 250, revTotal: 34.83, revLevel1: 18.83, revLevels2to5: 4.00 },
  { category: "profissional", level: 30, minReferrals: 971, maxReferrals: 1000, revTotal: 40.00, revLevel1: 24.00, revLevels2to5: 4.00 },
  
  // EXPERT (90 levels) - Alguns exemplos
  { category: "expert", level: 1, minReferrals: 1001, maxReferrals: 1100, revTotal: 44.00, revLevel1: 24.00, revLevels2to5: 5.00 },
  { category: "expert", level: 90, minReferrals: 9901, maxReferrals: 10000, revTotal: 50.00, revLevel1: 30.00, revLevels2to5: 5.00 },
  
  // MESTRE (100 levels) - Alguns exemplos
  { category: "mestre", level: 1, minReferrals: 10001, maxReferrals: 11000, revTotal: 54.00, revLevel1: 30.00, revLevels2to5: 6.00 },
  { category: "mestre", level: 90, minReferrals: 99001, maxReferrals: 100000, revTotal: 69.33, revLevel1: 41.33, revLevels2to5: 7.00 },
  
  // LENDA (90 levels) - Alguns exemplos
  { category: "lenda", level: 1, minReferrals: 100001, maxReferrals: 110000, revTotal: 60.00, revLevel1: 36.00, revLevels2to5: 6.00 },
  { category: "lenda", level: 90, minReferrals: 990001, maxReferrals: 999999999, revTotal: 70.00, revLevel1: 42.00, revLevels2to5: 7.00 },
];

export class CommissionService {
  /**
   * Obtém a configuração de RevShare baseada no número de referrals validados
   */
  static getRevShareConfig(validatedReferrals: number) {
    for (const config of REVSHARE_STRUCTURE) {
      if (validatedReferrals >= config.minReferrals && validatedReferrals <= config.maxReferrals) {
        return config;
      }
    }
    
    // Se não encontrar, retorna a configuração inicial
    return REVSHARE_STRUCTURE[0];
  }

  /**
   * Calcula categoria e level baseado no número de referrals validados
   */
  static calculateCategoryAndLevel(validatedReferrals: number) {
    const config = this.getRevShareConfig(validatedReferrals);
    return {
      category: config.category,
      level: config.level,
      revTotal: config.revTotal,
      revLevel1: config.revLevel1,
      revLevels2to5: config.revLevels2to5
    };
  }

  /**
   * Obtém configuração CPA ativa
   */
  static async getCpaConfiguration() {
    let config = await prisma.cpaConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    // Se não existir configuração, criar uma padrão
    if (!config) {
      config = await prisma.cpaConfiguration.create({
        data: {
          activeModel: 'model_1_1',
          totalAmount: 60.00,
          level1Amount: 35.00,
          level2Amount: 10.00,
          level3Amount: 5.00,
          level4Amount: 5.00,
          level5Amount: 5.00,
          minDeposit: 30.00,
          minBets: 10,
          minGgr: 20.00,
          isActive: true
        }
      });
    }

    return config;
  }

  /**
   * Valida se uma indicação atende aos critérios CPA
   */
  static async validateReferralForCpa(referralId: string) {
    const referral = await prisma.referral.findUnique({
      where: { id: referralId }
    });

    if (!referral || referral.isValidated) {
      return false;
    }

    const config = await this.getCpaConfiguration();

    // Verificar depósito mínimo
    if (!referral.firstDeposit || referral.firstDeposit < config.minDeposit) {
      return false;
    }

    // Verificar critérios adicionais baseado no modelo ativo
    if (config.activeModel === 'model_1_2') {
      // Modelo 1.2: Depósito + (10 apostas OU R$ 20 GGR)
      const hasMinBets = referral.totalBets >= config.minBets;
      const hasMinGgr = referral.totalGgr >= config.minGgr;
      
      if (!hasMinBets && !hasMinGgr) {
        return false;
      }
    }

    return true;
  }

  /**
   * Processa CPA para uma indicação validada
   */
  static async processCpa(referralId: string) {
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        affiliate: {
          include: {
            parent: {
              include: {
                parent: {
                  include: {
                    parent: {
                      include: {
                        parent: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!referral || referral.cpaProcessed) {
      throw new Error('Indicação não encontrada ou CPA já processado');
    }

    const config = await this.getCpaConfiguration();
    const commissions = [];

    // Distribuir CPA pelos 5 níveis
    const levels = [
      { affiliate: referral.affiliate, level: 1, amount: config.level1Amount },
      { affiliate: referral.affiliate.parent, level: 2, amount: config.level2Amount },
      { affiliate: referral.affiliate.parent?.parent, level: 3, amount: config.level3Amount },
      { affiliate: referral.affiliate.parent?.parent?.parent, level: 4, amount: config.level4Amount },
      { affiliate: referral.affiliate.parent?.parent?.parent?.parent, level: 5, amount: config.level5Amount }
    ];

    for (const levelData of levels) {
      if (levelData.affiliate && levelData.amount > 0) {
        const commission = await prisma.commission.create({
          data: {
            affiliateId: levelData.affiliate.id,
            type: 'cpa',
            level: levelData.level,
            amount: levelData.amount,
            status: 'calculated',
            metadata: {
              referralId: referral.id,
              customerId: referral.customerId,
              cpaModel: config.activeModel,
              calculationDate: new Date().toISOString()
            }
          }
        });

        commissions.push(commission);

        // Atualizar estatísticas do afiliado
        await prisma.affiliate.update({
          where: { id: levelData.affiliate.id },
          data: {
            lifetimeCommissions: {
              increment: levelData.amount
            },
            currentMonthCommissions: {
              increment: levelData.amount
            }
          }
        });
      }
    }

    // Marcar CPA como processado
    await prisma.referral.update({
      where: { id: referralId },
      data: {
        cpaProcessed: true,
        cpaProcessedAt: new Date()
      }
    });

    // Atualizar contador de referrals validados do afiliado
    await prisma.affiliate.update({
      where: { id: referral.affiliateId },
      data: {
        validatedReferrals: {
          increment: 1
        }
      }
    });

    return commissions;
  }

  /**
   * Calcula RevShare para uma transação
   */
  static async calculateRevShare(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        affiliate: {
          include: {
            parent: {
              include: {
                parent: {
                  include: {
                    parent: {
                      include: {
                        parent: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!transaction) {
      throw new Error('Transação não encontrada');
    }

    const ngrAmount = Number(transaction.amount);
    const commissions = [];

    // Calcular RevShare para até 5 níveis
    const levels = [
      { affiliate: transaction.affiliate, level: 1 },
      { affiliate: transaction.affiliate.parent, level: 2 },
      { affiliate: transaction.affiliate.parent?.parent, level: 3 },
      { affiliate: transaction.affiliate.parent?.parent?.parent, level: 4 },
      { affiliate: transaction.affiliate.parent?.parent?.parent?.parent, level: 5 }
    ];

    for (const levelData of levels) {
      if (levelData.affiliate) {
        const config = this.getRevShareConfig(levelData.affiliate.validatedReferrals);
        
        let percentage = 0;
        if (levelData.level === 1) {
          percentage = config.revLevel1;
        } else if (levelData.level >= 2 && levelData.level <= 5) {
          percentage = config.revLevels2to5;
        }

        if (percentage > 0) {
          const commissionAmount = (ngrAmount * percentage) / 100;
          
          // Verificar negative carryover
          let finalAmount = commissionAmount;
          let negativeCarryover = Number(levelData.affiliate.negativeCarryover);
          
          if (negativeCarryover > 0) {
            if (commissionAmount >= negativeCarryover) {
              finalAmount = commissionAmount - negativeCarryover;
              negativeCarryover = 0;
            } else {
              negativeCarryover -= commissionAmount;
              finalAmount = 0;
            }
            
            // Atualizar negative carryover
            await prisma.affiliate.update({
              where: { id: levelData.affiliate.id },
              data: { negativeCarryover }
            });
          }

          if (finalAmount > 0 || commissionAmount < 0) {
            const commission = await prisma.commission.create({
              data: {
                transactionId,
                affiliateId: levelData.affiliate.id,
                type: 'revshare',
                level: levelData.level,
                percentage,
                amount: finalAmount,
                status: 'calculated',
                metadata: {
                  ngrAmount,
                  originalAmount: commissionAmount,
                  negativeCarryoverApplied: commissionAmount - finalAmount,
                  affiliateCategory: config.category,
                  affiliateLevel: config.level,
                  calculationDate: new Date().toISOString()
                }
              }
            });

            commissions.push(commission);

            // Se comissão negativa, adicionar ao negative carryover
            if (commissionAmount < 0) {
              await prisma.affiliate.update({
                where: { id: levelData.affiliate.id },
                data: {
                  negativeCarryover: {
                    increment: Math.abs(commissionAmount)
                  }
                }
              });
            } else if (finalAmount > 0) {
              // Atualizar estatísticas do afiliado
              await prisma.affiliate.update({
                where: { id: levelData.affiliate.id },
                data: {
                  lifetimeCommissions: {
                    increment: finalAmount
                  },
                  currentMonthCommissions: {
                    increment: finalAmount
                  }
                }
              });
            }
          }
        }
      }
    }

    return commissions;
  }

  /**
   * Atualiza modelo de validação CPA ativo
   */
  static async updateCpaValidationModel(model: CpaValidationModel) {
    // Desativar configurações existentes
    await prisma.cpaConfiguration.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Criar nova configuração ativa
    const config = await prisma.cpaConfiguration.create({
      data: {
        activeModel: model,
        totalAmount: 60.00,
        level1Amount: 35.00,
        level2Amount: 10.00,
        level3Amount: 5.00,
        level4Amount: 5.00,
        level5Amount: 5.00,
        minDeposit: 30.00,
        minBets: 10,
        minGgr: 20.00,
        isActive: true
      }
    });

    return config;
  }
}

