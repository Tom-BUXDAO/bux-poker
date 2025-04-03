import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon,
  TrophyIcon,
  HandRaisedIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  FireIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface PlayerStats {
  gamesPlayed: number;
  topThreeFinishes: number;
  averageFinalPosition: number;
  handsPlayed: number;
  handsWon: number;
  preflopFoldPercentage: number;
  flopFoldPercentage: number;
  turnFoldPercentage: number;
  riverFoldPercentage: number;
  noFoldPercentage: number;
  winPercentageWhenNoFold: number;
}

interface PlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
}

export default function PlayerStatsModal({ isOpen, onClose, playerId }: PlayerStatsModalProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && playerId) {
      fetchPlayerStats();
    }
  }, [isOpen, playerId]);

  const fetchPlayerStats = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Starting fetch for player stats - Player ID:', playerId);
      
      if (!playerId) {
        console.error('No player ID provided');
        setError(null);
        setStats({
          gamesPlayed: 0,
          topThreeFinishes: 0,
          averageFinalPosition: 0,
          handsPlayed: 0,
          handsWon: 0,
          preflopFoldPercentage: 0,
          flopFoldPercentage: 0,
          turnFoldPercentage: 0,
          riverFoldPercentage: 0,
          noFoldPercentage: 0,
          winPercentageWhenNoFold: 0
        });
        setLoading(false);
        return;
      }

      const url = `/api/player/stats/${encodeURIComponent(playerId)}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Received stats data:', data);
      
      setStats(data);
      setError(null);
    } catch (error) {
      console.error('Error in fetchPlayerStats:', error);
      setError('Unable to load stats. Please try again later.');
      setStats({
        gamesPlayed: 0,
        topThreeFinishes: 0,
        averageFinalPosition: 0,
        handsPlayed: 0,
        handsWon: 0,
        preflopFoldPercentage: 0,
        flopFoldPercentage: 0,
        turnFoldPercentage: 0,
        riverFoldPercentage: 0,
        noFoldPercentage: 0,
        winPercentageWhenNoFold: 0
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="mx-auto max-w-4xl rounded-xl bg-gradient-to-b from-gray-900 to-gray-800 border border-gray-700 shadow-xl p-6 w-full transform transition-all">
                <div className="flex justify-between items-center mb-8">
                  <Dialog.Title className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-3">
                    <ChartBarIcon className="w-8 h-8 text-white" />
                    Player Statistics {playerId && <span className="text-white">for {playerId}</span>}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                ) : error ? (
                  <div className="text-center text-red-400 py-8">
                    {error}
                  </div>
                ) : stats ? (
                  <div className="grid grid-cols-3 gap-8">
                    <div className="space-y-6 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                      <div className="flex items-center gap-3">
                        <TrophyIcon className="w-6 h-6 text-green-400" />
                        <h3 className="text-xl font-semibold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">Game Stats</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">Games Played</p>
                          <p className="text-2xl font-medium text-white">{stats.gamesPlayed}</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">Top 3 Finishes</p>
                          <p className="text-2xl font-medium text-white">{stats.topThreeFinishes}</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">Avg Final Position</p>
                          <p className="text-2xl font-medium text-white">{stats.averageFinalPosition.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                      <div className="flex items-center gap-3">
                        <HandRaisedIcon className="w-6 h-6 text-yellow-400" />
                        <h3 className="text-xl font-semibold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">Hand Stats</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">Hands Played</p>
                          <p className="text-2xl font-medium text-white">{stats.handsPlayed}</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">Hands Won</p>
                          <p className="text-2xl font-medium text-white">{stats.handsWon}</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">Win % When No Fold</p>
                          <p className="text-2xl font-medium text-white">{stats.winPercentageWhenNoFold}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                      <div className="flex items-center gap-3">
                        <ArrowTrendingDownIcon className="w-6 h-6 text-blue-400" />
                        <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">Fold Stats</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-gray-900/50 rounded-lg p-4 flex justify-between items-center">
                          <p className="text-gray-400">Preflop</p>
                          <p className="text-xl font-medium text-white">{stats.preflopFoldPercentage}%</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4 flex justify-between items-center">
                          <p className="text-gray-400">Flop</p>
                          <p className="text-xl font-medium text-white">{stats.flopFoldPercentage}%</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4 flex justify-between items-center">
                          <p className="text-gray-400">Turn</p>
                          <p className="text-xl font-medium text-white">{stats.turnFoldPercentage}%</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4 flex justify-between items-center">
                          <p className="text-gray-400">River</p>
                          <p className="text-xl font-medium text-white">{stats.riverFoldPercentage}%</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4 flex justify-between items-center">
                          <p className="text-gray-400">No Fold</p>
                          <p className="text-xl font-medium text-white">{stats.noFoldPercentage}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    No statistics available
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 