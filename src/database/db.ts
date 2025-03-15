import { getPool } from './connection';
import fs from 'fs';
import path from 'path';

export async function initializeSchema() {
  const pool = getPool();
  const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  
  try {
    await pool.query(schemaSQL);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}

export async function createUser(discordId: string, username: string) {
  const pool = getPool();
  const query = `
    INSERT INTO users (discord_id, username)
    VALUES ($1, $2)
    ON CONFLICT (discord_id) 
    DO UPDATE SET username = $2
    RETURNING *;
  `;
  
  const result = await pool.query(query, [discordId, username]);
  return result.rows[0];
}

export async function createTournament(
  createdBy: string,
  startTime: Date,
  playersPerTable: number,
  startingChips: number,
  blindRoundMinutes: number,
  channelId: string
) {
  const pool = getPool();
  const query = `
    INSERT INTO tournaments (
      created_by, start_time, players_per_table,
      starting_chips, blind_round_minutes, discord_channel_id
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  
  const result = await pool.query(query, [
    createdBy,
    startTime,
    playersPerTable,
    startingChips,
    blindRoundMinutes,
    channelId
  ]);
  return result.rows[0];
}

export async function updateTournamentMessage(tournamentId: string, messageId: string) {
  const pool = getPool();
  const query = `
    UPDATE tournaments
    SET discord_message_id = $2
    WHERE id = $1
    RETURNING *;
  `;
  
  const result = await pool.query(query, [tournamentId, messageId]);
  return result.rows[0];
}

export async function registerPlayerForTournament(tournamentId: string, userId: string, discordId: string) {
  const pool = getPool();
  
  // Check if tournament is full
  const tournamentQuery = `
    SELECT t.*, COUNT(tr.user_id) as registered_players
    FROM tournaments t
    LEFT JOIN tournament_registrations tr ON t.id = t.id
    WHERE t.id = $1
    GROUP BY t.id;
  `;
  
  const tournamentResult = await pool.query(tournamentQuery, [tournamentId]);
  const tournament = tournamentResult.rows[0];
  
  if (!tournament) {
    throw new Error('Tournament not found');
  }
  
  if (tournament.registered_players >= tournament.players_per_table) {
    throw new Error('Tournament is full');
  }

  const query = `
    INSERT INTO tournament_registrations (tournament_id, user_id, discord_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (tournament_id, user_id) DO NOTHING
    RETURNING *;
  `;
  
  const result = await pool.query(query, [tournamentId, userId, discordId]);
  return result.rows[0];
}

export async function getTournamentById(tournamentId: string) {
  const pool = getPool();
  const query = `
    SELECT t.*, 
           COUNT(tr.user_id) as registered_players,
           json_agg(json_build_object(
             'user_id', u.id,
             'username', u.username,
             'discord_id', tr.discord_id,
             'status', tr.status
           )) as players
    FROM tournaments t
    LEFT JOIN tournament_registrations tr ON t.id = tr.tournament_id
    LEFT JOIN users u ON tr.user_id = u.id
    WHERE t.id = $1
    GROUP BY t.id;
  `;
  
  const result = await pool.query(query, [tournamentId]);
  return result.rows[0];
}

export async function updateTournamentStatus(tournamentId: string, status: string) {
  const pool = getPool();
  const query = `
    UPDATE tournaments
    SET status = $2
    WHERE id = $1
    RETURNING *;
  `;
  
  const result = await pool.query(query, [tournamentId, status]);
  return result.rows[0];
}

export async function getUpcomingTournaments() {
  const pool = getPool();
  const query = `
    SELECT t.*, COUNT(tr.user_id) as registered_players
    FROM tournaments t
    LEFT JOIN tournament_registrations tr ON t.id = tr.tournament_id
    WHERE t.status = 'PENDING' AND t.start_time > NOW()
    GROUP BY t.id
    ORDER BY t.start_time ASC;
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

export async function recordGameAction(
  gameId: string,
  userId: string,
  actionType: string,
  amount?: number
) {
  const pool = getPool();
  const query = `
    INSERT INTO player_actions (game_id, user_id, action_type, amount)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  
  const result = await pool.query(query, [gameId, userId, actionType, amount]);
  return result.rows[0];
}

export async function getPlayerStatistics(userId: string) {
  const pool = getPool();
  const query = `
    SELECT * FROM player_statistics WHERE id = $1;
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows[0];
} 