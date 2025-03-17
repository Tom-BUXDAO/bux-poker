import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set in environment variables');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for some cloud database providers
      },
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 2000, // How long to wait for a connection
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
}

export async function getTournamentById(tournamentId: string) {
  const pool = await getPool();
  const query = `
    SELECT 
      t.*,
      COALESCE(
        json_agg(
          json_build_object(
            'user_id', u.id,
            'username', u.username,
            'discord_avatar_url', u.discord_avatar_url,
            'discord_id', u.discord_id,
            'status', tr.status,
            'final_position', tr.final_position,
            'chip_count', tr.chip_count,
            'registration_time', tr.registration_time,
            'table_number', tr.table_number,
            'seat_number', tr.seat_number
          )
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'
      ) as players
    FROM tournaments t
    LEFT JOIN tournament_registrations tr ON t.id = tr.tournament_id
    LEFT JOIN users u ON tr.user_id = u.id
    WHERE t.id = $1
    GROUP BY t.id;
  `;
  
  try {
    const result = await pool.query(query, [tournamentId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching tournament:', error);
    throw error;
  }
}

// Create tables if they don't exist
const pool = await getPool();
await pool.query(`
  // ... existing code ...
`); 