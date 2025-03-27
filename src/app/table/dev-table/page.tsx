'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PokerTable from '@/components/poker/PokerTable';
import { Player, TablePosition } from '@/types/poker';

export default function DevTablePage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check for player info in localStorage
    const storedPlayer = localStorage.getItem('pokerPlayer');
    console.log('Stored player data:', storedPlayer);
    
    if (!storedPlayer) {
      console.log('No player data found, redirecting to /dev');
      router.replace('/dev');
      return;
    }

    try {
      const playerData = JSON.parse(storedPlayer);
      console.log('Parsed player data:', playerData);
      // Add required properties for the poker table
      setPlayer({
        ...playerData,
        position: 1 as TablePosition,
        isActive: true,
        isCurrent: true,
        currentBet: 0,
        totalBetThisRound: 0,
        hasActed: false
      });
    } catch (error) {
      console.error('Failed to parse player data:', error);
      router.replace('/dev');
    }
  }, [router]);

  const handleLeaveTable = () => {
    localStorage.removeItem('pokerPlayer');
    router.replace('/dev');
  };

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Development Table</h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-600 dark:text-gray-400">
              Playing as: {player.name}
            </p>
            <div className={`px-2 py-0.5 rounded-full text-xs ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            } text-white`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLeaveTable}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Leave Table
        </button>
      </div>

      {/* Poker Table */}
      <div className="flex-1">
        <PokerTable
          tableId="dev-table"
          currentPlayer={player}
          onConnectionChange={setIsConnected}
        />
      </div>
    </div>
  );
} 