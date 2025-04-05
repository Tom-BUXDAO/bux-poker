'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface TournamentPlayer {
  id: string;
  name: string;
  avatar?: string;
  chips: number;
  position: number;
}

interface BlindLevel {
  small: number;
  big: number;
  duration: number;
}

const BLIND_LEVELS: BlindLevel[] = [
  { small: 10, big: 20, duration: 600 },
  { small: 20, big: 40, duration: 600 },
  { small: 50, big: 100, duration: 600 },
  { small: 100, big: 200, duration: 600 },
  { small: 200, big: 400, duration: 600 },
  { small: 300, big: 600, duration: 600 },
  { small: 400, big: 800, duration: 600 },
  { small: 500, big: 1000, duration: 600 },
  { small: 600, big: 1200, duration: 600 },
  { small: 750, big: 1500, duration: 600 },
  { small: 1000, big: 2000, duration: 600 },
  { small: 1500, big: 3000, duration: 600 },
  { small: 2000, big: 4000, duration: 600 },
  { small: 2500, big: 5000, duration: 600 },
  { small: 3000, big: 6000, duration: 600 },
  { small: 4000, big: 8000, duration: 600 },
];

const TEST_PLAYERS: TournamentPlayer[] = Array.from({ length: 8 }, (_, i) => ({
  id: `player${i + 1}`,
  name: `Player ${i + 1}`,
  chips: 1000,
  position: i + 1
}));

export default function LobbyPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [players, setPlayers] = useState<TournamentPlayer[]>(TEST_PLAYERS);
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  const joinAsPlayer = (playerId: string) => {
    router.push(`/table?tournamentId=test-tournament&playerId=${playerId}`);
  };

  const startGame = () => {
    setIsCreatingGame(true);
    router.push(`/table?tournamentId=test-tournament`);
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
        <div className="container mx-auto px-4 h-[10vh] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image 
              src="/BUX.png" 
              alt="BUX Logo" 
              width={40} 
              height={40} 
              className="w-8 h-8 md:w-10 md:h-10" 
              priority
            />
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
              Tournament Lobby
            </span>
          </div>
          {session?.user && (
            <div className="flex items-center gap-2">
              <Image 
                src={session.user.image || '/BUX.png'}
                alt={session.user.name || 'User'}
                width={40}
                height={40}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full"
              />
              <span className="text-lg md:text-xl font-medium">{session.user.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex h-[90vh]">
        {/* Left Side - Tournament Details */}
        <div className="w-2/3 p-6 overflow-y-auto">
          {/* Tournament Info */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Tournament Details</h2>
            <div className="grid grid-cols-2 gap-4 text-lg mb-6">
              <div>
                <span className="text-gray-400">Buy-in:</span>
                <span className="ml-2">1000 chips</span>
              </div>
              <div>
                <span className="text-gray-400">Players:</span>
                <span className="ml-2">{players.length}/8</span>
              </div>
              <div>
                <span className="text-gray-400">Starting Level:</span>
                <span className="ml-2">10/20</span>
              </div>
              <div>
                <span className="text-gray-400">Level Time:</span>
                <span className="ml-2">10 minutes</span>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startGame}
              disabled={isCreatingGame}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xl font-bold px-8 py-4 rounded-lg transition-colors mb-6"
            >
              {isCreatingGame ? 'Creating Tournament...' : 'Start Tournament'}
            </button>
          </div>

          {/* Blind Schedule */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Blind Schedule</h2>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="font-bold text-gray-400">Level</div>
              <div className="font-bold text-gray-400">Small Blind</div>
              <div className="font-bold text-gray-400">Big Blind</div>
              <div className="font-bold text-gray-400">Duration</div>
              {BLIND_LEVELS.map((level, index) => (
                <>
                  <div key={`level-${index}`} className="py-2">{index + 1}</div>
                  <div key={`small-${index}`} className="py-2">{level.small}</div>
                  <div key={`big-${index}`} className="py-2">{level.big}</div>
                  <div key={`duration-${index}`} className="py-2">10 min</div>
                </>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Player List */}
        <div className="w-1/3 border-l border-gray-800 p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">Players</h2>
          <div className="space-y-4">
            {[...players]
              .sort((a, b) => b.chips - a.chips)
              .map((player) => (
                <div 
                  key={player.id}
                  className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-lg font-bold">
                      {player.name[0]}
                    </div>
                    <div>
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-gray-400">{player.chips} chips</div>
                    </div>
                  </div>
                  <button
                    onClick={() => joinAsPlayer(player.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                  >
                    Join
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
} 