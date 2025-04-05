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
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import PlayerStatsModal from '@/components/PlayerStatsModal';

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
  const { data: session } = useSession();
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

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
    <main className="min-h-screen bg-gray-900 text-white grid grid-rows-[10vh_90vh] overflow-y-auto portrait:hidden">
      {/* Header - 10vh */}
      <header className="border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
        <div className="container mx-auto px-2 xs:px-3 sm:px-4 h-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
            <Image 
              src="/BUX.png" 
              alt="BUX Logo" 
              width={40} 
              height={40} 
              className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" 
              priority
            />
            <span className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
              BUX POKER HUB
            </span>
          </Link>
          {session ? (
            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
              <div className="relative w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10">
                <Image 
                  src={session.user.image || '/BUX.png'} 
                  alt={session.user.name || 'User'} 
                  fill
                  sizes="(max-width: 640px) 16px, (max-width: 768px) 20px, (max-width: 1024px) 24px, (max-width: 1280px) 32px, 40px"
                  className="rounded-full object-cover"
                  priority
                />
              </div>
              <span className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-white">
                {session.user.name}
              </span>
              <button
                onClick={() => setIsStatsModalOpen(true)}
                className="p-1 xs:p-1.5 rounded-full hover:bg-gray-800 transition-colors"
                title="View Stats"
              >
                <ChartBarIcon className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
              </button>
              <button
                onClick={() => signOut()}
                className="p-1 xs:p-1.5 rounded-full hover:bg-gray-800 transition-colors"
                title="Logout"
              >
                <svg className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn('discord')}
              className="flex items-center gap-1 xs:gap-1.5 bg-[#5865F2] hover:bg-[#4752C4] transition-colors px-2 xs:px-2.5 sm:px-3 md:px-4 py-1 xs:py-1.5 rounded text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-medium"
            >
              <svg className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Login
            </button>
          )}
        </div>
      </header>

      {/* Stats Modal */}
      {session && (
        <PlayerStatsModal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          playerId={session.user.id || ''}
        />
      )}

      {/* Table Section - 90vh */}
      <div className="h-full flex flex-col">
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
                        <style jsx>{`
                          .player-info {
                            height: min(3vh, 24px);
                            line-height: min(3vh, 24px);
                            padding: 0 4px;
                            font-size: min(1.65vh, 13.5px);
                          }
                          @media (min-width: 640px) {
                            .player-info {
                              height: min(3vh, 24px);
                              line-height: min(3vh, 24px);
                              padding: 0 8px;
                              font-size: min(1.5vh, 12px);
                            }
                          }
                          @media (min-width: 768px) {
                            .player-info {
                              height: min(4vh, 32px);
                              line-height: min(4vh, 32px);
                              padding: 0 12px;
                              font-size: min(1.8vh, 14px);
                            }
                          }
                        `}</style>
                        <div className="player-info absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-gray-700 bg-black/80">
                          <span className="text-white font-medium">{seat.player.name}</span>
                          <span className="text-yellow-400 font-medium ml-1">{seat.player.chips.toLocaleString()}</span>
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
              </div>

              {/* Pot Display */}
              <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 text-white text-scale-lg text-scale-bold">
                Total Pot: {pot}
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
    </main>
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