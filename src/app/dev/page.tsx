'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DevPage() {
  const [playerName, setPlayerName] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if player info exists in localStorage
    const storedPlayer = localStorage.getItem('pokerPlayer');
    if (storedPlayer) {
      const player = JSON.parse(storedPlayer);
      setPlayerName(player.name);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Form submitted with name:', playerName);

    const playerData = {
      id: playerName,
      name: playerName,
      chips: 1000
    };
    console.log('Storing player data:', playerData);
    localStorage.setItem('pokerPlayer', JSON.stringify(playerData));
    window.location.href = '/table/dev-table';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Development Mode</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium mb-1">
              Enter Your Name
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              placeholder="e.g. John"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Join Test Table
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          <h2 className="font-semibold mb-2">Instructions:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Enter your name to join the test table</li>
            <li>Open in different browsers or incognito windows to test multiplayer</li>
            <li>Each player starts with 1,000 chips</li>
            <li>Use the action buttons to test game functionality</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 