import { Hand } from 'pokersolver';

export interface Player {
  id: string;
  name: string;
  chips: number;
  hand: string[];
  bet: number;
  folded: boolean;
  isAllIn: boolean;
}

export interface Table {
  id: string;
  players: Player[];
  communityCards: string[];
  pot: number;
  currentBet: number;
  dealer: number;
  currentTurn: number;
  smallBlind: number;
  bigBlind: number;
  deck: string[];
}

export class PokerGame {
  private tables: Map<string, Table> = new Map();

  private createDeck(): string[] {
    const suits = ['h', 'd', 'c', 's'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const deck: string[] = [];

    for (const suit of suits) {
      for (const value of values) {
        deck.push(value + suit);
      }
    }

    return this.shuffle(deck);
  }

  private shuffle(deck: string[]): string[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  createTable(tableId: string, smallBlind: number = 10): Table {
    const table: Table = {
      id: tableId,
      players: [],
      communityCards: [],
      pot: 0,
      currentBet: 0,
      dealer: 0,
      currentTurn: 0,
      smallBlind,
      bigBlind: smallBlind * 2,
      deck: this.createDeck(),
    };

    this.tables.set(tableId, table);
    return table;
  }

  addPlayer(tableId: string, playerId: string, playerName: string, startingChips: number = 1000): Player {
    const table = this.tables.get(tableId);
    if (!table) throw new Error('Table not found');
    if (table.players.length >= 9) throw new Error('Table is full');

    const player: Player = {
      id: playerId,
      name: playerName,
      chips: startingChips,
      hand: [],
      bet: 0,
      folded: false,
      isAllIn: false,
    };

    table.players.push(player);
    return player;
  }

  dealHands(tableId: string): void {
    const table = this.tables.get(tableId);
    if (!table) throw new Error('Table not found');
    if (table.players.length < 2) throw new Error('Not enough players');

    table.deck = this.createDeck();
    table.communityCards = [];
    table.pot = 0;
    table.currentBet = 0;

    // Deal two cards to each player
    for (const player of table.players) {
      player.hand = [table.deck.pop()!, table.deck.pop()!];
      player.folded = false;
      player.bet = 0;
      player.isAllIn = false;
    }
  }

  evaluateHand(playerHand: string[], communityCards: string[]): any {
    const allCards = [...playerHand, ...communityCards];
    return Hand.solve(allCards);
  }

  // Additional methods for game logic will be implemented here
} 