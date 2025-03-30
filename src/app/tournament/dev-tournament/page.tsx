'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, addMinutes } from 'date-fns';

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
  { id: '2', name: 'tom', chips: 1000, avatar: AVATAR_URLS[1] },
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">BUX Tournament</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Tournament Info */}
            <div className="rounded-lg bg-gray-800 p-6">
              <h2 className="text-2xl font-semibold mb-4">Tournament Information</h2>
              <div className="space-y-2">
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
            <div className="rounded-lg bg-gray-800 p-6">
              <h2 className="text-2xl font-semibold mb-4">Blind Schedule</h2>
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
          <div className="rounded-lg bg-gray-800 p-6">
            <h2 className="text-2xl font-semibold mb-4">Players</h2>
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
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 transition-colors"
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
    </div>
  );
} 