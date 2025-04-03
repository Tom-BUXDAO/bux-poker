import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const defaultStats = {
  gamesPlayed: 0,
  topThreeFinishes: 0,
  averageFinalPosition: 0,
  handsPlayed: 0,
  handsWon: 0,
  preflopFoldPercentage: 0,
  flopFoldPercentage: 0,
  turnFoldPercentage: 0,
  riverFoldPercentage: 0,
  noFoldPercentage: 0,
  winPercentageWhenNoFold: 0
};

export async function GET(
  request: Request,
  { params }: { params: { playerId: string } }
) {
  try {
    // Await the params to fix the Next.js warning
    const playerId = await Promise.resolve(params.playerId);
    console.log('API: Received request for player ID:', playerId);

    if (!playerId) {
      console.error('API: No player ID provided in request');
      return NextResponse.json(defaultStats, { status: 200 });
    }

    // Check for database connection
    if (!process.env.DATABASE_URL) {
      console.error('API: Missing database connection string');
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    // Configure @vercel/postgres to use DATABASE_URL
    process.env.POSTGRES_URL = process.env.DATABASE_URL;

    // Query player stats directly using Discord ID
    console.log('API: Querying player_stats_view for Discord ID:', playerId);
    const statsResult = await sql`
      SELECT 
        psv.gamesplayed,
        psv.topthreefinishes,
        psv.average_final_position,
        psv.handsplayed,
        psv.handswon,
        psv.preflop_fold_percentage,
        psv.flop_fold_percentage,
        psv.turn_fold_percentage,
        psv.river_fold_percentage,
        psv.no_fold_percentage,
        psv.showdown_win_percentage
      FROM player_stats_view psv
      JOIN players p ON p.id = psv.id
      WHERE p."discordId" = ${playerId}
    `;
    console.log('API: Stats query result:', statsResult.rows);

    if (statsResult.rows.length === 0) {
      console.log('API: No stats found for Discord ID:', playerId);
      return NextResponse.json(defaultStats, { status: 200 });
    }

    const stats = statsResult.rows[0];
    console.log('API: Returning stats for player:', stats);
    
    return NextResponse.json({
      gamesPlayed: stats.gamesplayed || 0,
      topThreeFinishes: stats.topthreefinishes || 0,
      averageFinalPosition: stats.average_final_position || 0,
      handsPlayed: stats.handsplayed || 0,
      handsWon: stats.handswon || 0,
      preflopFoldPercentage: stats.preflop_fold_percentage || 0,
      flopFoldPercentage: stats.flop_fold_percentage || 0,
      turnFoldPercentage: stats.turn_fold_percentage || 0,
      riverFoldPercentage: stats.river_fold_percentage || 0,
      noFoldPercentage: stats.no_fold_percentage || 0,
      winPercentageWhenNoFold: stats.showdown_win_percentage || 0
    });
  } catch (error) {
    console.error('API Error:', error);
    // Log the full error details
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(defaultStats, { status: 200 });
  }
} 