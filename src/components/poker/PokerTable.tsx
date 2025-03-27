'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, PlayerAction, Player, TablePosition, GameState } from '@/types/poker';
import pokerWebSocket from '@/lib/poker/client-websocket';
import ChipStack from './ChipStack';
import PotDisplay from './PotDisplay';
import Image from 'next/image';

const AVATAR_URLS = [
  'https://nftstorage.link/ipfs/bafybeigo7gili5wuojsywuwoift34g6mvvq56lrbk3ikp7r365a23es7je/4.png',
  'https://arweave.net/Le-ulCph8DnrDX8F58wZiYuRAUJHyuAHDc3qL427QG0',
  'https://nftstorage.link/ipfs/bafybeih2d34omtz2uoi6j56goy6y5ix6rydnpxylwlxcqhatpuvnobcecy/589.png',
  'https://arweave.net/y5aIwHvJWbXmm-faBK5x1UW-wBV8cmFRL18yfSy3cqk',
  'https://nftstorage.link/ipfs/bafybeiesjpaxqfxnsaugmwmzyldfsku2rp3vcpudbfmaovxcg4k2orep54/62.png',
  'https://arweave.net/lN9F3yXRsIIrEwP9TPKNAC27DE_j8CnhOQ6rUYTYKjM',
  'https://nftstorage.link/ipfs/bafybeiaiytmqc6dsko33hs2sylqizbl3hqw3liwuzvfi34uua6556erpb4/47.png',
  'https://arweave.net/dNT1LK37y22CFgs-e2uX5AmJ2G9NBAb1xORT9P_wyiE?ext=png'
];

interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: Date;
}

interface WebSocketMessage {
  type: string;
  payload: Record<string, unknown>;
}

interface GameStateEvent {
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  currentPosition: number;
  smallBlind: number;
  bigBlind: number;
  status: string;
  phase: string;
  roundComplete: boolean;
}

interface PokerTableProps {
  tableId: string;
  currentPlayer?: Player;
  onConnectionChange?: (isConnected: boolean) => void;
}

const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const HAND_RANKINGS = {
  'Royal Flush': 10,
  'Straight Flush': 9,
  'Four of a Kind': 8,
  'Full House': 7,
  'Flush': 6,
  'Straight': 5,
  'Three of a Kind': 4,
  'Two Pair': 3,
  'Pair': 2,
  'High Card': 1
};

function getRankValue(rank: string): number {
  return CARD_RANKS.indexOf(rank);
}

function evaluateHand(holeCards: Card[], communityCards: Card[]): { type: string, description: string } {
  if (!holeCards || holeCards.length === 0) {
    return { type: '', description: 'Waiting for cards...' };
  }

  const allCards = [...holeCards, ...communityCards];
  
  // Count ranks and suits
  const rankCount: { [key: string]: number } = {};
  const suitCount: { [key: string]: Card[] } = {};
  
  allCards.forEach(card => {
    rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
    suitCount[card.suit] = suitCount[card.suit] || [];
    suitCount[card.suit].push(card);
  });

  // Check for flush
  const flush = Object.values(suitCount).find(cards => cards.length >= 5);

  // Check for straight
  const ranks = Array.from(new Set(allCards.map(card => getRankValue(card.rank)))).sort((a, b) => a - b);
  let straight = false;
  let straightHigh = -1;
  
  // Special case for Ace-low straight
  if (ranks.includes(CARD_RANKS.length - 1)) { // If we have an Ace
    ranks.unshift(-1); // Add a low Ace
  }
  
  for (let i = 0; i < ranks.length - 4; i++) {
    if (ranks[i + 4] - ranks[i] === 4) {
      straight = true;
      straightHigh = ranks[i + 4];
    }
  }

  // Find pairs, trips, quads
  const pairs: string[] = [];
  let trips: string | null = null;
  let quads: string | null = null;

  Object.entries(rankCount).forEach(([rank, count]) => {
    if (count === 4) quads = rank;
    else if (count === 3) trips = rank;
    else if (count === 2) pairs.push(rank);
  });

  // Evaluate hand
  if (flush && straight && flush.every(card => getRankValue(card.rank) >= straightHigh - 4)) {
    if (straightHigh === CARD_RANKS.length - 1) {
      return { type: 'Royal Flush', description: 'Royal Flush' };
    }
    return { type: 'Straight Flush', description: `Straight Flush, ${CARD_RANKS[straightHigh]} High` };
  }

  if (quads) {
    return { type: 'Four of a Kind', description: `Four of a Kind, ${quads}s` };
  }

  if (trips && pairs.length > 0) {
    return { type: 'Full House', description: `Full House, ${trips}s full of ${pairs[0]}s` };
  }

  if (flush) {
    const highCard = flush.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank))[0];
    return { type: 'Flush', description: `Flush, ${highCard.rank} High` };
  }

  if (straight) {
    return { type: 'Straight', description: `Straight, ${CARD_RANKS[straightHigh]} High` };
  }

  if (trips) {
    return { type: 'Three of a Kind', description: `Three of a Kind, ${trips}s` };
  }

  if (pairs.length >= 2) {
    const sortedPairs = pairs.sort((a, b) => getRankValue(b) - getRankValue(a));
    return { type: 'Two Pair', description: `Two Pair, ${sortedPairs[0]}s and ${sortedPairs[1]}s` };
  }

  if (pairs.length === 1) {
    return { type: 'Pair', description: `Pair of ${pairs[0]}s` };
  }

  const highCard = allCards.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank))[0];
  return { type: 'High Card', description: `High Card, ${highCard.rank}` };
}

// Add this type for pot distribution
interface PotWinner {
  playerId: string;
  amount: number;
  hand: { type: string; description: string };
}

// Add this at the top of the file after imports
const pulsingBorder = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@900&display=swap');
  
  @keyframes pulse-border {
    0% { border-color: rgba(234, 179, 8, 0.8); }
    50% { border-color: rgba(234, 179, 8, 0.4); }
    100% { border-color: rgba(234, 179, 8, 0.8); }
  }
  .active-player {
    border-width: 3px;
    animation: pulse-border 0.8s ease-in-out infinite;
  }
`;

export default function PokerTable({ tableId, currentPlayer: initialPlayer, onConnectionChange }: PokerTableProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [betAmount, setBetAmount] = useState('');
  const [eliminationMessage, setEliminationMessage] = useState<string>('');
  const [isEliminated, setIsEliminated] = useState(false);
  const [potDistributionMessage, setPotDistributionMessage] = useState<string>('');
  const [originalCards, setOriginalCards] = useState<Map<string, Card[]>>(new Map());
  const [showSystemMessages, setShowSystemMessages] = useState(true);
  const [showPlayerChat, setShowPlayerChat] = useState(true);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const announcedPlayers = useRef<Set<string>>(new Set());

  // Auto scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Calculate default raise amount
  const minBet = gameState?.smallBlind ? gameState.smallBlind * 2 : 20;
  const defaultRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;

  useEffect(() => {
    if (!tableId || !initialPlayer) return;

    const cleanup = () => {
      pokerWebSocket.cleanup();
    };

    try {
      // Clean up any existing connections
      pokerWebSocket.cleanup();

      // Set up WebSocket event handlers
      pokerWebSocket.on('connect', () => {
        setIsConnected(true);
        console.log('WebSocket connected');
        onConnectionChange?.(true);
      });

      pokerWebSocket.on('disconnect', () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        onConnectionChange?.(false);
      });

      pokerWebSocket.on('message', (data: Record<string, unknown>) => {
        if (data.type === 'gameState') {
          const state = data.payload as GameState;
          console.log('Received game state:', state);
          setGameState(state);
          
          // Update game state
          const updatedPlayers = state.players.map((p: Player) => ({
            ...p,
            name: p.name || p.id.slice(0, 8),
            chips: p.chips || 0,
            currentBet: p.currentBet || 0,
            isActive: p.isActive ?? true,
            isCurrent: p.isCurrent ?? false,
            isDealer: p.isDealer ?? false,
            cards: p.cards || []
          }));

          // Store hole cards for current player
          if (initialPlayer) {
            const currentPlayerState = updatedPlayers.find(p => p.id === initialPlayer.id);
            if (currentPlayerState?.cards && currentPlayerState.cards.length > 0) {
              setOriginalCards(prev => new Map(prev).set(initialPlayer.id, currentPlayerState.cards));
            }
          }

          setPlayers(updatedPlayers);
          setCommunityCards(state.communityCards || []);
          setPot(state.pot || 0);
          setCurrentBet(state.currentBet || 0);

          // Handle all-in situations
          if (state.status === 'playing') {
            const activePlayers = state.players.filter((p: Player) => !p.folded);
            const playersWithChips = activePlayers.filter((p: Player) => p.chips > 0);
            const allPlayersAllIn = activePlayers.length >= 2 && playersWithChips.length === 0;

            if (allPlayersAllIn) {
              if (state.communityCards.length === 0) {
                setTimeout(() => {
                  pokerWebSocket.sendMessage({
                    type: 'dealCommunityCards',
                    payload: { street: 'flop' }
                  });
                }, 1000);
              } else if (state.communityCards.length === 3) {
                setTimeout(() => {
                  pokerWebSocket.sendMessage({
                    type: 'dealCommunityCards',
                    payload: { street: 'turn' }
                  });
                }, 2000);
              } else if (state.communityCards.length === 4) {
                setTimeout(() => {
                  pokerWebSocket.sendMessage({
                    type: 'dealCommunityCards',
                    payload: { street: 'river' }
                  });
                }, 2000);
              }
            }
          }
        } else if (data.type === 'chat') {
          const chatMessage = data.payload as ChatMessage;
          addChatMessage({
            ...chatMessage,
            timestamp: new Date(chatMessage.timestamp)
          });
        } else if (data.type === 'systemMessage') {
          addChatMessage({
            playerId: 'system',
            message: data.payload as string,
            timestamp: new Date()
          });
        }
      });

      // Initialize WebSocket connection with player data
      pokerWebSocket.init({
        tableId,
        playerId: initialPlayer.id,
        playerData: {
          name: initialPlayer.name,
          chips: initialPlayer.chips
        }
      });

    } catch (error) {
      console.error('Error in useEffect:', error);
    }

    return cleanup;
  }, [tableId, initialPlayer, onConnectionChange]);

  const addChatMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !initialPlayer || !isConnected) return;

    pokerWebSocket.sendMessage({
      type: 'chat',
      payload: {
        playerId: initialPlayer.id,
        message: chatInput.trim(),
        timestamp: new Date().toISOString()
      }
    });

    setChatInput('');
  };

  const handleAction = (action: PlayerAction) => {
    if (!initialPlayer || !isConnected) return;

    const currentPlayerState = players.find(p => p.id === initialPlayer.id);
    if (!currentPlayerState) return;

    // Check if all players are all-in
    const activePlayers = players.filter(p => !p.folded);
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    const allPlayersAllIn = activePlayers.length >= 2 && playersWithChips.length === 0;

    // If everyone is all-in, don't allow any more actions
    if (allPlayersAllIn) {
      console.log('All players are all-in, no more actions allowed');
      return;
    }

    // Send action to server
    pokerWebSocket.sendMessage({
      type: 'playerAction',
      payload: {
        type: action,
        amount: action === 'raise' ? parseInt(betAmount) || currentBet * 2 : undefined
      }
    });

    // Clear bet amount after action
    if (action === 'raise') {
      setBetAmount('');
    }
  };

  // Wrap handleStartGame in useCallback
  const handleStartGame = useCallback(() => {
    console.log('Sending start game');
    if (pokerWebSocket) {
      pokerWebSocket.sendMessage({
        type: 'startGame',
        payload: {}
      });
    }
  }, [pokerWebSocket]);

  const handleBetSize = (size: 'half' | 'twoThirds' | 'pot' | 'allin') => {
    if (!initialPlayer) return;

    switch (size) {
      case 'half':
        setBetAmount(Math.floor(pot * 0.5).toString());
        break;
      case 'twoThirds':
        setBetAmount(Math.floor(pot * 0.67).toString());
        break;
      case 'pot':
        setBetAmount(pot.toString());
        break;
      case 'allin':
        const player = players.find(p => p.id === initialPlayer.id);
        if (player) {
          setBetAmount(player.chips.toString());
        }
        break;
    }
  };

  const handleBetChange = (direction: 'increase' | 'decrease') => {
    if (!initialPlayer || !isConnected) return;

    // Calculate minimum raise amount based on current bet
    const minRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;
    
    const currentValue = parseInt(betAmount) || minRaiseAmount;
    const newBet = direction === 'increase' 
      ? currentValue + minBet 
      : Math.max(currentValue - minBet, minRaiseAmount);
    
    setBetAmount(newBet.toString());
  };

  const handleBetInput = (value: string) => {
    if (!initialPlayer || !isConnected) return;

    // Calculate minimum raise amount based on current bet
    const minRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;
    
    const newBet = parseInt(value);
    if (!isNaN(newBet) && newBet >= minRaiseAmount) {
      setBetAmount(newBet.toString());
    }
  };

  // Get active players count
  const activePlayersCount = players.filter(p => p.isActive).length;

  // Add this helper function to determine the winner
  function determineWinner(players: Player[], communityCards: Card[]): { 
    winnerId: string, 
    winningHand: { type: string, description: string } 
  } {
    let bestHandRank = -1;
    let winnerId = '';
    let winningHand = { type: '', description: '' };

    players.filter(p => p.isActive).forEach(player => {
      const hand = evaluateHand(player.cards || [], communityCards);
      const handRank = HAND_RANKINGS[hand.type as keyof typeof HAND_RANKINGS] || 0;
      
      if (handRank > bestHandRank) {
        bestHandRank = handRank;
        winnerId = player.id;
        winningHand = hand;
      }
    });

    return { winnerId, winningHand };
  }

  // Modify the SeatComponent to show only hand evaluation during showdown
  const SeatComponent = ({ position }: { position: TablePosition }) => {
    const player = players.find(p => p.position === position);
    const isBottomHalf = [4, 5, 6, 7].includes(position);
    const isFolded = player && !player.isActive;
    const isShowdown = gameState?.status === 'finished' && gameState?.phase === 'showdown';
    
    // Check if all active players are all-in
    const activePlayers = players.filter(p => !p.folded);
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    const allPlayersAllIn = activePlayers.length >= 2 && playersWithChips.length === 0;
    
    // Show cards if it's showdown or all players are all-in
    const shouldShowCards = isShowdown || allPlayersAllIn;
    
    // Determine if this player is the winner during showdown
    const isWinner = isShowdown && player?.isActive && (() => {
      const { winnerId } = determineWinner(players, communityCards);
      return player.id === winnerId;
    })();
    
    return (
      <div className="relative">
        {/* Player info container - only shown when seat is occupied */}
        {player && (
          <>
            {/* Player info */}
            <div className={`absolute ${isBottomHalf ? '-bottom-6' : '-top-6'} left-1/2 transform -translate-x-1/2 bg-gray-900/90 px-4 py-2 whitespace-nowrap z-10 flex items-center gap-2 border-2 ${
              isWinner 
                ? 'border-yellow-400 bg-yellow-900/90' 
                : player?.isCurrent
                  ? 'border-yellow-500 active-player'
                  : 'border-gray-600'
            } rounded ${isFolded ? 'opacity-50' : ''}`}>
              {!isShowdown || isFolded ? (
                // Normal display during gameplay or for folded players
                <>
                  {player.isDealer && (
                    <div className="w-4 h-4 bg-white rounded-full text-black text-[10px] flex items-center justify-center font-bold">
                      D
                    </div>
                  )}
                  <span className="text-white text-xs font-bold">{player.name}</span>
                  <span className="text-gray-400 text-xs">|</span>
                  <span className="text-yellow-400 text-xs font-bold">{player.chips}</span>
                </>
              ) : player.isActive ? (
                // Show only hand evaluation for active players during showdown
                <span className="text-green-400 text-xs font-bold">
                  {evaluateHand(player.cards || [], communityCards).description}
                </span>
              ) : null}
            </div>

            {/* Player Cards - show if player hasn't folded or if it's showdown */}
            {player.cards && (shouldShowCards ? player.isActive : !isFolded) && (
              <div className={`absolute ${isBottomHalf ? 'bottom-16' : '-bottom-14'} left-1/2 transform -translate-x-1/2 flex gap-1`}>
                {player.cards.map((card, i) => (
                  <div key={i} className="w-12 h-18 relative">
                    <Image
                      src={isShowdown || allPlayersAllIn || player.id === initialPlayer?.id 
                        ? `/cards/${card.rank}${card.suit}.png` 
                        : '/cards/blue_back.png'}
                      alt={isShowdown || allPlayersAllIn || player.id === initialPlayer?.id 
                        ? `${card.rank} of ${card.suit}` 
                        : 'Card back'}
                      width={60}
                      height={90}
                      className={`w-full h-full object-contain rounded-sm shadow-md ${
                        isFolded ? 'opacity-50 grayscale' : ''
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Player Bet */}
            {player.currentBet > 0 && (
              <ChipStack 
                amount={player.currentBet} 
                position={position} 
              />
            )}
          </>
        )}
        
        {/* Seat circle */}
        <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center overflow-hidden border-2 ${
          isWinner 
            ? 'border-yellow-400 shadow-lg shadow-yellow-400/50'
            : player?.isCurrent 
              ? 'border-yellow-500 active-player shadow-lg shadow-yellow-500/50' 
              : 'border-gray-600'
        } ${
          !player ? 'bg-gray-800 opacity-60 font-bold' : 'bg-gray-800'
        }`}>
          {player ? (
            <Image
              src={AVATAR_URLS[position - 1]}
              alt={player.name}
              width={80}
              height={80}
              className={`w-full h-full object-cover ${isFolded ? 'opacity-50 grayscale' : ''}`}
            />
          ) : (
            <span className="text-white text-xs">EMPTY</span>
          )}
        </div>
      </div>
    );
  };

  // Modify the winner announcement effect
  useEffect(() => {
    if (gameState?.status === 'finished' && gameState?.phase === 'showdown') {
      const { winnerId, winningHand } = determineWinner(players, communityCards);
      const winner = players.find(p => p.id === winnerId);
      
      if (winner) {
        // Set the pot distribution message
        setPotDistributionMessage(`${winner.name} wins ${pot} with ${winningHand.description}`);
        
        // Add system message
        addChatMessage({
          playerId: 'system',
          message: `${winner.name} wins ${pot} with ${winningHand.description}`,
          timestamp: new Date()
        });

        // Start new hand after 5 seconds
        setTimeout(() => {
          setPotDistributionMessage('');
          handleStartGame();
        }, 5000);
      }
    }
  }, [gameState?.status, gameState?.phase, players, communityCards, pot, handleStartGame]);

  // Helper function for ordinal suffixes
  const getOrdinalSuffix = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  // Handle null/undefined gameState properties safely
  const smallBlind = gameState?.smallBlind ?? 10;
  const bigBlind = gameState?.bigBlind ?? 20;
  const currentPhase = gameState?.phase ?? 'pre-flop';
  const gameStatus = gameState?.status ?? 'waiting';

  return (
    <div className="relative w-full h-full">
      <style>{pulsingBorder}</style>
      {/* Elimination Message */}
      {eliminationMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80">
          <div className="bg-gray-900 p-8 rounded-lg border-2 border-yellow-400 text-center">
            <h2 className="text-3xl font-bold text-yellow-400 mb-4">{eliminationMessage}</h2>
            <p className="text-white text-lg">Thanks for playing!</p>
          </div>
        </div>
      )}
      
      <div className="h-full flex flex-col">
        <div className="flex-1 flex gap-3 p-3">
          <div className="flex-1 flex flex-col gap-3 overflow-visible">
            <div className="h-[70%] relative overflow-visible">
              <div className="absolute inset-x-24 inset-y-12 rounded-3xl bg-[#1a6791] [background:radial-gradient(circle,#1a6791_0%,#14506e_70%,#0d3b51_100%)] border-2 border-[#d88a2b]">
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
                  {pot > 0 && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <PotDisplay amount={pot} />
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center -space-x-16">
                      <span className="text-transparent text-7xl [-webkit-text-stroke:3px_#FFE135] [text-stroke:3px_#FFE135] [font-family:'Poppins',sans-serif] font-black tracking-wider opacity-40 z-0">BUX</span>
                      <img 
                        src="/solana.svg" 
                        alt="Solana Logo" 
                        className="w-64 h-64 [filter:invert(1)_blur(2px)] opacity-20 z-0"
                      />
                      <span className="text-transparent text-7xl [-webkit-text-stroke:3px_#FFE135] [text-stroke:3px_#FFE135] [font-family:'Poppins',sans-serif] font-black tracking-wider opacity-40 z-0">DAO</span>
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-4">
                    {potDistributionMessage && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 px-6 py-3 rounded-lg border-2 border-yellow-400 shadow-lg z-20">
                        <span className="text-yellow-400 text-lg font-bold whitespace-nowrap">
                          {potDistributionMessage}
                        </span>
                      </div>
                    )}

                    {communityCards.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        {communityCards.map((card, i) => (
                          <div key={i} className="w-16 h-24 relative">
                            <Image
                              src={`/cards/${card.rank}${card.suit}.png`}
                              alt={`${card.rank} of ${card.suit}`}
                              width={60}
                              height={90}
                              className="w-full h-full object-contain rounded-md shadow-lg"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {gameStatus === 'waiting' && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <button
                        onClick={handleStartGame}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Start Game
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute top-0 left-1/3 transform -translate-x-1/2">
                <SeatComponent position={1 as TablePosition} />
              </div>
              <div className="absolute top-0 right-1/3 transform translate-x-1/2">
                <SeatComponent position={2 as TablePosition} />
              </div>

              <div className="absolute top-1/4 right-16 transform -translate-y-1/2">
                <SeatComponent position={3 as TablePosition} />
              </div>
              <div className="absolute bottom-1/4 right-16 transform translate-y-1/2">
                <SeatComponent position={4 as TablePosition} />
              </div>

              <div className="absolute bottom-0 right-1/3 transform translate-x-1/2">
                <SeatComponent position={5 as TablePosition} />
              </div>
              <div className="absolute bottom-0 left-1/3 transform -translate-x-1/2">
                <SeatComponent position={6 as TablePosition} />
              </div>

              <div className="absolute bottom-1/4 left-16 transform translate-y-1/2">
                <SeatComponent position={7 as TablePosition} />
              </div>
              <div className="absolute top-1/4 left-16 transform -translate-y-1/2">
                <SeatComponent position={8 as TablePosition} />
              </div>
            </div>

            <div className="h-[30%] bg-gray-900 rounded-lg p-4 flex items-center gap-8">
              <div className="flex-none w-52 bg-black/30 p-4 rounded-lg">
                {initialPlayer?.id && originalCards.has(initialPlayer.id) ? (
                  <div className="flex gap-2">
                    {(originalCards.get(initialPlayer.id) || []).map((card, i) => (
                      <div key={i} className="w-24 h-36 relative">
                        <Image
                          src={`/cards/${card.rank}${card.suit}.png`}
                          alt={`${card.rank} of ${card.suit}`}
                          width={60}
                          height={90}
                          className={`w-full h-full object-contain rounded-md shadow-lg ${
                            !players.find(p => p.id === initialPlayer?.id)?.isActive 
                              ? 'opacity-50 grayscale' 
                              : ''
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">Your cards will appear here</div>
                )}
              </div>

              <div className="flex-none w-52 bg-black/30 p-4 rounded-lg">
                <div className="text-white text-sm font-bold">Best Hand</div>
                {initialPlayer?.id && originalCards.has(initialPlayer.id) ? (
                  <div className="text-yellow-400 text-lg font-bold mt-1">
                    {evaluateHand(
                      originalCards.get(initialPlayer.id) || [],
                      communityCards
                    ).description}
                  </div>
                ) : (
                  <div className="text-yellow-400 text-lg font-bold mt-1">
                    Waiting for cards...
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-3 items-end">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAction('fold')}
                    className="bg-red-600 text-white w-[8.5rem] py-4 rounded text-base font-bold hover:bg-red-700 transition-colors border border-white"
                  >
                    FOLD
                  </button>
                  {(() => {
                    const playerState = players.find(p => p.id === initialPlayer?.id);
                    const canCheck = playerState && (
                      (playerState.currentBet === currentBet) ||
                      (currentBet === 0 && !playerState.hasActed)
                    );

                    return (
                      <button
                        onClick={() => handleAction(canCheck ? 'check' : 'call')}
                        className="bg-blue-600 text-white w-[8.5rem] py-4 rounded text-base font-bold hover:bg-blue-700 transition-colors border border-white"
                      >
                        {canCheck ? 'CHECK' : 'CALL'}
                      </button>
                    );
                  })()}
                  {(() => {
                    const playerState = players.find(p => p.id === initialPlayer?.id);
                    const minRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;
                    const canRaise = playerState && (playerState.chips > minRaiseAmount);
                    
                    return (
                      <button
                        onClick={() => handleAction('raise')}
                        disabled={!canRaise}
                        className={`${
                          canRaise 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-gray-600 cursor-not-allowed'
                        } text-white w-[8.5rem] py-4 rounded text-base font-bold transition-colors flex items-center justify-center gap-2 border border-white`}
                      >
                        <span>{currentBet === 0 ? 'BET' : 'RAISE'}</span>
                        <span>{betAmount || currentBet * 2}</span>
                      </button>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex gap-3 w-[8.5rem] ${
                    (() => {
                      const playerState = players.find(p => p.id === initialPlayer?.id);
                      const minRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;
                      return playerState && playerState.chips <= minRaiseAmount ? 'opacity-50 pointer-events-none' : '';
                    })()
                  }`}>
                    <button
                      onClick={() => handleBetSize('half')}
                      className="bg-gray-700 text-white w-16 py-2 rounded text-[11px] font-bold hover:bg-gray-600 transition-colors border border-green-500"
                    >
                      1/2
                    </button>
                    <button
                      onClick={() => handleBetSize('twoThirds')}
                      className="bg-gray-700 text-white w-16 py-2 rounded text-[11px] font-bold hover:bg-gray-600 transition-colors border border-green-500"
                    >
                      2/3
                    </button>
                  </div>
                  <div className={`flex gap-3 w-[8.5rem] ${
                    (() => {
                      const playerState = players.find(p => p.id === initialPlayer?.id);
                      const minRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;
                      return playerState && playerState.chips <= minRaiseAmount ? 'opacity-50 pointer-events-none' : '';
                    })()
                  }`}>
                    <button
                      onClick={() => handleBetSize('pot')}
                      className="bg-gray-700 text-white w-16 py-2 rounded text-[11px] font-bold hover:bg-gray-600 transition-colors border border-green-500"
                    >
                      POT
                    </button>
                    <button
                      onClick={() => handleBetSize('allin')}
                      className="bg-gray-700 text-white w-16 py-2 rounded text-[11px] font-bold hover:bg-gray-600 transition-colors border border-green-500"
                    >
                      ALL IN
                    </button>
                  </div>
                  <div className={`flex items-center gap-2 w-[8.5rem] ${
                    (() => {
                      const playerState = players.find(p => p.id === initialPlayer?.id);
                      const minRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;
                      return playerState && playerState.chips <= minRaiseAmount ? 'opacity-50 pointer-events-none' : '';
                    })()
                  }`}>
                    <button
                      onClick={() => handleBetChange('decrease')}
                      className="bg-gray-700 text-white w-8 h-8 rounded-full text-sm font-bold hover:bg-gray-600 transition-colors flex items-center justify-center border border-green-500"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => handleBetInput(e.target.value)}
                      className="w-20 px-3 py-2 bg-white text-black text-sm text-center font-bold border border-gray-300 rounded focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder={`${currentBet * 2}`}
                    />
                    <button
                      onClick={() => handleBetChange('increase')}
                      className="bg-gray-700 text-white w-8 h-8 rounded-full text-sm font-bold hover:bg-gray-600 transition-colors flex items-center justify-center border border-green-500"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-80 h-full flex flex-col bg-gray-800 rounded-lg">
            <div className="flex-none p-3 border-b border-gray-700 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-bold">SYSTEM</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSystemMessages}
                    onChange={() => setShowSystemMessages(!showSystemMessages)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-bold">CHAT</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPlayerChat}
                    onChange={() => setShowPlayerChat(!showPlayerChat)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            <div className="h-[550px] overflow-y-auto">
              <div className="p-3 space-y-2">
                {chatMessages
                  .filter(msg => (
                    (msg.playerId === 'system' && showSystemMessages) ||
                    (msg.playerId !== 'system' && showPlayerChat)
                  ))
                  .map((msg, i) => (
                    <div 
                      key={i} 
                      className={`${
                        msg.playerId === 'system' 
                          ? 'bg-gray-900/50 text-gray-300 text-[11px] py-1.5 px-2 rounded border border-gray-700/50' 
                          : 'flex flex-col gap-0.5'
                      }`}
                    >
                      {msg.playerId !== 'system' && (
                        <span className="text-[10px] text-gray-400 px-2">
                          {players.find(p => p.id === msg.playerId)?.name || msg.playerId}
                        </span>
                      )}
                      {msg.playerId === 'system' ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          <span>{msg.message}</span>
                        </div>
                      ) : (
                        <div className={`px-3 py-1.5 rounded-2xl text-xs max-w-[90%] ${
                          msg.playerId === initialPlayer?.id
                            ? 'bg-blue-600/50 text-white ml-auto rounded-tr-none'
                            : 'bg-gray-700/50 text-white rounded-tl-none'
                        }`}>
                          {msg.message}
                        </div>
                      )}
                    </div>
                  ))}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="flex-none h-12 p-2 border-t border-gray-700">
              <form onSubmit={handleSendChat} className="flex gap-2 h-full">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-900 text-white rounded-full px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={!isConnected}
                />
                <button
                  type="submit"
                  disabled={!isConnected || !chatInput.trim()}
                  className="bg-blue-600 text-white px-3 rounded-full text-xs font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to position players around the table
function getPlayerPosition(position: number): string {
  const positions = {
    1: 'bottom-0 left-1/2 -translate-x-1/2',      // Bottom center
    2: 'bottom-1/4 right-1/4',                    // Bottom right
    3: 'right-0 top-1/2 -translate-y-1/2',        // Right center
    4: 'top-1/4 right-1/4',                       // Top right
    5: 'top-0 left-1/2 -translate-x-1/2',         // Top center
    6: 'top-1/4 left-1/4',                        // Top left
    7: 'left-0 top-1/2 -translate-y-1/2',         // Left center
    8: 'bottom-1/4 left-1/4',                     // Bottom left
  };
  return positions[position as keyof typeof positions] || '';
}

function findNextAvailablePosition(players: Player[]): TablePosition {
  const takenPositions = new Set(players.map(p => p.position));
  let position = 2 as TablePosition;
  while (takenPositions.has(position) && position <= 8) {
    position = ((position + 1) as TablePosition);
  }
  return position <= 8 ? position : (2 as TablePosition);
}

function findNextAvailableAvatar(players: Player[]): string {
  const availableAvatars = AVATAR_URLS.filter(url => 
    !players.some(p => p.avatarUrl === url)
  );
  return availableAvatars.length > 0 
    ? availableAvatars[Math.floor(Math.random() * availableAvatars.length)]
    : AVATAR_URLS[Math.floor(Math.random() * AVATAR_URLS.length)];
} 