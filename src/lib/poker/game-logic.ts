import { GameState, Player, Card, PlayerAction, ActionValidation, TablePosition } from '@/types/poker';
import { evaluatePlayerHand, determineWinners } from './hand-evaluator';

export function createDeck(): Card[] {
  const suits = ['H', 'D', 'C', 'S'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(gameState: GameState) {
  if (!gameState.deck) return;
  
  const activePlayers = gameState.players.filter(p => p.isActive);
  
  // Deal 2 cards to each player
  for (let i = 0; i < 2; i++) {
    for (const player of activePlayers) {
      if (!player.cards) player.cards = [];
      const card = gameState.deck.pop();
      if (card) {
        player.cards.push(card);
      }
    }
  }
}

export function dealCommunityCards(gameState: GameState) {
  if (!gameState.deck) return;

  switch (gameState.phase) {
    case 'flop':
      // Deal 3 cards for the flop
      for (let i = 0; i < 3; i++) {
        const card = gameState.deck.pop();
        if (card) gameState.communityCards.push(card);
      }
      break;
    case 'turn':
    case 'river':
      // Deal 1 card for turn or river
      const card = gameState.deck.pop();
      if (card) gameState.communityCards.push(card);
      break;
  }
}

export function validatePlayerAction(
  gameState: GameState,
  playerId: string,
  action: PlayerAction,
  amount?: number
): ActionValidation {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return { isValid: false, error: 'Player not found' };
  if (!player.isCurrent) return { isValid: false, error: 'Not your turn' };
  if (!player.isActive) return { isValid: false, error: 'Player is not active' };

  const callAmount = gameState.currentBet - (player.currentBet || 0);

  switch (action) {
    case 'fold':
      return { isValid: true };

    case 'check':
      if (gameState.currentBet > player.currentBet) {
        return { isValid: false, error: 'Cannot check when there is a bet to call' };
      }
      return { isValid: true };

    case 'call':
      if (callAmount <= 0) {
        return { isValid: false, error: 'No bet to call' };
      }
      if (callAmount > player.chips) {
        return { isValid: false, error: 'Not enough chips to call' };
      }
      return { isValid: true };

    case 'raise':
      if (!amount) return { isValid: false, error: 'Raise amount not specified' };
      if (amount <= gameState.currentBet) {
        return { isValid: false, error: 'Raise must be greater than current bet' };
      }
      if (amount - player.currentBet > player.chips) {
        return { isValid: false, error: 'Not enough chips to raise' };
      }
      if (amount - gameState.currentBet < gameState.minRaise) {
        return { isValid: false, error: `Minimum raise is ${gameState.minRaise}` };
      }
      return { isValid: true };

    case 'all-in':
      return { isValid: true };
  }
}

export function isBettingRoundComplete(gameState: GameState): boolean {
  const activePlayers = gameState.players.filter(p => p.isActive);
  
  // Check if all active players have acted
  const allPlayersActed = activePlayers.every(p => p.hasActed || p.chips === 0);
  
  // Check if all active players have matched the current bet or are all-in
  const allBetsMatched = activePlayers.every(p => 
    p.currentBet === gameState.currentBet || p.chips === 0
  );

  return allPlayersActed && allBetsMatched;
}

export function moveToNextPhase(gameState: GameState): void {
  // Reset betting round state
  gameState.players.forEach(p => {
    p.hasActed = false;
    p.currentBet = 0;
  });
  gameState.currentBet = 0;
  gameState.lastRaise = 0;
  gameState.minRaise = gameState.bigBlind;

  switch (gameState.phase) {
    case 'pre-flop':
      gameState.phase = 'flop';
      dealCommunityCards(gameState);
      break;
    case 'flop':
      gameState.phase = 'turn';
      dealCommunityCards(gameState);
      break;
    case 'turn':
      gameState.phase = 'river';
      dealCommunityCards(gameState);
      break;
    case 'river':
      gameState.phase = 'showdown';
      handleShowdown(gameState);
      break;
  }
}

export function findNextActivePlayer(gameState: GameState, currentPosition: number): Player | null {
  const activePlayers = gameState.players.filter(p => p.isActive);
  if (activePlayers.length === 0) return null;

  // Get all positions in ascending order
  const positions = [...new Set(activePlayers.map(p => p.position))].sort((a, b) => a - b) as TablePosition[];
  
  // Find the index of current position in our ordered positions
  const currentPosIndex = positions.indexOf(currentPosition as TablePosition);
  
  if (currentPosIndex === -1) {
    // If current position is not found among active players,
    // find the next valid position after the current absolute position
    const nextPos = positions.find(pos => pos > currentPosition);
    if (nextPos) {
      return activePlayers.find(p => p.position === nextPos) || null;
    }
    // If no higher position found, wrap around to the lowest position
    return activePlayers.find(p => p.position === positions[0]) || null;
  }
  
  // Try next position
  if (currentPosIndex < positions.length - 1) {
    return activePlayers.find(p => p.position === positions[currentPosIndex + 1]) || null;
  }
  
  // Wrap around to the beginning
  return activePlayers.find(p => p.position === positions[0]) || null;
}

export function calculateSidePots(gameState: GameState): void {
  const activePlayers = gameState.players.filter(p => p.isActive);
  const allInPlayers = activePlayers.filter(p => p.chips === 0).sort((a, b) => a.totalBetThisRound! - b.totalBetThisRound!);
  
  gameState.sidePots = [];
  let processedBets = 0;

  // Process each all-in player's bet level
  for (const allInPlayer of allInPlayers) {
    const currentBetLevel = allInPlayer.totalBetThisRound!;
    const potAtThisLevel = activePlayers.reduce((sum, player) => {
      const contribution = Math.min(
        currentBetLevel - processedBets,
        player.totalBetThisRound! - processedBets
      );
      return sum + (contribution > 0 ? contribution : 0);
    }, 0);

    if (potAtThisLevel > 0) {
      gameState.sidePots.push({
        amount: potAtThisLevel,
        eligiblePlayers: activePlayers
          .filter(p => p.totalBetThisRound! >= currentBetLevel)
          .map(p => p.id)
      });
    }

    processedBets = currentBetLevel;
  }

  // Main pot for remaining players
  const mainPot = activePlayers.reduce((sum, player) => {
    const contribution = player.totalBetThisRound! - processedBets;
    return sum + (contribution > 0 ? contribution : 0);
  }, 0);

  if (mainPot > 0) {
    gameState.sidePots.push({
      amount: mainPot,
      eligiblePlayers: activePlayers.map(p => p.id)
    });
  }
}

function handleShowdown(gameState: GameState): void {
  // Calculate side pots if any players are all-in
  calculateSidePots(gameState);

  // Get all active players with their hole cards
  const showdownPlayers = gameState.players
    .filter(p => p.isActive && p.cards && p.cards.length === 2)
    .map(p => ({
      id: p.id,
      cards: p.cards!
    }));

  // Determine winners for each pot
  const pots = gameState.sidePots || [{
    amount: gameState.pot,
    eligiblePlayers: gameState.players.filter(p => p.isActive).map(p => p.id)
  }];

  for (const pot of pots) {
    // Filter players eligible for this pot
    const eligiblePlayers = showdownPlayers.filter(p => 
      pot.eligiblePlayers.includes(p.id)
    );

    // Determine winners for this pot
    const winners = determineWinners(eligiblePlayers, gameState.communityCards);
    const winAmount = Math.floor(pot.amount / winners.length);

    // Award chips to winners
    winners.forEach(winnerId => {
      const winner = gameState.players.find(p => p.id === winnerId);
      if (winner) {
        winner.chips += winAmount;
      }
    });

    // Evaluate and store hand results for display
    eligiblePlayers.forEach(player => {
      const handResult = evaluatePlayerHand(
        player.id,
        player.cards,
        gameState.communityCards
      );
      const playerState = gameState.players.find(p => p.id === player.id);
      if (playerState) {
        playerState.handResult = handResult;
      }
    });
  }

  // Reset game state for next hand
  gameState.status = 'finished';
  gameState.roundComplete = true;
} 