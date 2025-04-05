'use client';

import React from 'react';
import Image from 'next/image';
import { TablePosition } from '@/types/poker';

// Define chip colors for different values
const getChipColor = (value: number): string => {
  switch (value) {
    case 10: return 'bg-gray-500';     // Gray
    case 20: return 'bg-red-600';      // Red
    case 50: return 'bg-green-600';    // Green
    case 100: return 'bg-black';       // Black
    case 200: return 'bg-purple-600';  // Purple
    case 500: return 'bg-blue-600';    // Blue
    case 1000: return 'bg-yellow-500'; // Yellow
    case 5000: return 'bg-pink-600';   // Pink
    case 10000: return 'bg-orange-500';// Orange
    default: return 'bg-gray-500';     // Default gray
  }
};

interface ChipStackProps {
  amount: number;
  position?: TablePosition | string;
}

export default function ChipStack({ amount, position = '' }: ChipStackProps) {
  if (amount <= 0) return null;

  const chipColors = {
    1000: 'bg-orange-500',
    500: 'bg-purple-500',
    100: 'bg-black',
    25: 'bg-green-600',
    5: 'bg-red-600',
    1: 'bg-blue-600'
  };

  const getChips = (amount: number) => {
    const chips: { value: number; count: number }[] = [];
    let remaining = amount;

    [1000, 500, 100, 25, 5, 1].forEach(value => {
      const count = Math.floor(remaining / value);
      if (count > 0) {
        chips.push({ value, count });
        remaining %= value;
      }
    });

    return chips;
  };

  const chips = getChips(amount);

  return (
    <div className={`absolute ${position} flex flex-col-reverse items-center`}>
      <div className="text-white text-sm font-bold mt-1">{amount}</div>
      <div className="relative w-6 h-8">
        {chips.map(({ value, count }, index) => (
          <div
            key={value}
            className={`absolute w-6 h-2 rounded-full border border-white/50 ${chipColors[value as keyof typeof chipColors]}`}
            style={{
              bottom: `${index * 4}px`,
              transform: 'translateZ(0)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}
          />
        ))}
      </div>
    </div>
  );
} 