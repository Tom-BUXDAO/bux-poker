'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, PlayerAction, Player, TablePosition } from '@/types/poker';
import pokerWebSocket from '@/lib/poker/client-websocket';
import ChipStack from './ChipStack';
import PotDisplay from './PotDisplay';

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
  payload: any;
}

interface PokerTableProps {
  tableId: string;
  currentPlayer?: Player;
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

export default function PokerTable({ tableId, currentPlayer }: PokerTableProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [betAmount, setBetAmount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const announcedPlayers = useRef<Set<string>>(new Set());
  const [gameStatus, setGameStatus] = useState('waiting');
  const [showSystemMessages, setShowSystemMessages] = useState(true);
  const [showPlayerChat, setShowPlayerChat] = useState(true);
  const [originalCards, setOriginalCards] = useState<Map<string, Card[]>>(new Map());
  const [potDistributionMessage, setPotDistributionMessage] = useState<string>('');

  // Calculate default raise amount
  const minBet = gameState?.smallBlind * 2 || 20; // Use big blind from game state if available
  const defaultRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;

  useEffect(() => {
    // Set default bet amount when currentBet changes
    setBetAmount(defaultRaiseAmount.toString());
  }, [currentBet, defaultRaiseAmount]);

  // Auto scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentPlayer?.id) {
      // Clean up any existing connections and event listeners
      pokerWebSocket.cleanup();
      announcedPlayers.current.clear();

      // Set up event listeners
      pokerWebSocket.onConnected(() => {
        console.log('WebSocket connected');
        setIsConnected(true);
      });

      pokerWebSocket.onDisconnected(() => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      });

      pokerWebSocket.on('gameState', (state: any) => {
        console.log('Received game state:', state);
        setGameState(state);  // Store the full game state
        
        const updatedPlayers = state.players.map((p: Player) => {
          // Store original cards when they are dealt
          if (p.cards && p.cards.length > 0) {
            const cards = [...p.cards];  // Create a copy of the cards array
            setOriginalCards(prev => new Map(prev).set(p.id, cards));
          }

          // Only announce new players once
          if (!announcedPlayers.current.has(p.id)) {
            announcedPlayers.current.add(p.id);
            const playerName = p.name || p.id.slice(0, 8);
            addChatMessage({
              playerId: 'system',
              message: `${playerName} joined the table`,
              timestamp: new Date()
            });
          }

          // Update player state with all properties from server
          return {
            ...p,
            name: p.name || p.id.slice(0, 8),
            chips: p.chips || 0,
            currentBet: p.currentBet || 0,
            isActive: p.isActive ?? true,
            isCurrent: p.isCurrent ?? false,
            isDealer: p.isDealer ?? false,
            cards: p.cards || []
          };
        });

        // Update all state values from server
        setPlayers(updatedPlayers);
        setCommunityCards(state.communityCards || []);
        setPot(state.pot || 0);
        setCurrentBet(state.currentBet || 0);
        setGameStatus(state.status || 'waiting');
      });

      pokerWebSocket.on('playerLeft', (playerId: string) => {
        const leavingPlayer = players.find(p => p.id === playerId);
        if (leavingPlayer) {
          addChatMessage({
            playerId: 'system',
            message: `${leavingPlayer.name} left the table`,
            timestamp: new Date()
          });
        }
      });

      pokerWebSocket.on('chat', (data: ChatMessage) => {
        addChatMessage(data);
      });

      // Connect to WebSocket
      pokerWebSocket.connect(tableId, currentPlayer.id);

      return () => {
        pokerWebSocket.cleanup();
      };
    }
  }, [tableId, currentPlayer?.id]);

  const addChatMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentPlayer || !isConnected) return;

    const message: WebSocketMessage = {
      type: 'chat',
      payload: {
        playerId: currentPlayer.id,
        message: chatInput.trim(),
        timestamp: new Date()
      }
    };

    pokerWebSocket.sendMessage(message);
    setChatInput('');
  };

  const handleAction = (action: PlayerAction) => {
    if (!currentPlayer || !isConnected) {
      console.log('Cannot perform action:', { isConnected, currentPlayer });
      return;
    }

    // Get current game state for the player
    const currentPlayerState = players.find(p => p.id === currentPlayer.id);
    console.log('Attempting action:', {
      action,
      playerId: currentPlayer.id,
      playerState: currentPlayerState,
      currentPosition: gameState?.currentPosition,
      playerPosition: currentPlayerState?.position,
      isCurrent: currentPlayerState?.isCurrent,
      currentBet,
      playerCurrentBet: currentPlayerState?.currentBet
    });

    // Check if it's the player's turn by comparing positions
    const isPlayerTurn = currentPlayerState?.position === gameState?.currentPosition;
    
    if (!isPlayerTurn) {
      console.log('Not your turn - position mismatch:', { 
        playerId: currentPlayer.id,
        playerPosition: currentPlayerState?.position,
        currentGamePosition: gameState?.currentPosition,
        isCurrent: currentPlayerState?.isCurrent
      });
      return;
    }

    // For raise action, validate bet amount
    if (action === 'raise') {
      const amount = parseInt(betAmount);
      if (isNaN(amount) || amount <= 0) {
        console.log('Invalid bet amount:', betAmount);
        return;
      }
      console.log('Sending raise action:', { type: action, amount });
      pokerWebSocket.sendAction({
        type: action,
        amount
      });
    } else {
      // For check/call/fold actions
      console.log('Sending action:', { 
        type: action,
        currentBet,
        playerCurrentBet: currentPlayerState?.currentBet
      });
      pokerWebSocket.sendAction({
        type: action
      });
    }
  };

  const handleStartGame = () => {
    if (!isConnected) return;

    console.log('Sending start game');
    pokerWebSocket.sendMessage({
      type: 'startGame',
      payload: null
    });
  };

  const handleBetSize = (size: 'half' | 'twoThirds' | 'pot' | 'allin') => {
    if (!currentPlayer) return;

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
        const player = players.find(p => p.id === currentPlayer.id);
        if (player) {
          setBetAmount(player.chips.toString());
        }
        break;
    }
  };

  const handleBetChange = (direction: 'increase' | 'decrease') => {
    if (!currentPlayer || !isConnected) return;

    // Calculate minimum raise amount based on current bet
    const minRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;
    
    const currentValue = parseInt(betAmount) || minRaiseAmount;
    const newBet = direction === 'increase' 
      ? currentValue + minBet 
      : Math.max(currentValue - minBet, minRaiseAmount);
    
    setBetAmount(newBet.toString());
  };

  const handleBetInput = (value: string) => {
    if (!currentPlayer || !isConnected) return;

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
            {player.cards && (isShowdown ? player.isActive : !isFolded) && (
              <div className={`absolute ${isBottomHalf ? 'bottom-16' : '-bottom-14'} left-1/2 transform -translate-x-1/2 flex gap-1`}>
                {player.cards.map((card, i) => (
                  <div key={i} className="w-12 h-18 relative">
                    <img
                      src={isShowdown || player.id === currentPlayer?.id ? `/cards/${card.rank}${card.suit}.png` : '/cards/blue_back.png'}
                      alt={isShowdown || player.id === currentPlayer?.id ? `${card.rank}${card.suit}` : 'Card back'}
                      className={`w-full h-full object-contain rounded-sm shadow-md ${
                        isFolded ? 'opacity-50 grayscale' : ''
                      } ${isWinner ? 'ring-2 ring-yellow-400' : ''}`}
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
            <img 
              src={AVATAR_URLS[position - 1]} 
              alt={player.name}
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

        // Start new hand after 0.5 seconds
        setTimeout(() => {
          setPotDistributionMessage('');
          handleStartGame();
        }, 500);
      }
    }
  }, [gameState?.status, gameState?.phase]);

  return (
    <div className="h-full flex flex-col">
      {/* Add the style tag for the animation */}
      <style>{pulsingBorder}</style>
      
      <div className="flex-1 flex gap-3 p-3">
        {/* Main content (table + actions) */}
        <div className="flex-1 flex flex-col gap-3 overflow-visible">
          {/* Poker Table - 70% height */}
          <div className="h-[70%] relative overflow-visible">
            {/* The actual table surface - smaller with padding for seats */}
            <div className="absolute inset-x-24 inset-y-12 rounded-3xl bg-[#1a6791] [background:radial-gradient(circle,#1a6791_0%,#14506e_70%,#0d3b51_100%)] border-2 border-[#d88a2b]">
              {/* Table content */}
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
                {/* Pot Distribution Message */}
                {potDistributionMessage && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 px-6 py-3 rounded-lg border-2 border-yellow-400 shadow-lg z-20">
                    <span className="text-yellow-400 text-lg font-bold whitespace-nowrap">
                      {potDistributionMessage}
                    </span>
                  </div>
                )}

                {/* Community Cards */}
                {communityCards.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {communityCards.map((card, i) => (
                      <div key={i} className="w-16 h-24 relative">
                        <img
                          src={`/cards/${card.rank}${card.suit}.png`}
                          alt={`${card.rank}${card.suit}`}
                          className="w-full h-full object-contain rounded-md shadow-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Pot Display */}
                {pot > 0 && <PotDisplay amount={pot} />}

                {/* Start Game Button */}
                {gameStatus === 'waiting' && activePlayersCount >= 2 && (
                  <button
                    onClick={handleStartGame}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full text-sm font-bold transition-colors shadow-lg"
                  >
                    Start Game
                  </button>
                )}
              </div>

              {/* Connection Status */}
              <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              } text-white z-10`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>

            {/* Fixed seat positions */}
            {/* Top seats */}
            <div className="absolute top-0 left-1/3 transform -translate-x-1/2">
              <SeatComponent position={1 as TablePosition} />
            </div>
            <div className="absolute top-0 right-1/3 transform translate-x-1/2">
              <SeatComponent position={2 as TablePosition} />
            </div>

            {/* Right seats */}
            <div className="absolute top-1/4 right-16 transform -translate-y-1/2">
              <SeatComponent position={3 as TablePosition} />
            </div>
            <div className="absolute bottom-1/4 right-16 transform translate-y-1/2">
              <SeatComponent position={4 as TablePosition} />
            </div>

            {/* Bottom seats */}
            <div className="absolute bottom-0 right-1/3 transform translate-x-1/2">
              <SeatComponent position={5 as TablePosition} />
            </div>
            <div className="absolute bottom-0 left-1/3 transform -translate-x-1/2">
              <SeatComponent position={6 as TablePosition} />
            </div>

            {/* Left seats */}
            <div className="absolute bottom-1/4 left-16 transform translate-y-1/2">
              <SeatComponent position={7 as TablePosition} />
            </div>
            <div className="absolute top-1/4 left-16 transform -translate-y-1/2">
              <SeatComponent position={8 as TablePosition} />
            </div>
          </div>

          {/* Controls Container - remaining height */}
          <div className="h-[30%] bg-gray-900 rounded-lg p-4 flex items-center gap-8">
            {/* Large Card Display */}
            <div className="flex-none w-52 bg-black/30 p-4 rounded-lg">
              {currentPlayer?.id && originalCards.has(currentPlayer.id) ? (
                <div className="flex gap-2">
                  {(originalCards.get(currentPlayer.id) || []).map((card, i) => (
                    <div key={i} className="w-24 h-36 relative">
                      <img
                        src={`/cards/${card.rank}${card.suit}.png`}
                        alt={`${card.rank}${card.suit}`}
                        className={`w-full h-full object-contain rounded-md shadow-lg ${
                          !players.find(p => p.id === currentPlayer?.id)?.isActive 
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

            {/* Hand Evaluator */}
            <div className="flex-none w-52 bg-black/30 p-4 rounded-lg">
              <div className="text-white text-sm font-bold">Best Hand</div>
              {currentPlayer?.id && originalCards.has(currentPlayer.id) ? (
                <div className="text-yellow-400 text-lg font-bold mt-1">
                  {evaluateHand(
                    originalCards.get(currentPlayer.id) || [],
                    communityCards
                  ).description}
                </div>
              ) : (
                <div className="text-yellow-400 text-lg font-bold mt-1">
                  Waiting for cards...
                </div>
              )}
            </div>

            {/* Action Panel */}
            <div className="flex-1 flex flex-col gap-3 items-end">
              {/* Top row - main actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAction('fold')}
                  className="bg-red-600 text-white w-[8.5rem] py-4 rounded text-base font-bold hover:bg-red-700 transition-colors border border-white"
                >
                  FOLD
                </button>
                {/* Determine if player can check */}
                {(() => {
                  const playerState = players.find(p => p.id === currentPlayer?.id);
                  const canCheck = playerState && (
                    (playerState.currentBet === currentBet) || // Player has matched the current bet
                    (currentBet === 0 && !playerState.hasActed) // No bet and player hasn't acted
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
                <button
                  onClick={() => handleAction('raise')}
                  className="bg-green-600 text-white w-[8.5rem] py-4 rounded text-base font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 border border-white"
                >
                  <span>{currentBet === 0 ? 'BET' : 'RAISE'}</span>
                  <span>{betAmount || currentBet * 2}</span>
                </button>
              </div>

              {/* Bottom row - bet sizing and input */}
              <div className="flex items-center gap-3">
                <div className="flex gap-3 w-[8.5rem]">
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
                <div className="flex gap-3 w-[8.5rem]">
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
                <div className="flex items-center gap-2 w-[8.5rem]">
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

        {/* Chat Window */}
        <div className="w-80 h-full flex flex-col bg-gray-800 rounded-lg">
          {/* Chat Header */}
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

          {/* Chat Messages */}
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
                        msg.playerId === currentPlayer?.id
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

          {/* Chat Input */}
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