'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PokerTable from '@/components/poker/PokerTable';
import { Player } from '@/types/poker';

export default function GamePage() {
  const params = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Map session user to Player type
  const currentPlayer: Player | undefined = session?.user ? {
    id: session.user.email || '',
    name: session.user.name || '',
    chips: 1000,
    isActive: true,
    isCurrent: false,
    isDealer: false,
    currentBet: 0,
    position: 1,
    cards: [],
    avatarUrl: session.user.image || undefined,
    folded: false,
    totalBetThisRound: 0,
    hasActed: false
  } : undefined;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-900">
      {/* Main game area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Game table container */}
        <div className="flex-1 min-h-0 relative p-1">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 flex items-center justify-center">
                <div style={{ 
                  width: 'min(calc(70vw - 30vw - 2rem), calc(100vh - 64px) * 1.33)',
                  height: 'min(calc(100vh - 64px), calc(70vw - 30vw - 2rem) * 0.75)',
                }}>
                  <PokerTable 
                    tableId={params.id as string}
                    currentPlayer={currentPlayer}
                    onConnectionChange={(isConnected) => {
                      setIsLoading(!isConnected);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action panel */}
        <div className="h-16 bg-gray-800 border-t border-gray-700">
          {/* Action buttons and controls */}
        </div>
      </div>

      {/* Chat window */}
      <div className={`fixed md:relative inset-y-0 right-0 w-[30vw] min-w-[250px] border-l border-gray-700 flex flex-col flex-shrink-0 bg-gray-900 transition-transform duration-300 z-40 ${
        isChatOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      }`}>
        <div className="flex-1 overflow-hidden">
          {/* Chat messages */}
        </div>
        <div className="h-16 border-t border-gray-700">
          {/* Chat input */}
        </div>
      </div>

      {/* Chat toggle button for mobile */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-20 right-4 md:hidden z-50 bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Overlay when chat is open on mobile */}
      {isChatOpen && (
        <div 
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}