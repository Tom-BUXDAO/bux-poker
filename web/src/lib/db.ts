import { createClient } from './supabase-server';

export async function getTournamentById(id: string) {
  const supabase = await createClient();
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('*, tournament_registrations(*, users(*))')
    .eq('id', id)
    .single();

  if (tournamentError) {
    console.error('Error fetching tournament:', tournamentError);
    return null;
  }

  if (!tournament) return null;

  // Transform the data to match the expected format
  return {
    ...tournament,
    players: tournament.tournament_registrations?.map(reg => ({
      user_id: reg.user_id,
      username: reg.users?.username,
      discord_id: reg.users?.discord_id,
      discord_avatar_url: reg.users?.discord_avatar_url,
      registration_time: reg.registration_time,
      chip_count: reg.chip_count,
      final_position: reg.final_position
    }))
  };
}

export async function getTournaments() {
  const supabase = await createClient();
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('*, tournament_registrations(*)');

  if (error) {
    console.error('Error fetching tournaments:', error);
    return [];
  }

  return tournaments.map(tournament => ({
    ...tournament,
    registered_players: tournament.tournament_registrations?.length || 0
  }));
}

export async function createTournament(data: {
  start_time: Date;
  max_players: number;
  players_per_table: number;
  starting_chips: number;
  blind_round_minutes: number;
  status: string;
  created_by: string;
}) {
  const supabase = await createClient();
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Error creating tournament:', error);
    return null;
  }

  return tournament;
}

export async function registerPlayerForTournament(
  tournamentId: string,
  userId: string,
  username: string,
  avatarUrl?: string
) {
  const supabase = await createClient();

  // First, ensure the user exists in the users table
  const { error: userError } = await supabase
    .from('users')
    .upsert({
      discord_id: userId,
      username,
      discord_avatar_url: avatarUrl
    });

  if (userError) {
    console.error('Error upserting user:', userError);
    return false;
  }

  // Then register them for the tournament
  const { error: registrationError } = await supabase
    .from('tournament_registrations')
    .insert([{
      tournament_id: tournamentId,
      user_id: userId,
      registration_time: new Date().toISOString()
    }]);

  if (registrationError) {
    console.error('Error registering player:', registrationError);
    return false;
  }

  return true;
}

export async function unregisterPlayerFromTournament(
  tournamentId: string,
  userId: string
) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('tournament_registrations')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error unregistering player:', error);
    return false;
  }

  return true;
}

export async function getPool() {
  // This is just a compatibility function for any code still using the old pg Pool
  // It will be removed once all code is migrated to use Supabase directly
  return {
    query: async (text: string, params: any[]) => {
      console.warn('Using deprecated getPool() function. Please migrate to Supabase client.');
      return { rows: [] };
    }
  };
} 