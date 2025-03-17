import { getTournamentById } from '@/lib/db';
import { CalendarDays, Users, Coins, Timer, ChevronRight, LayoutGrid } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-server';
import RotatePrompt from '@/components/RotatePrompt';

interface PageProps {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

interface Player {
  user_id: string | null;
  username: string;
  discord_id: string;
  discord_avatar_url: string | null;
  registration_time: string;
  chip_count: number | null;
  final_position: number | null;
}

interface Tournament {
  id: string;
  start_time: string;
  max_players: number;
  players_per_table: number;
  starting_chips: number;
  blind_round_minutes: number;
  status: string;
  players?: Player[];
}

function getTimeUntilStart(startTime: Date) {
  const now = new Date();
  const diff = startTime.getTime() - now.getTime();
  
  if (diff <= 0) return 'Tournament has started';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  
  return `Starts in ${parts.join(' ')}`;
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

const BLIND_STRUCTURE = [
  { small: 10, big: 20 },
  { small: 20, big: 40 },
  { small: 50, big: 100 },
  { small: 100, big: 250 },
  { small: 250, big: 500 },
  { small: 400, big: 800 },
  { small: 500, big: 1000 },
  { small: 750, big: 1500 },
  { small: 1000, big: 2000 },
  { small: 1500, big: 3000 },
  { small: 2000, big: 4000 },
  { small: 3000, big: 6000 },
  { small: 4000, big: 8000 },
  { small: 5000, big: 10000 },
];

async function getPageData(id: string) {
  const supabase = await createClient();
  const [tournament, { data: { user } }] = await Promise.all([
    getTournamentById(id),
    supabase.auth.getUser()
  ]);
  return { tournament, user };
}

export default async function TournamentPage({ params }: PageProps) {
  const { tournament, user } = await getPageData(params.id);

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-4xl font-bold text-foreground">Tournament not found</h1>
        <p className="text-muted-foreground mt-2">The tournament you're looking for doesn't exist.</p>
        <a 
          href="/tournaments" 
          className="mt-4 inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white transition-all duration-200 
            bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg hover:scale-105 
            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
        >
          View All Tournaments
        </a>
      </div>
    );
  }

  const startTime = new Date(tournament.start_time);
  const players = (tournament.players as Player[] || []).filter(p => p.user_id !== null);
  const status = tournament.status?.toLowerCase() || 'pending';
  const maxPlayers = tournament.max_players || 100;

  // Sort players based on tournament status and chip count/position
  const sortedPlayers = [...players].sort((a, b) => {
    if (status === 'in_progress') {
      // During tournament, sort by chip count (highest first)
      return (b.chip_count || 0) - (a.chip_count || 0);
    } else if (status === 'completed') {
      // After tournament, sort by final position (lowest first)
      if (!a.final_position) return 1;
      if (!b.final_position) return -1;
      return a.final_position - b.final_position;
    }
    // Before tournament, sort by registration time
    return new Date(a.registration_time).getTime() - new Date(b.registration_time).getTime();
  });

  const statusColors = {
    pending: 'from-amber-400 via-orange-400 to-orange-500',
    in_progress: 'from-emerald-400 via-green-400 to-teal-500',
    completed: 'from-slate-400 via-gray-400 to-zinc-500'
  };

  return (
    <>
      <RotatePrompt />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 md:py-12">
          <div className="relative mb-8 sm:mb-12 md:mb-16">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="p-3 sm:p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Tournament Details
                  </h1>
                  <p className="text-lg sm:text-xl font-semibold mt-2 text-white">
                    {startTime.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-base sm:text-lg text-gray-400">
                    {startTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZoneName: 'short'
                    })}
                    {' '}
                    <span className="text-sm text-indigo-400">(your local time)</span>
                  </p>
                  <p className="text-base sm:text-lg font-medium text-indigo-400 mt-2">
                    {getTimeUntilStart(startTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base font-semibold text-white
                  bg-gradient-to-r ${statusColors[status as keyof typeof statusColors]} shadow-lg`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
            </div>
            <div className="absolute -bottom-4 sm:-bottom-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
            <div className="space-y-6 sm:space-y-8 md:space-y-12">
              {/* Tournament Details */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-gray-900 rounded-2xl p-6 sm:p-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Game Info
                  </h2>
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-start gap-6">
                      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <Users className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400">Players</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-semibold text-white">{players.length} registered</p>
                          <p className="text-sm text-gray-400">(Max {maxPlayers})</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-6">
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <LayoutGrid className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400">Active Tables</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-semibold text-white">{Math.ceil(players.length / tournament.players_per_table)}</p>
                          <p className="text-sm text-gray-400">({tournament.players_per_table} per table)</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-6">
                      <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                        <Coins className="w-6 h-6 text-pink-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400">Starting Chips</p>
                        <p className="text-xl font-semibold text-white">{tournament.starting_chips.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-6">
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <Timer className="w-6 h-6 text-rose-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400">Blind Levels</p>
                        <p className="text-xl font-semibold text-white">{tournament.blind_round_minutes} minutes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blind Structure */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-gray-900 rounded-2xl p-6 sm:p-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Blind Structure
                  </h2>
                  <div className="overflow-x-auto -mx-6 sm:-mx-8">
                    <div className="min-w-full px-6 sm:px-8">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-400 border-b border-gray-800">Level</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-400 border-b border-gray-800">Small Blind</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-400 border-b border-gray-800">Big Blind</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-400 border-b border-gray-800">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {BLIND_STRUCTURE.map((level, index) => (
                            <tr 
                              key={index}
                              className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                            >
                              <td className="py-3 px-4 text-white">{index + 1}</td>
                              <td className="py-3 px-4 text-white">{level.small}</td>
                              <td className="py-3 px-4 text-white">{level.big}</td>
                              <td className="py-3 px-4 text-gray-400">{tournament.blind_round_minutes} min</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Registered Players */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-gray-900 rounded-2xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Registered Players
                  </h2>
                  <div className="flex items-center gap-4">
                    <span className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-semibold bg-indigo-500/10 border border-indigo-500/20 
                      text-indigo-400">
                      {players.length}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  {sortedPlayers.map((player, index) => (
                    <div 
                      key={player.user_id} 
                      className="flex items-center justify-between p-3 sm:p-4 rounded-xl
                        bg-gray-800/50 border border-gray-700/50
                        transition-all duration-200 hover:border-purple-500/50 hover:bg-gray-800/80"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                          {player.discord_avatar_url ? (
                            <Image
                              src={player.discord_avatar_url}
                              alt={player.username}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                              priority={index === 0}
                            />
                          ) : (
                            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full
                              bg-[#5865F2] text-white font-medium text-base sm:text-lg">
                              {player.username[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-white text-sm sm:text-base">{player.username}</span>
                          {status === 'in_progress' && (
                            <p className="text-xs sm:text-sm text-gray-400">
                              {player.chip_count?.toLocaleString() || tournament.starting_chips.toLocaleString()} chips
                            </p>
                          )}
                          {status === 'completed' && player.final_position && (
                            <p className="text-xs sm:text-sm text-gray-400">
                              Finished {player.final_position}{getOrdinalSuffix(player.final_position)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user?.id === player.discord_id && status === 'pending' && (
                          <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium capitalize
                            bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-lg">
                            registered
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {players.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-gray-400">
                      No players registered yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 