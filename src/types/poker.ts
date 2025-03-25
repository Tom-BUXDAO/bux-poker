export interface Card {
  rank: string;
  suit: string;
}

export interface PlayerAction {
  type: 'fold' | 'check' | 'call' | 'raise';
  amount?: number;
  playerId: string;
  timestamp: Date;
}

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