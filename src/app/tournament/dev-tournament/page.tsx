'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, addMinutes } from 'date-fns';
import { signIn } from 'next-auth/react';

// Constants
const GAME_TABLE_ID = 'dev-tournament';

interface Player {
  id: string;
  name: string;
  chips: number;
  avatar: string;
}

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

const INITIAL_PLAYERS: Player[] = [
  { id: '1', name: 'laura', chips: 1000, avatar: AVATAR_URLS[0] },
  { id: 'tom_buxdao', name: 'tom', chips: 1000, avatar: AVATAR_URLS[1] },
  { id: '3', name: 'alice', chips: 1000, avatar: AVATAR_URLS[2] },
  { id: '4', name: 'bob', chips: 1000, avatar: AVATAR_URLS[3] },
  { id: '5', name: 'charlie', chips: 1000, avatar: AVATAR_URLS[4] },
  { id: '6', name: 'dave', chips: 1000, avatar: AVATAR_URLS[5] },
  { id: '7', name: 'eve', chips: 1000, avatar: AVATAR_URLS[6] },
  { id: '8', name: 'frank', chips: 1000, avatar: AVATAR_URLS[7] }
];

const BLIND_LEVELS = [
  { level: 1, smallBlind: 10, bigBlind: 20, duration: 10 },
  { level: 2, smallBlind: 20, bigBlind: 40, duration: 10 },
  { level: 3, smallBlind: 50, bigBlind: 100, duration: 10 },
  { level: 4, smallBlind: 100, bigBlind: 200, duration: 10 },
  { level: 5, smallBlind: 200, bigBlind: 400, duration: 10 },
  { level: 6, smallBlind: 300, bigBlind: 600, duration: 10 },
  { level: 7, smallBlind: 400, bigBlind: 800, duration: 10 },
  { level: 8, smallBlind: 500, bigBlind: 1000, duration: 10 },
  { level: 9, smallBlind: 600, bigBlind: 1200, duration: 10 },
  { level: 10, smallBlind: 750, bigBlind: 1500, duration: 10 },
  { level: 11, smallBlind: 1000, bigBlind: 2000, duration: 10 },
  { level: 12, smallBlind: 1500, bigBlind: 3000, duration: 10 },
  { level: 13, smallBlind: 2000, bigBlind: 4000, duration: 10 },
  { level: 14, smallBlind: 3000, bigBlind: 6000, duration: 10 },
  { level: 15, smallBlind: 4000, bigBlind: 8000, duration: 10 }
];

export default function TournamentLobby() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [nextLevelIn, setNextLevelIn] = useState(600);
  const [isStarted, setIsStarted] = useState(false);
  const startTime = addMinutes(new Date(), 5);
  const formattedStartTime = format(startTime, 'h:mm a');

  // Timer effect
  useEffect(() => {
    if (!isStarted) return;

    const timer = setInterval(() => {
      setNextLevelIn(prev => {
        if (prev <= 0) {
          setCurrentLevel(curr => curr + 1);
          return 600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="h-screen bg-gray-900 text-white grid grid-rows-[60px_1fr] max-h-screen overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 h-[60px] flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/BUX.png" alt="BUX Logo" width={32} height={32} className="rounded-full" />
            <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
              BUX POKER HUB
            </span>
          </Link>
          <button
            onClick={() => signIn('discord')}
            className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] transition-colors px-3 py-1.5 rounded-lg font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Login with Discord
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Tournament Info */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-green-400 mb-4">Tournament Information</h2>
              <div className="space-y-2 text-gray-300">
                <p>Start Time: {formattedStartTime}</p>
                <p>Players: {INITIAL_PLAYERS.length} seats</p>
                <p>Starting Chips: 1,000</p>
                {isStarted && (
                  <>
                    <p>Current Level: {currentLevel + 1}</p>
                    <p>Current Blinds: {BLIND_LEVELS[currentLevel].smallBlind}/{BLIND_LEVELS[currentLevel].bigBlind}</p>
                    <p>Next Blinds: {BLIND_LEVELS[currentLevel + 1]?.smallBlind}/{BLIND_LEVELS[currentLevel + 1]?.bigBlind}</p>
                    <p>Next Level In: {formatTime(nextLevelIn)}</p>
                  </>
                )}
              </div>
            </div>

            {/* Blind Schedule */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-green-400 mb-4">Blind Schedule</h2>
              <div className="overflow-y-auto max-h-[calc(100vh-36rem)]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr className="border-b border-gray-700">
                      <th className="p-2 text-left">Level</th>
                      <th className="p-2 text-left">Small Blind</th>
                      <th className="p-2 text-left">Big Blind</th>
                      <th className="p-2 text-left">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BLIND_LEVELS.map((level) => (
                      <tr 
                        key={level.level} 
                        className={`border-b border-gray-700 ${currentLevel === level.level - 1 ? 'bg-blue-900' : ''}`}
                      >
                        <td className="p-2">{level.level}</td>
                        <td className="p-2">{level.smallBlind}</td>
                        <td className="p-2">{level.bigBlind}</td>
                        <td className="p-2">{level.duration} mins</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column - Players */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-green-400 mb-4">Players</h2>
            <div className="overflow-y-auto max-h-[calc(100vh-16rem)]">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-800">
                  <tr className="border-b border-gray-700">
                    <th className="p-2 text-left">Player</th>
                    <th className="p-2 text-left">Chips</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {INITIAL_PLAYERS.map((player) => (
                    <tr key={player.id} className="border-b border-gray-700">
                      <td className="p-2">
                        <div className="flex items-center space-x-3">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden">
                            <Image
                              src={player.avatar}
                              alt={player.name}
                              fill
                              sizes="(max-width: 768px) 40px, 80px"
                              className="object-cover"
                            />
                          </div>
                          <span className="font-medium capitalize">{player.name}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <span>{player.chips.toLocaleString()}</span>
                      </td>
                      <td className="p-2 text-right">
                        <Link
                          href={`/table/${GAME_TABLE_ID}/${player.name}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500 hover:bg-green-600 transition-colors"
                        >
                          Join
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 