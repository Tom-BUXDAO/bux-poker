import { getSupabaseServerClient } from '../actions';

async function getPageData(id: string) {
  const supabase = await getSupabaseServerClient();
  
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (tournamentError) {
    console.error('Error fetching tournament:', tournamentError);
    return { tournament: null, user: null };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching user:', userError);
    return { tournament, user: null };
  }

  return { tournament, user };
} 