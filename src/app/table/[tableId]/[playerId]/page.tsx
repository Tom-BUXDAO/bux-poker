'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PokerTable from '@/components/poker/PokerTable';
import { Player } from '@/types/poker';

interface TablePageProps {
  params: Promise<{
    tableId: string;
    playerId: string;
  }>;
}

export default function TablePage({ params }: TablePageProps) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [routeParams, setRouteParams] = useState<{ tableId: string; playerId: string } | null>(null);

  // Handle async params
  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setRouteParams(resolvedParams);
    };
    loadParams();
  }, [params]);

  // Initialize player once we have route params
  useEffect(() => {
    if (!routeParams) return;

    const player: Player = {
      id: routeParams.playerId,
      name: routeParams.playerId,
      chips: 1000,
      cards: [],
      currentBet: 0,
      totalBetThisRound: 0,
      isActive: true,
      isCurrent: false,
      hasActed: false,
      folded: false
    };
    setCurrentPlayer(player);
  }, [routeParams]);

  const handleLeaveTable = () => {
    if (routeParams?.tableId === 'dev-tournament') {
      router.push('/tournament/dev-tournament');
    } else {
      router.push('/');
    }
  };

  if (!currentPlayer || !routeParams) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-800 p-4">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">
            {routeParams.tableId === 'dev-tournament' ? 'Tournament Table' : 'Poker Table'}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-600 dark:text-gray-400">
              Playing as: {currentPlayer.name}
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
          key={`${currentPlayer.id}-${currentPlayer.name}`}
          tableId={routeParams.tableId}
          currentPlayer={currentPlayer}
          onConnectionChange={setIsConnected}
        />
      </div>
    </div>
  );
} 