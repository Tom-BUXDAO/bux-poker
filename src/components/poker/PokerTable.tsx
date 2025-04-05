'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, PlayerAction, Player, TablePosition, GameState } from '@/types/poker';
import pokerWebSocket from '@/lib/poker/client-websocket';
import ChipStack from './ChipStack';
import PotDisplay from './PotDisplay';
import Image from 'next/image';
import Link from 'next/link';
import { useWebSocket } from '@/lib/poker/WebSocketContext';
import dynamic from 'next/dynamic';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

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
  const ws = useWebSocket();
  const [players, setPlayers] = useState<Player[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [betAmount, setBetAmount] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const minBet = 20;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Add table ID validation with SSR support
  const actualTableId = useMemo(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined') {
      return 'dev-tournament'; // Default value during SSR
    }

    // Extract the tournament ID from the URL on client side
    const pathParts = window.location.pathname.split('/');
    const tournamentId = pathParts[pathParts.indexOf('table') + 1];
    return tournamentId || 'dev-tournament';
  }, []);

  // Initialize WebSocket connection and event handlers
  useEffect(() => {
    if (!initialPlayer || !actualTableId) return;

    console.log('Connecting to WebSocket:', {
      tableId: actualTableId,
      playerId: initialPlayer.id
    });

    // Connect to WebSocket
    ws.connect(actualTableId, initialPlayer.id, {
      name: initialPlayer.name,
      chips: initialPlayer.chips || 1000
    });

    // Set up event handlers
    const handleGameState = (data: any) => {
      if (!data || !data.type) return;
      
      if (data.type === 'gameState') {
        const gameState = data.payload;
        setPlayers(gameState.players || []);
        setCommunityCards(gameState.communityCards || []);
        setPot(gameState.pot || 0);
        setCurrentBet(gameState.currentBet || 0);
        if (gameState.status === 'playing') {
          setIsStarted(true);
        }
      }
    };

    // Subscribe to events
    ws.on('message', handleGameState);

    // Cleanup function
    return () => {
      console.log('Cleaning up WebSocket connection');
      ws.off('message', handleGameState);
    };
  }, [actualTableId, initialPlayer, ws]);

  // Update connection status
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(ws.isConnected);
    }
  }, [ws.isConnected, onConnectionChange]);

  // Handle chat messages
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setChatInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleSendChat = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !initialPlayer || !ws.isConnected) return;

    const chatMessage = {
      type: 'chat',
      payload: {
        playerId: initialPlayer.id,
        message: chatInput.trim(),
        timestamp: new Date().toISOString()
      }
    };

    console.log('Sending chat message:', chatMessage);
    ws.sendMessage(chatMessage);
    setChatInput('');
  }, [chatInput, initialPlayer, ws.isConnected, ws.sendMessage]);

  // Handle game actions
  const handleAction = useCallback((action: PlayerAction) => {
    if (!initialPlayer || !ws.isConnected) return;

    const currentPlayerState = players.find(p => p.id === initialPlayer.id);
    if (!currentPlayerState) return;

    ws.sendMessage({
      type: 'playerAction',
      payload: {
        type: action,
        amount: action === 'raise' ? parseInt(betAmount) || currentBet * 2 : undefined
      }
    });

    if (action === 'raise') {
      setBetAmount('');
    }
  }, [betAmount, currentBet, initialPlayer, players, ws.isConnected, ws.sendMessage]);

  // Handle game start
  const handleStartGame = useCallback(() => {
    if (!ws.isConnected) return;
    
    console.log('Sending start game');
    ws.sendMessage({
      type: 'startGame',
      payload: {}
    });
  }, [ws.isConnected, ws.sendMessage]);

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

  // Add initialization tracking
  const isInitializedRef = useRef(false);
  const playerInitializedRef = useRef(false);
  const connectionRef = useRef({
    isInitialized: false,
    isConnecting: false,
    shouldCleanup: false,
    ws: null as any
  });
  const isFastRefreshRef = useRef(false);

  // Track initial player for strict mode
  const initialPlayerRef = useRef(initialPlayer);

  // Initialize players state with the current player
  const [playersState, setPlayersState] = useState<Player[]>(() => {
    if (!isInitializedRef.current && initialPlayer) {
      isInitializedRef.current = true;
      initialPlayerRef.current = initialPlayer;
      console.log('Initializing player state with:', initialPlayer);
      return []; // Let server assign positions
    }
    return [];
  });

  // Sync player state with initial player changes
  useEffect(() => {
    if (initialPlayer && !playerInitializedRef.current) {
      console.log('Syncing player state with:', initialPlayer);
      playerInitializedRef.current = true;
      initialPlayerRef.current = initialPlayer;
      
      // Don't set initial position, let server assign it
      setPlayersState([]);
    }
  }, [initialPlayer]);

  // Reset initialization flag on unmount
  useEffect(() => {
    return () => {
      if (!isFastRefreshRef.current) {
        playerInitializedRef.current = false;
      }
    };
  }, []);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [eliminationMessage, setEliminationMessage] = useState<string>('');
  const [potDistributionMessage, setPotDistributionMessage] = useState<string>('');
  const [originalCards, setOriginalCards] = useState<Map<string, Card[]>>(new Map());
  const [showSystemMessages, setShowSystemMessages] = useState(true);
  const [showPlayerChat, setShowPlayerChat] = useState(true);
  const [nextLevelIn, setNextLevelIn] = useState(600); // 10 minutes in seconds

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const announcedPlayers = useRef<Set<string>>(new Set());

  // Add Fast Refresh detection
  const prevTableIdRef = useRef(tableId);
  const prevPlayerRef = useRef(initialPlayer);

  // Check if this is a Fast Refresh
  useEffect(() => {
    if (
      prevTableIdRef.current === tableId &&
      prevPlayerRef.current === initialPlayer &&
      process.env.NODE_ENV === 'development'
    ) {
      isFastRefreshRef.current = true;
    }
    prevTableIdRef.current = tableId;
    prevPlayerRef.current = initialPlayer;
  }, [tableId, initialPlayer]);

  // Auto scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Calculate default raise amount
  const defaultRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;

  // Memoize the handleGameState callback
  const handleGameState = useCallback((data: Record<string, unknown>) => {
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

        setPlayersState(updatedPlayers);
        setCommunityCards(state.communityCards || []);
        setPot(state.pot || 0);
        setCurrentBet(state.currentBet || 0);
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
  }, [initialPlayer]);

  // WebSocket message handler
  const handleMessage = useCallback((data: any) => {
    if (data.type === 'gameState') {
      const gameState = data.payload;
      
      // Update players with positions from server
      setPlayersState(prev => {
        const updatedPlayers = gameState.players.map((p: any) => ({
          id: p.id,
          name: p.name,
          chips: p.chips,
          position: p.position,
          isActive: p.isActive ?? true,
          isCurrent: p.isCurrent ?? false,
          isDealer: p.isDealer ?? false,
          currentBet: p.currentBet || 0,
          cards: p.cards || [],
          avatarUrl: p.position ? AVATAR_URLS[(p.position - 1) % AVATAR_URLS.length] : undefined,
          isConnected: true
        }));

        if (gameState.status === 'playing') {
          setIsStarted(true);
        }

        console.log('Updated players with server positions:', updatedPlayers);
        return updatedPlayers;
      });
    } else if (data.type === 'chat') {
      // Handle chat messages
      console.log('Received chat message:', data.payload);
      setChatMessages(prev => [...prev, {
        playerId: data.payload.playerId,
        message: data.payload.message,
        timestamp: new Date(data.payload.timestamp)
      }]);
    } else if (data.type === 'playerJoined') {
      // Log when a new player joins
      const joinedPlayer = data.payload.player;
      console.log(`Player ${joinedPlayer.name} joined with position ${joinedPlayer.position}`);
    } else if (data.type === 'chat') {
      // Handle chat messages
      const chatMessage = data.payload;
      console.log('Received chat message:', chatMessage);
      addChatMessage({
        playerId: chatMessage.playerId,
        message: chatMessage.message,
        timestamp: new Date(chatMessage.timestamp)
      });
    }
  }, []);

  // Initialize player state
  useEffect(() => {
    if (initialPlayer) {
      console.log('Initializing player state with:', initialPlayer);
      setPlayersState(prev => {
        // Only update if player doesn't exist yet
        if (!prev.some(p => p.id === initialPlayer.id)) {
          return [...prev, {
            ...initialPlayer,
            // Let server assign position
            avatarUrl: initialPlayer.position ? AVATAR_URLS[(initialPlayer.position - 1) % AVATAR_URLS.length] : undefined
          }];
        }
        return prev;
      });
    }
  }, [initialPlayer]);

  // WebSocket connection effect
  useEffect(() => {
    // Don't reinitialize if this is a Fast Refresh
    if (isFastRefreshRef.current) {
      console.log('Fast Refresh detected, preserving WebSocket connection');
      isFastRefreshRef.current = false;
      return;
    }

    // Don't initialize if we don't have a player
    if (!initialPlayer) {
      console.log('Skipping WebSocket initialization: no player');
      return;
    }

    console.log('Initializing WebSocket connection:', {
      tableId: actualTableId,
      player: {
        id: initialPlayer.id,
        name: initialPlayer.name,
        chips: initialPlayer.chips
      }
    });

    const handleConnect = () => {
      console.log('WebSocket connected successfully:', {
        player: initialPlayer.id,
        table: actualTableId
      });
      connectionRef.current.isConnecting = false;
    };

    const handleDisconnect = () => {
      console.log('WebSocket disconnected:', {
        player: initialPlayer.id,
        table: actualTableId
      });
      connectionRef.current.isConnecting = false;
    };

    const handleError = (data: Record<string, unknown>) => {
      console.error('WebSocket error:', {
        player: initialPlayer.id,
        table: actualTableId,
        error: data.error
      });
    };

    // Initialize WebSocket connection
    ws.connect(actualTableId, initialPlayer.id, {
      name: initialPlayer.name,
      chips: initialPlayer.chips || 1000
    });

    // Set up event handlers
    ws.on('connect', handleConnect);
    ws.on('disconnect', handleDisconnect);
    ws.on('error', handleError);
    ws.on('message', handleMessage);

    // Store connection state
    connectionRef.current.isInitialized = true;
    connectionRef.current.isConnecting = true;

    // Cleanup function
    return () => {
      // Skip cleanup if component is not truly unmounting
      if (isFastRefreshRef.current) {
        console.log('Skipping cleanup due to Fast Refresh');
        return;
      }

      console.log('Cleaning up WebSocket connection:', {
        player: initialPlayer.id,
        table: actualTableId
      });

      ws.off('connect', handleConnect);
      ws.off('disconnect', handleDisconnect);
      ws.off('error', handleError);
      ws.off('message', handleMessage);

      // Only disconnect if we're truly unmounting
      if (!isFastRefreshRef.current) {
        ws.disconnect();
      }

      connectionRef.current.isInitialized = false;
      connectionRef.current.isConnecting = false;
    };
  }, [actualTableId, initialPlayer, ws, handleMessage]);

  // Add cleanup effect for true unmount
  useEffect(() => {
    return () => {
      // Only set cleanup flag if not Fast Refreshing
      if (!isFastRefreshRef.current) {
        console.log('Component unmounting, marking for cleanup');
        connectionRef.current.shouldCleanup = true;
      }
    };
  }, []);

  const addChatMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  };

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
        const player = playersState.find(p => p.id === initialPlayer.id);
        if (player) {
          setBetAmount(player.chips.toString());
        }
        break;
    }
  };

  const handleBetChange = (direction: 'increase' | 'decrease') => {
    if (!initialPlayer || !ws.isConnected) return;

    // Calculate minimum raise amount based on current bet
    const minRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;

    const currentValue = parseInt(betAmount) || minRaiseAmount;
    const newBet = direction === 'increase' 
      ? currentValue + minBet 
      : Math.max(currentValue - minBet, minRaiseAmount);
    
    setBetAmount(newBet.toString());
  };

  const handleBetInput = (value: string) => {
    if (!initialPlayer || !ws.isConnected) return;

    // Calculate minimum raise amount based on current bet
    const minRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;

    const newBet = parseInt(value);
    if (!isNaN(newBet) && newBet >= minRaiseAmount) {
      setBetAmount(newBet.toString());
    }
  };

  // Get active players count
  const activePlayersCount = playersState.filter(p => p.isActive).length;

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
    const player = playersState.find(p => p.position === position);
    const isBottomHalf = [4, 5, 6, 7].includes(position);
    const isFolded = player && !player.isActive;
    const isShowdown = gameState?.status === 'finished' && gameState?.phase === 'showdown';
    
    // Check if all active players are all-in
    const activePlayers = playersState.filter(p => !p.folded);
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    const allPlayersAllIn = activePlayers.length >= 2 && playersWithChips.length === 0;
    
    // Show cards if it's showdown or all players are all-in
    const shouldShowCards = isShowdown || allPlayersAllIn;
    
    // Determine if this player is the winner during showdown
    const isWinner = isShowdown && player?.isActive && (() => {
      const { winnerId } = determineWinner(playersState, communityCards);
      return player.id === winnerId;
    })();
    
    return (
      <div className="relative">
        {/* Seat circle */}
        <div className={`relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex flex-col items-center justify-center overflow-visible border-2 ${
          isWinner 
            ? 'border-yellow-400 shadow-lg shadow-yellow-400/50' 
            : player?.isCurrent 
              ? 'border-yellow-500 active-player shadow-lg shadow-yellow-500/50' 
            : 'border-gray-600'
        } ${
          !player ? 'bg-gray-800 opacity-60 font-bold' : 'bg-gray-800'
        }`}>
          {player ? (
            <>
              <Image
                src={player.avatarUrl || AVATAR_URLS[position - 1]} 
                alt={player.name}
                width={80}
                height={80}
                sizes="(max-width: 768px) 48px, (max-width: 1024px) 64px, 80px"
                className={`w-full h-full object-cover ${isFolded ? 'opacity-50 grayscale' : ''}`}
              />
              {/* Player info */}
              <div className={`absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-900/90 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 whitespace-nowrap z-10 flex items-center gap-1 sm:gap-1.5 md:gap-2 border-2 rounded ${
                isWinner 
                  ? 'border-yellow-400 bg-yellow-900/90' 
                  : player?.isCurrent
                    ? 'border-yellow-500 active-player'
                    : 'border-gray-600'
              } ${isFolded ? 'opacity-50' : ''}`}>
                {!isShowdown || isFolded ? (
                  // Normal display during gameplay or for folded players
                  <>
                    {player.isDealer && (
                      <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 bg-white rounded-full text-black text-[8px] sm:text-[9px] md:text-[10px] flex items-center justify-center font-bold">
                        D
                      </div>
                    )}
                    <span className="text-white text-[10px] sm:text-[11px] md:text-xs font-bold truncate max-w-[4rem] sm:max-w-[6rem] md:max-w-[8rem]">{player.name}</span>
                    <span className="text-gray-400 text-[10px] sm:text-[11px] md:text-xs">|</span>
                    <span className="text-yellow-400 text-[10px] sm:text-[11px] md:text-xs font-bold">{player.chips}</span>
                  </>
                ) : player.isActive ? (
                  // Show only hand evaluation for active players during showdown
                  <span className="text-green-400 text-[10px] sm:text-[11px] md:text-xs font-bold">
                    {evaluateHand(player.cards || [], communityCards).description}
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <span className="text-white text-[8px] sm:text-[10px] md:text-xs">EMPTY</span>
          )}
        </div>
      </div>
    );
  };

  // Modify the winner announcement effect
  useEffect(() => {
    if (gameState?.status === 'finished' && gameState?.phase === 'showdown') {
      const { winnerId, winningHand } = determineWinner(playersState, communityCards);
      const winner = playersState.find(p => p.id === winnerId);
      
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
  }, [gameState?.status, gameState?.phase, playersState, communityCards, pot, handleStartGame]);

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

  // Add formatTime function
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Add timer effect
  useEffect(() => {
    if (gameState?.status !== 'playing') return;

    const timer = setInterval(() => {
      setNextLevelIn(prev => {
        if (prev <= 0) {
          return 600; // Reset to 10 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState?.status]);

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
        {/* Main Game Area - 70% */}
        <div className="flex-[0.7] flex flex-col gap-3 overflow-visible">
          <div className="h-[70%] relative overflow-visible">
            <div className="absolute inset-x-24 inset-y-12 rounded-3xl bg-[#1a6791] [background:radial-gradient(circle,#1a6791_0%,#14506e_70%,#0d3b51_100%)] border-2 border-[#d88a2b]">
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
                  {pot > 0 && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <PotDisplay mainPot={pot} amount={pot} />
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

          {/* Control Panel - Now inline in mobile landscape */}
          <div className="h-[30%] bg-gray-900 rounded-lg p-2 flex items-center gap-2">
            {/* Large Card Display */}
            <div className="h-full flex-none w-[15%] min-w-[80px] bg-black/30 p-1 rounded-lg flex flex-col justify-center">
                {initialPlayer?.id && originalCards.has(initialPlayer.id) ? (
                <div className="flex flex-col gap-1">
                    {(originalCards.get(initialPlayer.id) || []).map((card, i) => (
                    <div key={i} className="w-full aspect-[2/3] relative">
                        <Image
                        src={`/cards/${card.rank}${card.suit}.png`}
                          alt={`${card.rank} of ${card.suit}`}
                          width={60}
                          height={90}
                          className={`w-full h-full object-contain rounded-[4px] shadow-lg ${
                            !playersState.find(p => p.id === initialPlayer?.id)?.isActive 
                              ? 'opacity-50 grayscale' 
                              : ''
                          }`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-[8px] sm:text-sm">Your cards will appear here</div>
              )}
            </div>

            {/* Hand Evaluator */}
            <div className="h-full flex-none w-[15%] min-w-[80px] bg-black/50 p-1 rounded-lg flex flex-col">
              <div className="text-white text-[8px] sm:text-sm font-bold">Best Hand</div>
                {initialPlayer?.id && originalCards.has(initialPlayer.id) ? (
                  <div className="text-yellow-400 text-[10px] sm:text-lg font-bold mt-0.5">
                    {evaluateHand(
                      originalCards.get(initialPlayer.id) || [],
                      communityCards
                    ).description}
                  </div>
                ) : (
              <div className="text-yellow-400 text-[10px] sm:text-lg font-bold mt-0.5">
                    Waiting for cards...
              </div>
                )}
            </div>

            {/* Blinds Display */}
            <div className="h-full flex-none w-[15%] min-w-[80px] bg-black/50 p-1 rounded-lg flex flex-col">
              <div className="text-white text-[8px] sm:text-sm font-bold">Blinds</div>
              <div className="flex items-center gap-0.5 mt-0.5">
                <div>
                  <span className="text-gray-400 text-[6px] sm:text-xs">CURRENT</span>
                  <div className="text-yellow-400 text-[10px] sm:text-lg font-bold">{smallBlind}/{bigBlind}</div>
                </div>
                {gameState?.status !== 'waiting' && (
                  <div>
                    <span className="text-gray-400 text-[6px] sm:text-xs">NEXT</span>
                    <div className="text-yellow-400 text-[10px] sm:text-lg font-bold">{smallBlind * 2}/{bigBlind * 2}</div>
                  </div>
                )}
              </div>
              {gameState?.status !== 'waiting' && (
                <div className="mt-0.5 flex items-center gap-0.5">
                  <div className="text-gray-400 text-[6px] sm:text-xs">
                    next<br />level
                  </div>
                  <div className="text-[10px] sm:text-2xl font-bold text-yellow-400 tabular-nums">
                    {formatTime(nextLevelIn)}
                  </div>
                </div>
              )}
            </div>

            {/* Action Panel */}
            <div className="flex-1 h-full flex flex-col justify-between gap-1">
              {/* Main Action Buttons */}
              <div className="flex items-center gap-1 h-1/2">
                <button
                  onClick={() => handleAction('fold')}
                  className="flex-1 bg-red-600 text-white h-full py-0.5 rounded text-[8px] sm:text-base font-bold hover:bg-red-700 transition-colors border border-white"
                >
                  FOLD
                </button>
                  {(() => {
                    const playerState = playersState.find(p => p.id === initialPlayer?.id);
                    const canCheck = playerState && (
                      (playerState.currentBet === currentBet) ||
                      (currentBet === 0 && !playerState.hasActed)
                    );

                    return (
                <button
                        onClick={() => handleAction(canCheck ? 'check' : 'call')}
                  className="flex-1 bg-blue-600 text-white h-full py-0.5 rounded text-[8px] sm:text-base font-bold hover:bg-blue-700 transition-colors border border-white"
                >
                        {canCheck ? 'CHECK' : 'CALL'}
                </button>
                    );
                  })()}
                  {(() => {
                    const playerState = playersState.find(p => p.id === initialPlayer?.id);
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
                        } flex-1 text-white h-full py-0.5 rounded text-[8px] sm:text-base font-bold transition-colors flex items-center justify-center gap-0.5 border border-white`}
                      >
                        <span>{currentBet === 0 ? 'BET' : 'RAISE'}</span>
                  <span>{betAmount || currentBet * 2}</span>
                </button>
                    );
                  })()}
              </div>

              {/* Bet Controls */}
              <div className="flex items-center gap-1 h-1/2">
                  <div className={`flex gap-0.5 flex-1 ${
                    (() => {
                      const playerState = playersState.find(p => p.id === initialPlayer?.id);
                      const minRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;
                      return playerState && playerState.chips <= minRaiseAmount ? 'opacity-50 pointer-events-none' : '';
                    })()
                  }`}>
                  <button
                    onClick={() => handleBetSize('half')}
                    className="flex-1 bg-gray-700 text-white h-full py-0.5 rounded text-[6px] sm:text-[11px] font-bold hover:bg-gray-600 transition-colors border border-green-500"
                  >
                    1/2
                  </button>
                  <button
                    onClick={() => handleBetSize('twoThirds')}
                    className="flex-1 bg-gray-700 text-white h-full py-0.5 rounded text-[6px] sm:text-[11px] font-bold hover:bg-gray-600 transition-colors border border-green-500"
                  >
                    2/3
                  </button>
                </div>
                  <div className={`flex gap-0.5 flex-1 ${
                    (() => {
                      const playerState = playersState.find(p => p.id === initialPlayer?.id);
                      const minRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;
                      return playerState && playerState.chips <= minRaiseAmount ? 'opacity-50 pointer-events-none' : '';
                    })()
                  }`}>
                  <button
                    onClick={() => handleBetSize('pot')}
                    className="flex-1 bg-gray-700 text-white h-full py-0.5 rounded text-[6px] sm:text-[11px] font-bold hover:bg-gray-600 transition-colors border border-green-500"
                  >
                    POT
                  </button>
                  <button
                    onClick={() => handleBetSize('allin')}
                    className="flex-1 bg-gray-700 text-white h-full py-0.5 rounded text-[6px] sm:text-[11px] font-bold hover:bg-gray-600 transition-colors border border-green-500"
                  >
                    ALL IN
                  </button>
                </div>
                  <div className={`flex items-center gap-0.5 flex-1 ${
                    (() => {
                      const playerState = playersState.find(p => p.id === initialPlayer?.id);
                      const minRaiseAmount = currentBet > 0 ? currentBet + minBet : minBet;
                      return playerState && playerState.chips <= minRaiseAmount ? 'opacity-50 pointer-events-none' : '';
                    })()
                  }`}>
                  <button
                    onClick={() => handleBetChange('decrease')}
                    className="w-4 h-4 sm:w-8 sm:h-8 bg-gray-700 text-white rounded-full text-[6px] sm:text-sm font-bold hover:bg-gray-600 transition-colors flex items-center justify-center border border-green-500"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => handleBetInput(e.target.value)}
                    className="flex-1 px-0.5 sm:px-3 py-0.5 sm:py-2 bg-white text-black text-[6px] sm:text-sm text-center font-bold border border-gray-300 rounded focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder={`${currentBet * 2}`}
                  />
                  <button
                    onClick={() => handleBetChange('increase')}
                    className="w-4 h-4 sm:w-8 sm:h-8 bg-gray-700 text-white rounded-full text-[6px] sm:text-sm font-bold hover:bg-gray-600 transition-colors flex items-center justify-center border border-green-500"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area - 30% */}
        <div className="flex-[0.3] flex flex-col bg-gray-900 rounded-lg">
          <div className="flex-none p-3 border-b border-gray-700 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium tracking-wide">GLOBAL</span>
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
              <span className="text-xs text-gray-400 font-medium tracking-wide">CHAT</span>
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

          <div className="flex-1 overflow-y-auto bg-gray-900/70 rounded-lg border border-gray-700">
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
                        ? 'flex items-center gap-2 bg-gray-800 text-gray-300 text-xs py-1.5 px-3 rounded-lg border border-gray-700' 
                        : 'flex flex-col gap-0.5'
                    }`}
                  >
                    {msg.playerId !== 'system' && (
                      <span className="text-[10px] text-gray-300 px-2 font-medium">
                        {playersState.find(p => p.id === msg.playerId)?.name || msg.playerId}
                      </span>
                    )}
                    {msg.playerId === 'system' ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-none"></div>
                        <span className="font-medium">{msg.message}</span>
                      </>
                    ) : (
                      <>
                        <div className={`flex items-start gap-2 ${
                          msg.playerId === initialPlayer?.id ? 'flex-row-reverse' : ''
                        }`}>
                          <div className="flex flex-col gap-1 max-w-[80%]">
                            <span className="text-[10px] text-gray-300 font-medium px-1">
                              {playersState.find(p => p.id === msg.playerId)?.name || msg.playerId}
                            </span>
                            <div className={`px-3 py-2 rounded-2xl text-sm leading-snug font-medium shadow-lg ${
                              msg.playerId === initialPlayer?.id
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-gray-800 text-white rounded-tl-none border border-gray-700'
                            }`}>
                              {msg.message}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              <div ref={chatEndRef} />
            </div>
          </div>

            <div className="flex-none h-12 border-t border-gray-700 bg-gray-900/70">
              <form onSubmit={handleSendChat} className="flex gap-2 h-full p-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-gray-800 text-white rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
                    disabled={!ws.isConnected}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    😊
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 right-0 z-50">
                      <EmojiPicker
                        onEmojiClick={(emojiData) => {
                          setChatInput(prev => prev + emojiData.emoji);
                          setShowEmojiPicker(false);
                        }}
                        width={300}
                        height={400}
                        theme={Theme.DARK}
                        skinTonesDisabled
                        searchDisabled
                        lazyLoadEmojis
                        previewConfig={{
                          showPreview: false
                        }}
                      />
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!ws.isConnected || !chatInput.trim()}
                  className="bg-blue-600 text-white px-4 rounded-full text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-lg"
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

function findNextAvailablePosition(usedPositions: number[]): TablePosition {
  const usedSet = new Set(usedPositions);
  for (let pos = 2; pos <= 8; pos++) {
    if (!usedSet.has(pos)) {
      return pos as TablePosition;
    }
  }
  return 2 as TablePosition; // Fallback to position 2 if all are taken
}

function findNextAvailableAvatar(players: Player[]): string {
  const availableAvatars = AVATAR_URLS.filter(url => 
    !players.some(p => p.avatarUrl === url)
  );
  return availableAvatars.length > 0 
    ? availableAvatars[Math.floor(Math.random() * availableAvatars.length)]
    : AVATAR_URLS[Math.floor(Math.random() * AVATAR_URLS.length)];
} 