import { type NextRequest } from 'next/server';
import { Server } from 'socket.io';
import { type GameState, type PlayerAction } from '@/types/poker';

const io = new Server({
  cors: {
    origin: process.env.NEXTAUTH_URL,
    methods: ['GET', 'POST'],
  },
});

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  if (!io.httpServer) {
    // Initialize Socket.IO server
    io.attach(3001);
  }

  const { searchParams } = new URL(req.url);
  const tableId = searchParams.get('tableId');
  const playerId = searchParams.get('playerId');

  if (!tableId || !playerId) {
    return new Response('Missing tableId or playerId', { status: 400 });
  }

  const socket = await io.connectSocket(req);

  socket.join(`table:${tableId}`);
  
  socket.on('gameAction', (action: PlayerAction) => {
    io.to(`table:${tableId}`).emit('gameState', {
      type: 'gameState',
      ...action,
    });
  });

  socket.on('chat', (message: { playerId: string; message: string }) => {
    io.to(`table:${tableId}`).emit('chat', {
      ...message,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    socket.leave(`table:${tableId}`);
  });

  return new Response(null, {
    status: 101,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
    },
  });
} 