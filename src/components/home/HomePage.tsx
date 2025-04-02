'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-gray-900 text-white grid grid-rows-[10vh_40vh_28vh_15vh_7vh] overflow-y-auto portrait:hidden">
      {/* Header - 10vh */}
      <header className="border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
        <div className="container mx-auto px-2 xs:px-3 sm:px-4 h-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
            <Image 
              src="/BUX.png" 
              alt="BUX Logo" 
              width={40} 
              height={40} 
              className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" 
              priority
            />
            <span className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
              BUX POKER HUB
            </span>
          </Link>
          {session ? (
            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
              <div className="relative w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10">
                <Image 
                  src={session.user.image || '/BUX.png'} 
                  alt={session.user.name || 'User'} 
                  fill
                  className="rounded-full object-cover"
                  priority
                />
              </div>
              <span className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-white">{session.user.name}</span>
              <button
                onClick={() => signOut()}
                className="ml-1 xs:ml-1.5 sm:ml-2 p-1 xs:p-1.5 rounded-full hover:bg-gray-800 transition-colors"
                title="Logout"
              >
                <svg className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn('discord')}
              className="flex items-center gap-1 xs:gap-1.5 bg-[#5865F2] hover:bg-[#4752C4] transition-colors px-2 xs:px-2.5 sm:px-3 md:px-4 py-1 xs:py-1.5 rounded text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-medium"
            >
              <svg className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Login
            </button>
          )}
        </div>
      </header>

      {/* Hero Section - 40vh */}
      <div className="container mx-auto px-2 xs:px-3 sm:px-4 flex items-center">
        <div className="flex-1 pr-2 xs:pr-4 sm:pr-6 md:pr-8">
          <h1 className="text-lg xs:text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold mb-1 xs:mb-2 sm:mb-3 md:mb-4">
            <span className="text-green-400">Welcome to</span><br />
            <span className="bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">BUX POKER HUB</span>
          </h1>
          <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-white leading-relaxed">
            Join the ultimate poker experience in the BUXDAO community.<br />
            Play, compete, and climb the leaderboard!
          </p>
        </div>
        <div className="h-full flex items-center">
          <div className="relative h-full aspect-[4/3]">
            {/* Monitor Frame SVG */}
            <svg className="w-full h-full" version="1.0" id="Capa_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1199.999" enableBackground="new 0 0 1200 1199.999">
              <g>
                <path fillRule="evenodd" clipRule="evenodd" fill="#656568" d="M511.286,824.547h91.477h1.395h91.481c-2.051,52.792,4.373,115.347,38.778,151.765H604.158h-1.395H472.512C506.913,939.894,513.337,877.339,511.286,824.547z"/>
                <path fillRule="evenodd" clipRule="evenodd" fill="#36343A" d="M108.262,203.3h983.472c16.696,0,30.351,13.658,30.351,30.358v615.172c0,16.699-13.655,30.358-30.351,30.358H108.262c-16.688,0-30.346-13.658-30.346-30.358V233.657C77.916,216.958,91.574,203.3,108.262,203.3z"/>
                <path fillRule="evenodd" clipRule="evenodd" fill="#54C5D1" d="M110.514,236.892h972.522c1.042,0,1.903,0.839,1.903,1.892v551.088c0,1.046-0.861,1.892-1.903,1.892H110.514c-1.057,0-1.903-0.846-1.903-1.892V238.784C108.611,237.731,109.457,236.892,110.514,236.892z"/>
                <path fillRule="evenodd" clipRule="evenodd" fill="#8FD5DD" d="M110.625,236.892h972.295c17.237,0-147.311,154.221-463.298,344.149C370.627,730.7,107.223,796.274,108.611,789.872V238.784C108.611,237.731,109.516,236.892,110.625,236.892z"/>
                <path fillRule="evenodd" clipRule="evenodd" fill="#00BDEB" d="M151.065,845.868c7.649,0,13.885-6.365,13.885-14.185s-6.235-14.185-13.885-14.185c-7.648,0-13.88,6.365-13.88,14.185S143.416,845.868,151.065,845.868z"/>
                <path fillRule="evenodd" clipRule="evenodd" fill="#919697" d="M204.788,845.868c7.648,0,13.888-6.365,13.888-14.185s-6.239-14.185-13.888-14.185c-7.642,0-13.88,6.365-13.88,14.185S197.146,845.868,204.788,845.868z"/>
                <path fillRule="evenodd" clipRule="evenodd" fill="#919697" d="M257.914,845.868c7.648,0,13.884-6.365,13.884-14.185s-6.235-14.185-13.884-14.185c-7.645,0-13.889,6.365-13.889,14.185S250.268,845.868,257.914,845.868z"/>
                <path fillRule="evenodd" clipRule="evenodd" fill="#36343A" d="M400.257,942.068h424.957c15.027,0,27.316,12.278,27.316,27.316v16.759c0,5.801-4.748,10.557-10.553,10.557h-460.32c-4.796,0-8.72-3.924-8.72-8.71v-18.606C372.938,954.346,385.234,942.068,400.257,942.068z"/>
              </g>
              {/* Screen Content Container */}
              <foreignObject x="108.611" y="236.892" width="975.328" height="554.872">
                <div className="w-full h-full relative overflow-hidden rounded">
                  <Image
                    src="/Screenshot 2025-03-31 at 17.58.10.png"
                    alt="BUX Poker Gameplay"
                    fill
                    className="object-cover"
                    quality={100}
                    priority
                  />
                </div>
              </foreignObject>
            </svg>
          </div>
        </div>
      </div>

      {/* Game Tiles - 28vh */}
      <div className="container mx-auto px-2 xs:px-3 sm:px-4">
        <div className="grid grid-cols-3 gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 lg:gap-6 h-full py-1.5 xs:py-2 sm:py-3 md:py-4 lg:py-6">
          <Link href="/tournament/dev-tournament" className="group">
            <div className="bg-gray-800 rounded p-1.5 xs:p-2 sm:p-3 md:p-4 lg:p-6 border border-gray-700 hover:border-green-500 transition-all h-full">
              <h3 className="text-xxs xs:text-xs sm:text-sm md:text-3xl lg:text-4xl font-bold text-green-400 mb-0.5 xs:mb-1 sm:mb-1.5 md:mb-2">Dev-test Tournament</h3>
              <p className="text-xxxs xs:text-xxs sm:text-xs md:text-xl lg:text-2xl text-gray-400 leading-snug">Test and practice your poker skills.</p>
            </div>
          </Link>
          <Link href="/sit-n-go" className="group">
            <div className="bg-gray-800 rounded p-1.5 xs:p-2 sm:p-3 md:p-4 lg:p-6 border border-gray-700 hover:border-yellow-500 transition-all h-full">
              <h3 className="text-xxs xs:text-xs sm:text-sm md:text-3xl lg:text-4xl font-bold text-yellow-400 mb-0.5 xs:mb-1 sm:mb-1.5 md:mb-2">Sit n' Goes</h3>
              <p className="text-xxxs xs:text-xxs sm:text-xs md:text-xl lg:text-2xl text-gray-400 leading-snug">Quick games that start as soon as enough players join.</p>
            </div>
          </Link>
          <Link href="/tournaments" className="group">
            <div className="bg-gray-800 rounded p-1.5 xs:p-2 sm:p-3 md:p-4 lg:p-6 border border-gray-700 hover:border-blue-500 transition-all h-full">
              <h3 className="text-xxs xs:text-xs sm:text-sm md:text-3xl lg:text-4xl font-bold text-blue-400 mb-0.5 xs:mb-1 sm:mb-1.5 md:mb-2">Tournaments</h3>
              <p className="text-xxxs xs:text-xxs sm:text-xs md:text-xl lg:text-2xl text-gray-400 leading-snug">Compete in scheduled tournaments.</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Features - 15vh */}
      <div className="container mx-auto px-2 xs:px-3 sm:px-4">
        <h2 className="text-xxs xs:text-xs sm:text-sm md:text-base lg:text-lg font-bold text-white text-center mb-1 xs:mb-1.5 sm:mb-2">Features</h2>
        <div className="grid grid-cols-3 gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 lg:gap-6 h-[calc(100%-2rem)]">
          <div className="bg-gray-800/50 rounded p-1 xs:p-1.5 sm:p-2 md:p-3 lg:p-4 h-full">
            <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 mb-0.5 xs:mb-1 sm:mb-1.5 md:mb-2">
              <svg className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              <h3 className="text-xxxs xs:text-xxs sm:text-xs md:text-sm lg:text-base font-bold text-white">Discord Profile</h3>
            </div>
            <p className="text-xxxs xs:text-xxs sm:text-xs md:text-sm lg:text-base text-white/70 leading-snug">Seamlessly integrate your Discord identity.</p>
          </div>
          <div className="bg-gray-800/50 rounded p-1 xs:p-1.5 sm:p-2 md:p-3 lg:p-4 h-full">
            <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 mb-0.5 xs:mb-1 sm:mb-1.5 md:mb-2">
              <svg className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
              </svg>
              <h3 className="text-xxxs xs:text-xxs sm:text-xs md:text-sm lg:text-base font-bold text-white">Easy Join</h3>
            </div>
            <p className="text-xxxs xs:text-xxs sm:text-xs md:text-sm lg:text-base text-white/70 leading-snug">Register with a simple "JOIN" button.</p>
          </div>
          <div className="bg-gray-800/50 rounded p-1 xs:p-1.5 sm:p-2 md:p-3 lg:p-4 h-full">
            <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 mb-0.5 xs:mb-1 sm:mb-1.5 md:mb-2">
              <svg className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
              </svg>
              <h3 className="text-xxxs xs:text-xxs sm:text-xs md:text-sm lg:text-base font-bold text-white">Leaderboard <span className="text-xxxs xs:text-xxs sm:text-xs text-white/70">Soon</span></h3>
            </div>
            <p className="text-xxxs xs:text-xxs sm:text-xs md:text-sm lg:text-base text-white/70 leading-snug">Win monthly prizes based on standings.</p>
          </div>
        </div>
      </div>

      {/* Bottom Padding - 7vh */}
      <div></div>
    </main>
  );
} 