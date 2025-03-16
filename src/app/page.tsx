import Link from 'next/link'
import { getTournaments } from '@/lib/db'

export default async function Home() {
  const tournaments = await getTournaments()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="h1 mb-8">BUX Poker Tournaments</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((tournament) => (
          <Link
            key={tournament.id}
            href={`/tournaments/${tournament.id}`}
            className="block p-6 bg-card rounded-lg border border-border hover:border-primary transition-colors"
          >
            <h2 className="h3 mb-4">Tournament #{tournament.id}</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>Start Time: {new Date(tournament.start_time).toLocaleString()}</p>
              <p>Players: {tournament.registered_players}</p>
              <p>Starting Chips: {tournament.starting_chips.toLocaleString()}</p>
              <p>Status: {tournament.status}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
} 