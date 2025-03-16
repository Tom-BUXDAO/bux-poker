import { createServerSupabaseClient } from './supabase-server';

export async function getTournamentById(id: string) {
  const supabase = await createServerSupabaseClient();
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
  const supabase = await createServerSupabaseClient();
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