'use client';

import { signIn } from 'next-auth/react';

export function LoginButton() {
  return (
    <button
      onClick={() => signIn('discord')}
      className="px-4 py-2 rounded-lg text-sm font-semibold 
        bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 
        text-white shadow-lg hover:scale-105 transition-transform"
    >
      Login with Discord
    </button>
  );
} 