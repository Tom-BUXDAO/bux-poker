'use client';

import Link from 'next/link';
import { LoginButton } from './LoginButton';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-white">
            BUX Poker
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/tournaments" className="text-sm text-gray-300 hover:text-white transition-colors">
              Tournaments
            </Link>
            <Link href="/leaderboard" className="text-sm text-gray-300 hover:text-white transition-colors">
              Leaderboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300">{session.user?.name}</span>
              {session.user?.image && (
                <div className="relative w-8 h-8">
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'Profile'}
                    fill
                    className="rounded-full"
                  />
                </div>
              )}
            </div>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </header>
  );
} 