'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function HomePage() {
  return (
    <main className="h-screen bg-gray-900 text-white grid grid-rows-[60px_auto_auto_auto] max-h-screen overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 h-[60px] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/BUX.png" alt="BUX Logo" width={32} height={32} className="rounded-full" />
            <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
              BUX POKER HUB
            </span>
          </div>
          <button
            onClick={() => signIn('discord')}
            className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] transition-colors px-3 py-1.5 rounded-lg font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Login with Discord
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex items-center justify-center py-2">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="md:flex-1 text-center md:text-left max-w-lg">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent mb-4">
                Welcome to BUX Poker
              </h1>
              <p className="text-gray-400 text-base md:text-lg">
                Join the ultimate poker experience in the BUXDAO community.<br />
                Play, compete, and climb the leaderboard!
              </p>
            </div>
            <div className="md:flex-1 relative max-w-[400px]">
              <div className="relative w-full">
                {/* Monitor Frame SVG */}
                <svg className="w-full h-auto" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
                  <g>
                    <path fill="#36343A" d="M108.262,203.3h983.472c16.696,0,30.351,13.658,30.351,30.358v615.172c0,16.699-13.655,30.358-30.351,30.358H108.262c-16.688,0-30.346-13.658-30.346-30.358V233.657C77.916,216.958,91.574,203.3,108.262,203.3z"/>
                    <path fill="#54C5D1" d="M110.514,236.892h972.522c1.042,0,1.903,0.839,1.903,1.892v551.088c0,1.046-0.861,1.892-1.903,1.892H110.514c-1.057,0-1.903-0.846-1.903-1.892V238.784C108.611,237.731,109.457,236.892,110.514,236.892z"/>
                    {/* Screen Content Container */}
                    <foreignObject x="110" y="238" width="972" height="552">
                      <div className="w-full h-full relative">
                        <Image
                          src="/Screenshot 2025-03-31 at 17.58.10.png"
                          alt="BUX Poker Gameplay"
                          fill
                          className="object-cover"
                          quality={90}
                          priority
                        />
                      </div>
                    </foreignObject>
                    <path fill="#656568" d="M511.286,824.547h91.477h1.395h91.481c-2.051,52.792,4.373,115.347,38.778,151.765H604.158h-1.395H472.512C506.913,939.894,513.337,877.339,511.286,824.547z"/>
                    <path fill="#36343A" d="M400.257,942.068h424.957c15.027,0,27.316,12.278,27.316,27.316v16.759c0,5.801-4.748,10.557-10.553,10.557h-460.32c-4.796,0-8.72-3.924-8.72-8.71v-18.606C372.938,954.346,385.234,942.068,400.257,942.068z"/>
                    <path fill="#00BDEB" d="M151.065,845.868c7.649,0,13.885-6.365,13.885-14.185s-6.235-14.185-13.885-14.185c-7.648,0-13.88,6.365-13.88,14.185S143.416,845.868,151.065,845.868z"/>
                    <path fill="#919697" d="M204.788,845.868c7.648,0,13.888-6.365,13.888-14.185s-6.239-14.185-13.888-14.185c-7.642,0-13.88,6.365-13.88,14.185S197.146,845.868,204.788,845.868z"/>
                    <path fill="#919697" d="M257.914,845.868c7.648,0,13.884-6.365,13.884-14.185s-6.235-14.185-13.884-14.185c-7.645,0-13.889,6.365-13.889,14.185S250.268,845.868,257.914,845.868z"/>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Game Tiles */}
      <section className="py-1 px-4 md:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/tournament/dev-tournament" className="group">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-green-500 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <h3 className="text-lg font-bold text-green-400 group-hover:text-green-300">Dev-test Tournament</h3>
                <p className="text-gray-400 text-sm">Test and practice your poker skills in our development environment.</p>
              </div>
            </Link>
            <Link href="/sit-n-go" className="group">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-yellow-500 transition-all hover:shadow-lg hover:shadow-yellow-500/20">
                <h3 className="text-lg font-bold text-yellow-400 group-hover:text-yellow-300">Sit n' Goes</h3>
                <p className="text-gray-400 text-sm">Quick games that start as soon as enough players join. Perfect for short sessions.</p>
              </div>
            </Link>
            <Link href="/tournaments" className="group">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <h3 className="text-lg font-bold text-blue-400 group-hover:text-blue-300">Tournaments</h3>
                <p className="text-gray-400 text-sm">Compete in scheduled tournaments with bigger prize pools and more players.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-1 px-4 pb-6">
        <div className="container mx-auto">
          <h2 className="text-lg font-bold mb-2 text-center">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-w-5xl mx-auto">
            <div className="bg-gray-800/50 rounded-lg p-2">
              <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center mb-1">
                <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold">Play Using Your Discord Profile</h3>
              <p className="text-gray-400 text-xs">Seamlessly integrate your Discord identity into your poker experience.</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2">
              <div className="w-6 h-6 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-1">
                <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold">Easy Registration</h3>
              <p className="text-gray-400 text-xs">Register for games directly through the BUXDAO Discord server with a simple "JOIN" button.</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2">
              <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center mb-1">
                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold">BUXDAO Poker Leaderboard <span className="text-xs text-blue-400">Coming Soon</span></h3>
              <p className="text-gray-400 text-xs">Compete in regular games to climb the leaderboard and win monthly prizes based on your standings.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
} 