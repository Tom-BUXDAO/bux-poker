'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/lib/poker/WebSocketContext';
import { Card } from '@/types/poker';
import PlayerAvatar from '@/components/poker/PlayerAvatar';
import ChatPanel from '@/components/poker/ChatPanel';
import ActionPanel from '@/components/poker/ActionPanel';
import ChipStack from '@/components/poker/ChipStack';
import PotDisplay from '@/components/poker/PotDisplay';
import '../text-sizes.css';

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

// Add this type for seat positions
interface Seat {
  position: string;
  player?: any;
}

// Add this CSS for card and player animations
const tableStyles = `
  @keyframes dealCard {
    from {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 0;
    }
    to {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
  }

  @keyframes pulse-border {
    0% { border-color: rgba(234, 179, 8, 0.8); }
    50% { border-color: rgba(234, 179, 8, 0.4); }
    100% { border-color: rgba(234, 179, 8, 0.8); }
  }

  .active-player {
    border-width: 3px;
    animation: pulse-border 0.8s ease-in-out infinite;
  }

  .dealt-card {
    animation: dealCard 0.3s ease-out forwards;
  }
`;

export default function TableUpdatePage() {
  const ws = useWebSocket();
  const [players, setPlayers] = useState<any[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const minBet = 20;

  // Initialize WebSocket connection
  useEffect(() => {
    const tableId = 'dev-tournament';
    const playerId = 'tom_buxdao';
    
    // Only connect if not already connected
    if (!ws.isConnected) {
      console.log('Connecting to WebSocket:', { tableId, playerId });
      ws.connect(tableId, playerId, {
        name: 'tom',
        chips: 1000
      });
    }

    // Set up event handlers
    const handleGameState = (data: any) => {
      console.log('Received game state:', data);
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
      } else if (data.type === 'chat') {
        setChatMessages(prev => [...prev, {
          playerId: data.payload.playerId,
          message: data.payload.message,
          timestamp: new Date(data.payload.timestamp)
        }]);
      }
    };

    // Subscribe to events
    ws.on('message', handleGameState);

    // Cleanup function
    return () => {
      if (ws.isConnected) {
        console.log('Cleaning up WebSocket connection');
        ws.off('message', handleGameState);
      }
    };
  }, [ws.isConnected]);

  const handleAction = (action: string, amount?: number) => {
    ws.sendMessage({
      type: 'action',
      payload: {
        action,
        amount
      }
    });
  };

  const handleSendMessage = (message: string) => {
    ws.sendMessage({
      type: 'chat',
      payload: {
        message
      }
    });
  };

  // Create array of 8 seats with positions
  const seats: Seat[] = Array(8).fill(null).map((_, index) => ({
    position: getPlayerPosition(index),
    player: players.find((p, pIndex) => pIndex === index)
  }));

  return (
    <div className="min-h-screen h-screen flex flex-col overflow-hidden">
      <style jsx global>{tableStyles}</style>
      
      {/* Header */}
      <div className="h-10 min-h-[2.5rem] bg-gray-900 border-b border-gray-800 flex items-center px-3">
        <h1 className="text-white font-bold text-base">BUX Poker</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Game Area - 70% */}
        <div className="w-[70%] flex flex-col min-h-0">
          {/* Game Table - Fills available space */}
          <div className="flex-1 bg-gray-800 relative min-h-0">
            <div className="absolute inset-[10%] rounded-3xl bg-[#1a6791] [background:radial-gradient(circle,#1a6791_0%,#14506e_70%,#0d3b51_100%)] border-2 border-[#d88a2b]">
              {/* Seats */}
              {seats.map((seat, index) => (
                <div key={index} className={`absolute ${seat.position}`}>
                  {seat.player ? (
                    <>
                      {/* Player Info Container */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1.5 rounded-sm border border-gray-700 whitespace-nowrap">
                        <span className="text-white text-scale-base text-scale-bold tracking-wide">{seat.player.name}</span>
                        <span className="text-yellow-400 text-scale-base text-scale-bold ml-3 tracking-wide">{seat.player.chips.toLocaleString()}</span>
                      </div>
                      {/* Player Avatar */}
                      <div className={`w-[4.5vw] h-[4.5vw] rounded-full overflow-hidden border-2 bg-gray-800/90 
                        ${seat.player.isCurrent ? 'border-yellow-500 active-player' : 'border-gray-700'}`}>
                        <img
                          src={AVATAR_URLS[index % AVATAR_URLS.length]}
                          alt={seat.player.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Player's Current Bet */}
                      {seat.player.currentBet > 0 && (
                        <ChipStack
                          amount={seat.player.currentBet}
                          position={getChipPosition(index)}
                        />
                      )}
                    </>
                  ) : (
                    // Empty Seat
                    <div className="w-[4.5vw] h-[4.5vw] rounded-full bg-gray-800/90 flex items-center justify-center border-2 border-gray-700">
                      <span className="text-gray-400 text-scale-base">EMPTY</span>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Community Cards */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2">
                {communityCards.map((card, index) => (
                  <div 
                    key={index} 
                    className="w-[3vw] h-[4.2vw] relative dealt-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <img
                      src={`/cards/${card.rank}${card.suit}.png`}
                      alt={`${card.rank} of ${card.suit}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
        </div>

              {/* Pot Display */}
              <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 text-white text-scale-lg text-scale-bold">
                Total Pot: {pot}
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <ActionPanel
            currentBet={currentBet}
            pot={pot}
            minBet={minBet}
            onAction={handleAction}
            playerCards={players.find(p => p.id === 'tom_buxdao')?.cards || []}
            communityCards={communityCards}
          />
        </div>

        {/* Chat Panel */}
        <ChatPanel
          messages={chatMessages}
          currentPlayerId="tom_buxdao"
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}

// Helper function to get player position classes
function getPlayerPosition(index: number): string {
  const positions = [
    '-top-[5%] left-1/4 -translate-x-1/2',
    '-top-[5%] right-1/4 translate-x-1/2',
    '-right-[5%] top-1/4 translate-y-[-50%]',
    '-right-[5%] bottom-1/4 translate-y-[50%]',
    '-bottom-[5%] right-1/4 translate-x-1/2',
    '-bottom-[5%] left-1/4 -translate-x-1/2',
    '-left-[5%] bottom-1/4 translate-y-[50%]',
    '-left-[5%] top-1/4 translate-y-[-50%]'
  ];
  return positions[index % positions.length];
}

// Helper function to get chip position classes
function getChipPosition(index: number): string {
  const positions = [
    'bottom-[-2rem] left-1/2 -translate-x-1/2',  // Top players
    'bottom-[-2rem] left-1/2 -translate-x-1/2',
    'left-[-3rem] top-1/2 -translate-y-1/2',     // Right players
    'left-[-3rem] top-1/2 -translate-y-1/2',
    'top-[-2rem] left-1/2 -translate-x-1/2',     // Bottom players
    'top-[-2rem] left-1/2 -translate-x-1/2',
    'right-[-3rem] top-1/2 -translate-y-1/2',    // Left players
    'right-[-3rem] top-1/2 -translate-y-1/2'
  ];
  return positions[index % positions.length];
} 