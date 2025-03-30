export interface Card {
  rank: string;
  suit: string;
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  position?: TablePosition;
  isActive: boolean;
  isCurrent: boolean;
  isDealer?: boolean;
  currentBet: number;
  cards: Card[];
  avatarUrl?: string;
  isConnected?: boolean;
  folded: boolean;
  totalBetThisRound: number;
  hasActed: boolean;
  handResult?: HandResult;
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
  status: 'waiting' | 'playing' | 'finished';
  phase: GamePhase;
  deck?: Card[];
  pot: number;
  communityCards: Card[];
  currentPosition: number;
  currentBet: number;
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  lastRaise: number;
  dealerPosition?: number;
  roundComplete: boolean;
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
}

export interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: Date;
}

export interface StringMessage {
  content: string;
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

export interface PlayerLeftMessage {
  playerId: string;
}

export type WebSocketPayload = GameState | Player | Error | ChatMessage | StringMessage | PlayerLeftMessage | Record<string, unknown>;

export interface WebSocketMessage {
  type: 'gameState' | 'playerJoined' | 'playerLeft' | 'error' | 'chat' | 'ping' | 'playerAction' | 'startGame';
  payload: WebSocketPayload;
}