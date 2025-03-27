import { Card, HandResult } from '@/types/poker';

interface HandEvaluation {
  rank: number;
  name: string;
  cards: Card[];
}

type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

const HAND_RANKINGS = {
  ROYAL_FLUSH: 10,
  STRAIGHT_FLUSH: 9,
  FOUR_OF_A_KIND: 8,
  FULL_HOUSE: 7,
  FLUSH: 6,
  STRAIGHT: 5,
  THREE_OF_A_KIND: 4,
  TWO_PAIR: 3,
  ONE_PAIR: 2,
  HIGH_CARD: 1
} as const;

const CARD_RANKS: Record<CardRank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => CARD_RANKS[a.rank as CardRank] - CARD_RANKS[b.rank as CardRank]);
}

function groupBySuit(cards: Card[]): Map<string, Card[]> {
  const groups = new Map<string, Card[]>();
  cards.forEach(card => {
    if (!groups.has(card.suit)) {
      groups.set(card.suit, []);
    }
    groups.get(card.suit)!.push(card);
  });
  return groups;
}

function groupByRank(cards: Card[]): Map<string, Card[]> {
  const groups = new Map<string, Card[]>();
  cards.forEach(card => {
    if (!groups.has(card.rank)) {
      groups.set(card.rank, []);
    }
    groups.get(card.rank)!.push(card);
  });
  return groups;
}

function findStraight(cards: Card[]): Card[] | null {
  const sorted = sortByRank(cards);
  let straight: Card[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevRank = CARD_RANKS[sorted[i - 1].rank as CardRank];
    const currRank = CARD_RANKS[sorted[i].rank as CardRank];

    if (prevRank - currRank === 1) {
      straight.push(sorted[i]);
      if (straight.length === 5) return straight;
    } else if (prevRank !== currRank) {
      straight = [sorted[i]];
    }
  }

  // Check for Ace-low straight (A,2,3,4,5)
  if (straight.length === 4 && sorted[0].rank === 'A' && sorted[sorted.length - 1].rank === '2') {
    straight.push(sorted[0]);
    return straight;
  }

  return null;
}

function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    throw new Error('At least 5 cards are required for hand evaluation');
  }

  const suitGroups = groupBySuit(cards);
  const rankGroups = groupByRank(cards);
  const sortedCards = sortByRank(cards);

  // Check for Royal Flush and Straight Flush
  for (const [_, suited] of suitGroups) {
    if (suited.length >= 5) {
      const straightFlush = findStraight(suited);
      if (straightFlush) {
        if (straightFlush[0].rank === 'A') {
          return {
            rank: HAND_RANKINGS.ROYAL_FLUSH,
            name: 'Royal Flush',
            cards: straightFlush
          };
        }
        return {
          rank: HAND_RANKINGS.STRAIGHT_FLUSH,
          name: 'Straight Flush',
          cards: straightFlush
        };
      }
    }
  }

  // Check for Four of a Kind
  for (const [_, ranked] of rankGroups) {
    if (ranked.length === 4) {
      const kicker = sortedCards.find(card => !ranked.includes(card));
      return {
        rank: HAND_RANKINGS.FOUR_OF_A_KIND,
        name: 'Four of a Kind',
        cards: [...ranked, kicker!]
      };
    }
  }

  // Check for Full House
  let threeOfAKind: Card[] | null = null;
  let pair: Card[] | null = null;
  for (const [_, ranked] of rankGroups) {
    if (ranked.length === 3 && !threeOfAKind) {
      threeOfAKind = ranked;
    } else if (ranked.length >= 2 && !pair) {
      pair = ranked.slice(0, 2);
    }
  }
  if (threeOfAKind && pair) {
    return {
      rank: HAND_RANKINGS.FULL_HOUSE,
      name: 'Full House',
      cards: [...threeOfAKind, ...pair]
    };
  }

  // Check for Flush
  for (const [_, suited] of suitGroups) {
    if (suited.length >= 5) {
      return {
        rank: HAND_RANKINGS.FLUSH,
        name: 'Flush',
        cards: sortByRank(suited).slice(0, 5)
      };
    }
  }

  // Check for Straight
  const straight = findStraight(cards);
  if (straight) {
    return {
      rank: HAND_RANKINGS.STRAIGHT,
      name: 'Straight',
      cards: straight
    };
  }

  // Check for Three of a Kind
  if (threeOfAKind) {
    const kickers = sortedCards
      .filter(card => !threeOfAKind!.includes(card))
      .slice(0, 2);
    return {
      rank: HAND_RANKINGS.THREE_OF_A_KIND,
      name: 'Three of a Kind',
      cards: [...threeOfAKind, ...kickers]
    };
  }

  // Check for Two Pair
  const pairs: Card[][] = [];
  for (const [_, ranked] of rankGroups) {
    if (ranked.length >= 2) {
      pairs.push(ranked.slice(0, 2));
      if (pairs.length === 2) break;
    }
  }
  if (pairs.length === 2) {
    const kicker = sortedCards
      .filter(card => !pairs[0].includes(card) && !pairs[1].includes(card))
      [0];
    return {
      rank: HAND_RANKINGS.TWO_PAIR,
      name: 'Two Pair',
      cards: [...pairs[0], ...pairs[1], kicker]
    };
  }

  // Check for One Pair
  if (pairs.length === 1) {
    const kickers = sortedCards
      .filter(card => !pairs[0].includes(card))
      .slice(0, 3);
    return {
      rank: HAND_RANKINGS.ONE_PAIR,
      name: 'One Pair',
      cards: [...pairs[0], ...kickers]
    };
  }

  // High Card
  return {
    rank: HAND_RANKINGS.HIGH_CARD,
    name: 'High Card',
    cards: sortedCards.slice(0, 5)
  };
}

export function evaluatePlayerHand(playerId: string, holeCards: Card[], communityCards: Card[]): HandResult {
  const allCards = [...holeCards, ...communityCards];
  const evaluation = evaluateHand(allCards);
  
  return {
    playerId,
    hand: evaluation.cards,
    rank: evaluation.rank,
    description: evaluation.name
  };
}

export function determineWinners(players: { id: string; cards: Card[] }[], communityCards: Card[]): string[] {
  const evaluations = players.map(player => ({
    playerId: player.id,
    evaluation: evaluatePlayerHand(player.id, player.cards, communityCards)
  }));

  // Sort by hand rank
  evaluations.sort((a, b) => b.evaluation.rank - a.evaluation.rank);

  // Get all players with the highest rank
  const highestRank = evaluations[0].evaluation.rank;
  const winners = evaluations
    .filter(e => e.evaluation.rank === highestRank)
    .map(e => e.playerId);

  return winners;
}

// Replace unused _ with descriptive variable names or remove if not needed
const hasStraightFlush = (cards: Card[]): boolean => {
  const suits = [...new Set(cards.map(card => card.suit))];
  return suits.some(suit => {
    const suitCards = cards.filter(card => card.suit === suit);
    return hasStraight(suitCards);
  });
};

const hasFourOfAKind = (cards: Card[]): boolean => {
  const ranks = cards.map(card => card.rank);
  return ranks.some(rank => 
    ranks.filter(r => r === rank).length === 4
  );
};

const hasFullHouse = (cards: Card[]): boolean => {
  const ranks = cards.map(card => card.rank);
  const uniqueRanks = [...new Set(ranks)];
  return uniqueRanks.some(rank1 => 
    ranks.filter(r => r === rank1).length === 3 &&
    uniqueRanks.some(rank2 => 
      rank2 !== rank1 && ranks.filter(r => r === rank2).length >= 2
    )
  );
};

const hasFlush = (cards: Card[]): boolean => {
  const suits = cards.map(card => card.suit);
  return [...new Set(suits)].some(suit => 
    suits.filter(s => s === suit).length >= 5
  );
};

const hasStraight = (cards: Card[]): boolean => {
  const ranks = [...new Set(cards.map(card => card.rank))].sort();
  return ranks.some((rank, i) => 
    i <= ranks.length - 5 && 
    ranks.slice(i, i + 5).every((r, j) => 
      j === 0 || r === ranks[i + j - 1] + 1
    )
  );
};