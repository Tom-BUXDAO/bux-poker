'use client';

import Link from 'next/link';
import { LoginButton } from './LoginButton';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  username: string;
  discord_avatar_url: string;
}

export function Header() {
  const { session } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function fetchUserProfile() {
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('users')
          .select('username, discord_avatar_url')
          .eq('discord_id', session.user.user_metadata.sub)
          .single();

        if (!error && profile) {
          setUserProfile(profile);
        }
      }
    }

    fetchUserProfile();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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
              <span className="text-sm text-gray-300">{userProfile?.username || 'Loading...'}</span>
              {userProfile?.discord_avatar_url && (
                <div className="relative w-8 h-8">
                  <Image
                    src={userProfile.discord_avatar_url}
                    alt={userProfile.username}
                    fill
                    className="rounded-full"
                  />
                </div>
              )}
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Log out"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </header>
  );
} 