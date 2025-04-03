'use client';

import React from 'react';
import ChipStack from './ChipStack';

interface PotDisplayProps {
  mainPot: number;
  sidePots?: { amount: number; eligiblePlayers: string[] }[];
}

export default function PotDisplay({ mainPot, sidePots = [] }: PotDisplayProps) {
  const totalPot = mainPot + sidePots.reduce((sum, pot) => sum + pot.amount, 0);

  return (
    <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 flex flex-col items-center">
      <div className="flex items-center gap-4">
        <ChipStack amount={mainPot} />
        <div className="text-white text-scale-lg text-scale-bold">
          Total Pot: {totalPot.toLocaleString()}
        </div>
      </div>
      
      {sidePots.length > 0 && (
        <div className="mt-2 flex flex-col items-center">
          {sidePots.map((pot, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-gray-300 text-scale-base">Side Pot {index + 1}:</span>
              <span className="text-yellow-400 text-scale-base text-scale-bold">{pot.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 