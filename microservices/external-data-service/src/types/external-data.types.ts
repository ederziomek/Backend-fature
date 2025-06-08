// Tipos para integração com base de dados externa
export interface PlayerDeposit {
  id: string;
  playerId: string;
  amount: number;
  currency: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: string;
  transactionId: string;
}

export interface PlayerBet {
  id: string;
  playerId: string;
  gameId: string;
  betAmount: number;
  winAmount: number;
  timestamp: Date;
  status: 'pending' | 'won' | 'lost';
  gameType: string;
  odds?: number;
}

export interface PlayerGGR {
  playerId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalDeposits: number;
  totalWithdrawals: number;
  totalBets: number;
  totalWins: number;
  ggr: number; // Gross Gaming Revenue
  ngr: number; // Net Gaming Revenue
  bonusesGiven: number;
}

export interface PlayerActivity {
  playerId: string;
  lastLoginDate: Date;
  totalSessions: number;
  averageSessionDuration: number; // em minutos
  totalGamesPlayed: number;
  favoriteGameTypes: string[];
  isActive: boolean;
  registrationDate: Date;
  lifetimeValue: number;
}

export interface ExternalDataApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PlayerValidationResult {
  playerId: string;
  isValid: boolean;
  validationCriteria: {
    hasMinimumDeposit: boolean;
    minimumDepositAmount: number;
    hasMinimumActivity: boolean;
    minimumBetsCount: number;
    isActivePlayer: boolean;
  };
  validationDate: Date;
}

