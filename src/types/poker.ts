export interface Card {
  rank: string;
  suit: string;
}

export interface Player {
  id: string;
  position: TablePosition;
  chips: number;
  isActive: boolean;
  isCurrent: boolean;
  name: string;
  cards?: Card[];
  isDealer?: boolean;
  currentBet: number;
  disconnectedAt?: number;
  avatarUrl?: string;
  hasActed?: boolean;
  totalBetThisRound?: number;
  handResult?: HandResult;
  folded: boolean;
}

export const PLAYER_ACTIONS = ['fold', 'check', 'call', 'raise', 'all-in'] as const;
export type PlayerAction = typeof PLAYER_ACTIONS[number];

export type TablePosition = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type HandRank =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export type HandEvaluation = {
  rank: HandRank;
  cards: Card[];
  value: number;
};

export type GamePhase = 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';

export type PlayerHand = {
  playerId: string;
  cards: Card[];
  evaluation?: HandEvaluation;
};

export interface HandResult {
  playerId: string;
  hand: Card[];
  rank: number;
  description: string;
}

export interface GameState {
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  currentPosition: number;
  dealerPosition?: number;
  smallBlind: number;
  bigBlind: number;
  status: 'waiting' | 'playing' | 'finished';
  phase: GamePhase;
  deck?: Card[];
  lastAction?: {
    playerId: string;
    type: PlayerAction;
    amount?: number;
    timestamp: Date;
  };
  sidePots?: {
    amount: number;
    eligiblePlayers: string[];
  }[];
  roundComplete: boolean;
  minRaise: number;
  lastRaise: number;
}

export interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: Date;
}

export interface ActionValidation {
  isValid: boolean;
  error?: string;
}

export interface BettingRound {
  phase: GamePhase;
  startPosition: number;
  currentPosition: number;
  lastRaisePosition?: number;
  complete: boolean;
}

export interface WebSocketMessage {
  type: string;
  payload: Record<string, unknown>;
} 