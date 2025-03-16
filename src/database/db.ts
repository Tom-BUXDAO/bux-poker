import crypto from 'crypto';
import { supabase } from './supabase';

export async function initializeSchema() {
  // No need for schema initialization with Supabase
  // The schema is managed through Supabase's interface
  console.log('Schema initialization not needed with Supabase');
}

export async function createUser(discordId: string, username: string, avatarUrl?: string) {
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', discordId)
    .single();

  if (existingUser) {
    // Update the existing user if needed
    const { data, error } = await supabase
      .from('users')
      .update({
        username: username,
        discord_avatar_url: avatarUrl
      })
      .eq('discord_id', discordId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }

    return data;
  }

  // Create new user
  const { data, error } = await supabase
    .from('users')
    .insert({
      discord_id: discordId,
      username: username,
      discord_avatar_url: avatarUrl
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return data;
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
  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      created_by: creatorId,
      start_time: startTime.toISOString(),
      players_per_table: playersPerTable,
      starting_chips: startingChips,
      blind_round_minutes: blindRoundMinutes,
      discord_channel_id: channelId,
      max_players: maxPlayers,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }

  return data;
}

export async function updateTournamentMessage(tournamentId: string, messageId: string) {
  const { data, error } = await supabase
    .from('tournaments')
    .update({ discord_message_id: messageId })
    .eq('id', tournamentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating tournament message:', error);
    throw error;
  }

  return data;
}

export async function registerPlayerForTournament(tournamentId: string, userId: string, discordId: string) {
  // First check if tournament is full
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('*, tournament_registrations(*)')
    .eq('id', tournamentId)
    .single();

  if (tournamentError) {
    console.error('Error fetching tournament:', tournamentError);
    throw tournamentError;
  }

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const registeredPlayers = tournament.tournament_registrations?.length || 0;
  if (registeredPlayers >= tournament.max_players) {
    throw new Error('Tournament is full');
  }

  const { data, error } = await supabase
    .from('tournament_registrations')
    .insert({
      tournament_id: tournamentId,
      user_id: userId,
      discord_id: discordId
    })
    .select()
    .single();

  if (error) {
    console.error('Error registering player:', error);
    throw error;
  }

  return data;
}

export async function getTournamentById(tournamentId: string) {
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      tournament_registrations (
        *,
        users (*)
      )
    `)
    .eq('id', tournamentId)
    .single();

  if (error) {
    console.error('Error fetching tournament:', error);
    throw error;
  }

  if (!tournament) return null;

  return {
    ...tournament,
    players: tournament.tournament_registrations?.map((reg: any) => ({
      user_id: reg.user_id,
      username: reg.users?.username,
      discord_id: reg.users?.discord_id,
      discord_avatar_url: reg.users?.discord_avatar_url,
      status: reg.status,
      registration_time: reg.registration_time,
      table_number: reg.table_number,
      seat_number: reg.seat_number,
      final_position: reg.final_position,
      chip_count: reg.chip_count
    }))
  };
}

export async function updateTournamentStatus(tournamentId: string, status: string) {
  const { data, error } = await supabase
    .from('tournaments')
    .update({ status })
    .eq('id', tournamentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating tournament status:', error);
    throw error;
  }

  return data;
}

export async function getUpcomingTournaments() {
  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      tournament_registrations (*)
    `)
    .eq('status', 'PENDING')
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming tournaments:', error);
    throw error;
  }

  return data.map(tournament => ({
    ...tournament,
    registered_players: tournament.tournament_registrations?.length || 0
  }));
}

export async function isRegistered(tournamentId: string, discordId: string) {
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('*, users!inner(*)')
    .eq('tournament_id', tournamentId)
    .eq('users.discord_id', discordId);

  if (error) {
    console.error('Error checking registration:', error);
    throw error;
  }

  return data.length > 0;
}

export async function unregisterPlayerFromTournament(tournamentId: string, discordId: string) {
  // First get the user ID from discord_id
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('discord_id', discordId)
    .single();

  if (userError || !user) {
    console.error('Error finding user:', userError);
    return false;
  }

  // Delete the registration
  const { error: deleteError } = await supabase
    .from('tournament_registrations')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Error unregistering player:', deleteError);
    return false;
  }

  return true;
}