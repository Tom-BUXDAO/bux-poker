import { createClient } from '@/lib/supabase-server';

export async function getTournamentById(tournamentId: string) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        players: tournament_registrations (
          user_id,
          username,
          discord_avatar_url,
          discord_id,
          status,
          final_position,
          chip_count,
          registration_time,
          table_number,
          seat_number
        )
      `)
      .eq('id', tournamentId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching tournament:', error);
    throw error;
  }
} 