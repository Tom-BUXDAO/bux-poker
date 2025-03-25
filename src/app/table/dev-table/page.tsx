'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PokerTable from '@/components/poker/PokerTable';

interface Player {
  id: string;
  name: string;
  chips: number;
  position: number;
  isActive: boolean;
  isCurrent: boolean;
}

export default function DevTablePage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    // Check for player info in localStorage
    const storedPlayer = localStorage.getItem('devPlayer');
    if (!storedPlayer) {
      router.push('/dev');
      return;
    }

    try {
      const playerData = JSON.parse(storedPlayer);
      // Add required properties for the poker table
      setPlayer({
        ...playerData,
        position: 1, // Default position
        isActive: true,
        isCurrent: true,
      });
    } catch (error) {
      console.error('Failed to parse player data:', error);
      router.push('/dev');
    }
  }, [router]);

  const handleLeaveTable = () => {
    localStorage.removeItem('devPlayer');
    router.push('/dev');
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
        <div>
          <h1 className="text-2xl font-bold">Development Table</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Playing as: {player.name}
          </p>
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
        />
      </div>
    </div>
  );
} 