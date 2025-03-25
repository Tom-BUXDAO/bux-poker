'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, PlayerAction } from '@/types/poker';
import { pokerWebSocket } from '@/lib/poker/client-websocket';

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

interface Player {
  id: string;
  name: string;
  chips: number;
  position: number;
  cards?: Card[];
  isActive: boolean;
  isCurrent: boolean;
  avatarUrl?: string;
}

interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: Date;
}

interface PokerTableProps {
  tableId: string;
  currentPlayer?: Player;
}

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

  // Auto scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentPlayer?.id) {
      // Clean up any existing connections
      pokerWebSocket.disconnect();
      announcedPlayers.current.clear();

      // Set up event listeners
      pokerWebSocket.on('connected', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      });

      pokerWebSocket.on('disconnected', () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      });

      pokerWebSocket.on('gameState', (state: any) => {
        console.log('EXACT SERVER DATA:', {
          players: state.players,
          currentPlayer
        });
        
        const updatedPlayers = state.players.map((p: Player) => {
          console.log('Processing player data:', JSON.stringify(p, null, 2));
          
          // Announce any new players with correct name
          if (!announcedPlayers.current.has(p.id)) {
            announcedPlayers.current.add(p.id);
            const playerName = p.name || p.id;
            addChatMessage({
              playerId: 'system',
              message: `${playerName} joined the table`,
              timestamp: new Date()
            });
          }

          return {
            ...p,
            name: p.name || p.id
          };
        });

        console.log('Final player data:', JSON.stringify(updatedPlayers, null, 2));
        setPlayers(updatedPlayers);
        setCommunityCards(state.communityCards || []);
        setPot(state.pot || 0);
        setCurrentBet(state.currentBet || 0);
      });

      pokerWebSocket.on('playerJoined', (data: any) => {
        console.log('Player joined:', data);
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
        pokerWebSocket.disconnect();
      };
    }
  }, [tableId, currentPlayer?.id]);

  const addChatMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentPlayer || !isConnected) return;

    const message: ChatMessage = {
      playerId: currentPlayer.id,
      message: chatInput.trim(),
      timestamp: new Date()
    };

    pokerWebSocket.sendMessage({
      type: 'chat',
      payload: message
    });

    setChatInput('');
  };

  const handleAction = (action: 'fold' | 'check' | 'call' | 'raise') => {
    if (!currentPlayer || !isConnected) return;

    pokerWebSocket.sendAction({
      type: action,
      amount: action === 'raise' ? parseInt(betAmount) : undefined,
      playerId: currentPlayer.id,
      timestamp: new Date(),
    });
  };

  // Render a single seat
  const SeatComponent = ({ position }: { position: number }) => {
    const player = players.find(p => p.position === position);
    
    return (
      <div className="relative">
        {/* Player info container - only shown when seat is occupied */}
        {player && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-900/90 px-4 py-2 whitespace-nowrap z-10 flex items-center border-2 border-gray-600 rounded">
            <span className="text-white text-xs font-bold">{player.name}</span>
            <span className="text-gray-400 text-xs mx-1">|</span>
            <span className="text-yellow-400 text-xs font-bold">{player.chips}</span>
          </div>
        )}
        
        {/* Seat circle */}
        <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center overflow-hidden border-2 border-gray-600 ${
          !player ? 'bg-gray-800 opacity-60 font-bold' : 'bg-gray-800'
        }`}>
          {player ? (
            <img 
              src={AVATAR_URLS[position - 1]} 
              alt={player.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-xs">EMPTY</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex">
      {/* Main content + Chat */}
      <div className="flex-1 flex gap-4 p-4">
        {/* Main content (table + actions) */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Poker Table - 70% height */}
          <div className="h-[70%] relative">
            {/* The actual table surface - smaller with padding for seats */}
            <div className="absolute inset-12 rounded-3xl bg-[#1a6791] [background:radial-gradient(circle,#1a6791_0%,#14506e_70%,#0d3b51_100%)] border-2 border-[#d88a2b]">
              {/* Table content (pot, etc) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  Pot: ${pot}
                </div>
              </div>

              {/* Connection Status */}
              <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              } text-white z-10`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>

            {/* Fixed seat positions - now using SeatComponent */}
            {/* Top seats */}
            <div className="absolute top-0 left-1/4 transform -translate-x-1/2">
              <SeatComponent position={1} />
            </div>
            <div className="absolute top-0 right-1/4 transform translate-x-1/2">
              <SeatComponent position={2} />
            </div>

            {/* Right seats */}
            <div className="absolute top-1/4 right-0 transform -translate-y-1/2">
              <SeatComponent position={3} />
            </div>
            <div className="absolute bottom-1/4 right-0 transform translate-y-1/2">
              <SeatComponent position={4} />
            </div>

            {/* Bottom seats */}
            <div className="absolute bottom-0 right-1/4 transform translate-x-1/2">
              <SeatComponent position={5} />
            </div>
            <div className="absolute bottom-0 left-1/4 transform -translate-x-1/2">
              <SeatComponent position={6} />
            </div>

            {/* Left seats */}
            <div className="absolute bottom-1/4 left-0 transform translate-y-1/2">
              <SeatComponent position={7} />
            </div>
            <div className="absolute top-1/4 left-0 transform -translate-y-1/2">
              <SeatComponent position={8} />
            </div>
          </div>

          {/* Controls Container - remaining height */}
          <div className="h-[30%] bg-gray-900 rounded-lg p-4 flex items-center justify-center">
            {/* Action Panel */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleAction('fold')}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
              >
                Fold
              </button>
              <button
                onClick={() => handleAction('check')}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Check
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-20 px-3 py-2 rounded text-sm bg-gray-700 text-white"
                  placeholder="Bet"
                />
                <button
                  onClick={() => handleAction('raise')}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                >
                  Raise
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Window */}
        <div className="w-64 bg-gray-800 flex flex-col rounded-lg">
          <div className="p-2 border-b border-gray-700">
            <h2 className="text-white font-bold text-xs">Table Chat</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chatMessages.map((msg, i) => (
              <div 
                key={i} 
                className={`${
                  msg.playerId === 'system' 
                    ? 'text-gray-400 italic text-xs' 
                    : msg.playerId === currentPlayer?.id
                      ? 'text-blue-400 text-xs'
                      : 'text-white text-xs'
                }`}
              >
                {msg.playerId !== 'system' && (
                  <span className="font-bold">
                    {players.find(p => p.id === msg.playerId)?.name || msg.playerId}:
                  </span>
                )}{' '}
                {msg.message}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="h-12 p-2 border-t border-gray-700">
            <form onSubmit={handleSendChat} className="flex gap-1 h-full">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-gray-900 text-white rounded px-2 py-1 text-xs"
                disabled={!isConnected}
              />
              <button
                type="submit"
                disabled={!isConnected || !chatInput.trim()}
                className="bg-blue-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
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

function findNextAvailablePosition(players: Player[]): number {
  const takenPositions = players.map(p => p.position);
  let position = 2;
  while (takenPositions.includes(position) && position <= 8) {
    position++;
  }
  return position <= 8 ? position : 2;
}

function findNextAvailableAvatar(players: Player[]): string {
  const availableAvatars = AVATAR_URLS.filter(url => 
    !players.some(p => p.avatarUrl === url)
  );
  return availableAvatars.length > 0 
    ? availableAvatars[Math.floor(Math.random() * availableAvatars.length)]
    : AVATAR_URLS[Math.floor(Math.random() * AVATAR_URLS.length)];
} 