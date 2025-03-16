import { getPool } from './connection';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function initializeSchema() {
  const pool = getPool();
  const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  
  try {
    // Force drop all tables first
    await pool.query(`
      DROP TABLE IF EXISTS player_actions CASCADE;
      DROP TABLE IF EXISTS game_history CASCADE;
      DROP TABLE IF EXISTS tournament_registrations CASCADE;
      DROP TABLE IF EXISTS tournaments CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP VIEW IF EXISTS player_statistics CASCADE;
    `);
    
    // Then create tables
    await pool.query(schemaSQL);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}

export async function createUser(discordId: string, username: string, avatarUrl?: string) {
  const pool = getPool();
  const query = `
    INSERT INTO users (discord_id, username, discord_avatar_url)
    VALUES ($1, $2, $3)
    ON CONFLICT (discord_id) 
    DO UPDATE SET username = $2, discord_avatar_url = $3
    RETURNING *;
  `;
  
  const result = await pool.query(query, [discordId, username, avatarUrl]);
  return result.rows[0];
}

export async function createTournament(
  creatorId: string,
  startTime: Date,
  playersPerTable: number,
  startingChips: number,
  blindRoundMinutes: number,
  channelId: string,
  maxPlayers: number = 100
) {
  const pool = getPool();
  const query = `
    INSERT INTO tournaments (
      id, 
      created_by, 
      start_time, 
      players_per_table, 
      starting_chips, 
      blind_round_minutes,
      discord_channel_id,
      max_players,
      status
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const id = crypto.randomUUID();
  const result = await pool.query(query, [
    id,
    creatorId,
    startTime,
    playersPerTable,
    startingChips,
    blindRoundMinutes,
    channelId,
    maxPlayers,
    'pending'
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
    LEFT JOIN tournament_registrations tr ON t.id = tr.tournament_id
    WHERE t.id = $1
    GROUP BY t.id;
  `;
  
  const tournamentResult = await pool.query(tournamentQuery, [tournamentId]);
  const tournament = tournamentResult.rows[0];
  
  if (!tournament) {
    throw new Error('Tournament not found');
  }
  
  if (tournament.registered_players >= tournament.max_players) {
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
             'discord_avatar_url', u.discord_avatar_url,
             'status', tr.status,
             'registration_time', tr.registration_time,
             'table_number', tr.table_number,
             'seat_number', tr.seat_number,
             'final_position', tr.final_position
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
    SELECT t.*, 
           COUNT(tr.user_id) as registered_players
    FROM tournaments t
    LEFT JOIN tournament_registrations tr ON t.id = tr.tournament_id
    WHERE t.status = 'PENDING' AND t.start_time > NOW()
    GROUP BY t.id, t.created_by, t.discord_channel_id, t.discord_message_id, 
             t.start_time, t.players_per_table, t.starting_chips, 
             t.blind_round_minutes, t.max_players, t.status, t.created_at
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
    SELECT 
      u.*,
      COUNT(DISTINCT tr.tournament_id) as tournaments_played,
      COUNT(CASE WHEN tr.status = 'WINNER' THEN 1 END) as tournaments_won,
      COALESCE(AVG(tr.final_position), 0) as avg_final_position
    FROM users u
    LEFT JOIN tournament_registrations tr ON u.id = tr.user_id
    WHERE u.id = $1
    GROUP BY u.id;
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows[0];
}

export async function unregisterPlayerFromTournament(tournamentId: string, discordId: string) {
  const pool = getPool();
  
  // First get the user ID from discord_id
  const userQuery = `SELECT id FROM users WHERE discord_id = $1`;
  const userResult = await pool.query(userQuery, [discordId]);
  
  if (userResult.rows.length === 0) {
    return false; // User not found
  }
  
  const userId = userResult.rows[0].id;
  
  // Delete the registration
  const query = `
    DELETE FROM tournament_registrations 
    WHERE tournament_id = $1 AND user_id = $2
    RETURNING *;
  `;
  
  const result = await pool.query(query, [tournamentId, userId]);
  return result.rows.length > 0;
}

export async function isRegistered(tournamentId: string, discordId: string) {
  const pool = getPool();
  const query = `
    SELECT tr.* 
    FROM tournament_registrations tr
    JOIN users u ON tr.user_id = u.id
    WHERE tr.tournament_id = $1 AND u.discord_id = $2;
  `;
  
  const result = await pool.query(query, [tournamentId, discordId]);
  return result.rows.length > 0;
}