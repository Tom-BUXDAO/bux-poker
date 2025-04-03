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
        <div className={`relative w-[4.5vw] h-[4.5vw] rounded-full overflow-hidden border-2 bg-gray-800/90 
          ${isActive ? 'border-yellow-500' : 'border-gray-700'}`}>
          <img
            src={avatar}
            alt={name || 'Player'}
            className="w-full h-full object-cover"
          />
        </div>
        {/* Name and Chips */}
        {showInfo && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-center min-w-[6vw]">
            <div className="text-white font-medium text-[0.65vw] truncate">{name || 'Player'}</div>
            <div className="text-yellow-400 font-medium text-[0.65vw]">{chips.toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  );
} 