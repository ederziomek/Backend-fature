import { EventEmitter } from 'events';
import { 
  AffiliateCreatedEvent,
  CommissionCalculatedEvent,
  LevelUpEvent,
  IndicationValidatedEvent
} from '@/types';

class EventServiceClass extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Publica evento de afiliado criado
   */
  async publishAffiliateCreated(event: AffiliateCreatedEvent): Promise<void> {
    try {
      this.emit('affiliate.created', event);
      console.log('Event published: affiliate.created', { affiliateId: event.affiliateId });
    } catch (error) {
      console.error('Erro ao publicar evento affiliate.created:', error);
    }
  }

  /**
   * Publica evento de comissão calculada
   */
  async publishCommissionCalculated(event: CommissionCalculatedEvent): Promise<void> {
    try {
      this.emit('commission.calculated', event);
      console.log('Event published: commission.calculated', { 
        commissionId: event.commissionId,
        amount: event.amount 
      });
    } catch (error) {
      console.error('Erro ao publicar evento commission.calculated:', error);
    }
  }

  /**
   * Publica evento de level up
   */
  async publishLevelUp(event: LevelUpEvent): Promise<void> {
    try {
      this.emit('affiliate.levelup', event);
      console.log('Event published: affiliate.levelup', { 
        affiliateId: event.affiliateId,
        newCategory: event.newCategory 
      });
    } catch (error) {
      console.error('Erro ao publicar evento affiliate.levelup:', error);
    }
  }

  /**
   * Publica evento de indicação validada
   */
  async publishIndicationValidated(event: IndicationValidatedEvent): Promise<void> {
    try {
      this.emit('indication.validated', event);
      console.log('Event published: indication.validated', { 
        indicationId: event.indicationId,
        bonusAmount: event.bonusAmount 
      });
    } catch (error) {
      console.error('Erro ao publicar evento indication.validated:', error);
    }
  }

  /**
   * Registra listeners para eventos
   */
  onAffiliateCreated(callback: (event: AffiliateCreatedEvent) => void): void {
    this.on('affiliate.created', callback);
  }

  onCommissionCalculated(callback: (event: CommissionCalculatedEvent) => void): void {
    this.on('commission.calculated', callback);
  }

  onLevelUp(callback: (event: LevelUpEvent) => void): void {
    this.on('affiliate.levelup', callback);
  }

  onIndicationValidated(callback: (event: IndicationValidatedEvent) => void): void {
    this.on('indication.validated', callback);
  }

  /**
   * Limpa todos os listeners
   */
  clearAllListeners(): void {
    this.removeAllListeners();
  }
}

export const EventService = new EventServiceClass();

