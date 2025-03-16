import { getTournaments } from '@/lib/db';
import Link from 'next/link';

export default async function Home() {
  const tournaments = await getTournaments();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">BUX Poker Tournaments</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((tournament) => (
          <Link
            key={tournament.id}
            href={`/tournament/${tournament.id}`}
            className="block p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
          >
            <h2 className="text-2xl font-bold mb-4">Tournament #{tournament.id}</h2>
            <div className="space-y-2 text-gray-400">
              <p>Start Time: {new Date(tournament.start_time).toLocaleString()}</p>
              <p>Players: {tournament.registered_players}</p>
              <p>Starting Chips: {tournament.starting_chips.toLocaleString()}</p>
              <p>Status: {tournament.status}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 