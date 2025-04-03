'use client';

import React, { useState } from 'react';

interface ActionPanelProps {
  currentBet: number;
  pot: number;
  minBet: number;
  onAction: (action: string, amount?: number) => void;
  playerCards: any[];
  communityCards: any[];
}

// Add test cards
const TEST_CARDS = [
  { rank: 'A', suit: 'S' },
  { rank: 'K', suit: 'H' }
];

export default function ActionPanel({ currentBet, pot, minBet, onAction, playerCards, communityCards }: ActionPanelProps) {
  const [betAmount, setBetAmount] = useState((currentBet + minBet).toString());
  
  // Use test cards if no player cards provided
  const displayCards = playerCards.length > 0 ? playerCards : TEST_CARDS;

  return (
    <div className="bg-gray-900 p-2">
      <div className="flex items-center gap-2">
        {/* Left Container - Cards and Info */}
        <div className="w-1/2 flex gap-2">
          {/* Cards Section with Yellow Border */}
          <div className="w-[45%] aspect-[1.6] flex items-center justify-center gap-4 p-2 rounded">
            {displayCards.map((card, index) => (
              <div key={index} className="h-full aspect-[0.72] relative">
                <img 
                  src={`/cards/${card.rank}${card.suit}.png`}
                  alt={`${card.rank} of ${card.suit}`}
                  className="h-full w-full object-contain"
                />
              </div>
            ))}
          </div>

          {/* Game Info Tile */}
          <div className="w-[55%] aspect-[1.6] bg-black/50 rounded p-1">
            <div className="h-full flex flex-col justify-between">
              {/* Best Hand */}
              <div className="leading-tight">
                <div className="text-white uppercase tracking-wider text-scale-base">Best hand</div>
                <div className="text-yellow-400 text-scale-lg text-scale-bold">
                  {evaluateHand(playerCards, communityCards).description}
                </div>
              </div>

              {/* Blinds */}
              <div className="leading-tight">
                <div className="text-white uppercase tracking-wider text-scale-base">Blinds</div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-scale-base">Current</span>
                    <span className="text-white text-scale-base text-scale-bold">10/20</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-scale-base">Next</span>
                    <span className="text-white text-scale-base text-scale-bold">20/40</span>
                  </div>
                </div>
              </div>

              {/* Timer */}
              <div className="leading-tight">
                <div className="flex items-center gap-1">
                  <span className="text-white uppercase tracking-wider text-scale-base">Next level</span>
                  <span className="text-yellow-400 text-scale-base text-scale-bold">10:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Container - Action Buttons */}
        <div className="w-1/2 flex items-center gap-2">
          {/* Fold Column */}
          <div className="flex-1 w-[45%] aspect-[1.6] flex flex-col gap-2">
            <div className="h-[60%]">
              <button 
                onClick={() => onAction('fold')}
                className="h-full w-full bg-red-600 hover:bg-red-700 text-white text-scale-lg text-scale-bold rounded uppercase tracking-wider border border-white"
              >
                Fold
              </button>
            </div>
            <div className="h-[35%] flex gap-2">
              <button 
                onClick={() => onAction('bet', Math.floor(pot / 2))}
                className="flex-1 h-full min-h-[28px] bg-gray-700 hover:bg-gray-600 text-white text-scale-base rounded border border-green-500"
              >
                1/2
              </button>
              <button 
                onClick={() => onAction('bet', Math.floor(pot * 2 / 3))}
                className="flex-1 h-full min-h-[28px] bg-gray-700 hover:bg-gray-600 text-white text-scale-base rounded border border-green-500"
              >
                2/3
              </button>
            </div>
          </div>

          {/* Check/Call Column */}
          <div className="flex-1 w-[45%] aspect-[1.6] flex flex-col gap-2">
            <div className="h-[60%]">
              <button 
                onClick={() => onAction(currentBet > 0 ? 'call' : 'check')}
                className="h-full w-full bg-blue-600 hover:bg-blue-700 text-white text-scale-lg text-scale-bold rounded uppercase tracking-wider border border-white"
              >
                {currentBet > 0 ? 'Call' : 'Check'}
              </button>
            </div>
            <div className="h-[35%] flex gap-2">
              <button 
                onClick={() => onAction('bet', pot)}
                className="flex-1 h-full min-h-[28px] bg-gray-700 hover:bg-gray-600 text-white text-scale-base rounded border border-green-500"
              >
                POT
              </button>
              <button 
                onClick={() => onAction('allin')}
                className="flex-1 h-full min-h-[28px] bg-gray-700 hover:bg-gray-600 text-white text-scale-base rounded border border-green-500"
              >
                ALL IN
              </button>
            </div>
          </div>

          {/* Bet/Raise Column */}
          <div className="flex-1 w-[45%] aspect-[1.6] flex flex-col gap-2">
            <div className="h-[60%]">
              <button 
                onClick={() => onAction('bet', parseInt(betAmount))}
                className="h-full w-full bg-green-600 hover:bg-green-700 text-white text-scale-lg text-scale-bold rounded uppercase tracking-wider border border-white"
              >
                {currentBet > 0 ? 'Raise' : 'Bet'} {betAmount || 0}
              </button>
            </div>
            <div className="h-[35%] grid grid-cols-3 gap-2">
              <button 
                onClick={() => setBetAmount(prev => Math.max(0, parseInt(prev || '0') - minBet).toString())}
                className="h-full min-h-[28px] bg-gray-700 hover:bg-gray-600 text-white text-scale-base rounded border border-green-500"
              >
                -
              </button>
              <input 
                type="text" 
                className="h-full min-h-[28px] bg-white text-gray-900 text-center text-scale-base rounded border border-green-500"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value.replace(/\D/g, ''))}
              />
              <button 
                onClick={() => setBetAmount(prev => (parseInt(prev || '0') + minBet).toString())}
                className="h-full min-h-[28px] bg-gray-700 hover:bg-gray-600 text-white text-scale-base rounded border border-green-500"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to evaluate poker hands
function evaluateHand(holeCards: any[], communityCards: any[]): { type: string, description: string } {
  if (!holeCards || holeCards.length === 0) {
    return { type: '', description: 'Waiting for cards...' };
  }
  // For now, return a simple description
  return { type: 'High Card', description: 'High Card' };
} 