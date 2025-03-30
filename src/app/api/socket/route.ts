import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'WebSocket server is running on port 3001',
    status: 'ok' 
  });
}

export const runtime = 'nodejs'; 