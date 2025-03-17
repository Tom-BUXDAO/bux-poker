import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getPool } from '@/lib/db';

export async function POST(request: Request) {
  const pool = getPool();
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tournamentId } = await request.json();
    if (!tournamentId) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }

    // Update the player's status to READY
    await pool.query(
      `UPDATE tournament_registrations 
       SET status = 'READY'
       WHERE tournament_id = $1 AND discord_id = $2`,
      [tournamentId, session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating player ready status:', error);
    return NextResponse.json(
      { error: 'Failed to update player status' },
      { status: 500 }
    );
  }
} 