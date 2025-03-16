import { Pool } from 'pg'
import { Tournament, Player, TournamentWithPlayers } from '../../../shared/types'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export async function getTournaments(): Promise<Tournament[]> {
  const result = await pool.query<Tournament>(`
    SELECT * FROM tournaments 
    ORDER BY start_time DESC
  `)
  return result.rows
}

export async function getTournamentById(id: string): Promise<TournamentWithPlayers | null> {
  const tournamentResult = await pool.query<Tournament>(`
    SELECT * FROM tournaments WHERE id = $1
  `, [id])

  if (tournamentResult.rows.length === 0) {
    return null
  }

  const tournament = tournamentResult.rows[0]

  const playersResult = await pool.query<Player>(`
    SELECT p.* 
    FROM users p
    JOIN tournament_registrations tr ON tr.player_id = p.id
    WHERE tr.tournament_id = $1
    ORDER BY tr.registered_at ASC
  `, [id])

  return {
    ...tournament,
    players: playersResult.rows
  }
} 