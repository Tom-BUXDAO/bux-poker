'use client';

import React from 'react';
import Image from 'next/image';

interface PlayerAvatarProps {
  name: string;
  chips: number;
  avatar: string;
  isActive?: boolean;
  position?: string;
  showInfo?: boolean;
}

export default function PlayerAvatar({ name, chips, avatar, isActive, position, showInfo = true }: PlayerAvatarProps) {
  return (
    <div className={`relative ${position || ''}`}>
      <div className={`relative ${isActive ? 'active-player' : ''}`}>
        {/* Avatar */}
        <div className={`relative w-[2.5rem] h-[2.5rem] sm:w-[3.5rem] sm:h-[3.5rem] md:w-[4.5rem] md:h-[4.5rem] rounded-full overflow-hidden border-2 bg-gray-800/90 
          ${isActive ? 'border-yellow-500' : 'border-gray-700'}`}>
          <img
            src={avatar}
            alt={name || 'Player'}
            className="w-full h-full object-cover"
          />
        </div>
        {/* Name and Chips */}
        {showInfo && (
          <div className="-mt-4 text-center min-w-[4rem] sm:min-w-[5rem] md:min-w-[6rem]">
            <div className="text-white font-medium text-[0.5rem] sm:text-[0.6rem] md:text-[0.75rem] truncate max-w-[6rem] sm:max-w-[8rem] md:max-w-[10rem]">{name || 'Player'}</div>
            <div className="text-yellow-400 font-medium text-[0.5rem] sm:text-[0.6rem] md:text-[0.75rem]">{chips.toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  );
} 