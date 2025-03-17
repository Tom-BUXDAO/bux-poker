import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tournamentId = requestUrl.searchParams.get('tournament_id');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to tournament page if tournament_id is provided, otherwise to home
  const redirectUrl = tournamentId 
    ? `/tournament/${tournamentId}`
    : '/';

  return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin));
} 