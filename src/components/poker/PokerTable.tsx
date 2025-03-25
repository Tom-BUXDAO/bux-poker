'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, PlayerAction } from '@/types/poker';
import { pokerWebSocket } from '@/lib/poker/websocket';

interface Player {
  id: string;
  name: string;
  chips: number;
  position: number;
  cards?: Card[];
  isActive: boolean;
  isCurrent: boolean;
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

  // Auto scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentPlayer?.id) {
      // Clean up any existing connections first
      pokerWebSocket.disconnect();

      // Handle Fast Refresh
      const handleBeforeUnload = () => {
        pokerWebSocket.cleanup();
      };

      // Handle Fast Refresh in development
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          pokerWebSocket.handleFastRefresh();
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      if (process.env.NODE_ENV === 'development') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }

      // Set up event listeners before connecting
      const eventListeners = {
        connected: () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        },
        disconnected: () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
        },
        gameState: (state: any) => {
          console.log('Received game state:', state);
          setGameState(state);
          setPlayers(state.players);
          setCommunityCards(state.communityCards);
          setPot(state.pot);
          setCurrentBet(state.currentBet);
        },
        playerJoined: (data: { id: string }) => {
          console.log(`${data.id} joined the table`);
          // Add system message for player joining
          addChatMessage({
            playerId: 'system',
            message: `${data.id} joined the table`,
            timestamp: new Date()
          });
        },
        playerLeft: (playerId: string) => {
          console.log(`Player ${playerId} left the table`);
          // Add system message for player leaving
          addChatMessage({
            playerId: 'system',
            message: `${playerId} left the table`,
            timestamp: new Date()
          });
        },
        chat: (data: ChatMessage) => {
          addChatMessage(data);
        }
      };

      // Register all event listeners
      Object.entries(eventListeners).forEach(([event, handler]) => {
        pokerWebSocket.on(event, handler);
      });

      // Connect to WebSocket after setting up listeners
      pokerWebSocket.connect(tableId, currentPlayer.id);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (process.env.NODE_ENV === 'development') {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
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

  return (
    <div className="h-full flex">
      {/* Main content + Chat */}
      <div className="flex-1 flex gap-4 p-4">
        {/* Main content (table + actions) */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Poker Table - 70% height */}
          <div className="h-[70%] bg-green-800 rounded-3xl relative">
            {/* Connection Status */}
            <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            } text-white z-10`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>

            {/* Poker table layout */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Community cards */}
              <div className="flex gap-2 mb-4">
                {communityCards.map((card, i) => (
                  <div
                    key={i}
                    className="w-12 h-16 bg-white rounded-lg shadow-lg flex items-center justify-center text-xs"
                  >
                    {`${card.rank}${card.suit}`}
                  </div>
                ))}
              </div>

              {/* Pot */}
              <div className="absolute top-1/2 transform -translate-y-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
                Pot: ${pot}
              </div>
            </div>

            {/* Player positions */}
            <div className="relative h-full">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`absolute transform ${getPlayerPosition(player.position)} ${
                    player.isCurrent ? 'ring-2 ring-yellow-400' : ''
                  }`}
                >
                  <div className="bg-gray-800 text-white p-2 rounded-lg shadow-lg">
                    <div className="font-bold text-xs">{player.name || player.id}</div>
                    <div className="text-xs">${player.chips}</div>
                    {player.cards && (
                      <div className="flex gap-1 mt-1">
                        {player.cards.map((card, i) => (
                          <div
                            key={i}
                            className="w-5 h-7 bg-white text-black rounded flex items-center justify-center text-xs"
                          >
                            {`${card.rank}${card.suit}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
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