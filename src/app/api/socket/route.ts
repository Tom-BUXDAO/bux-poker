import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { parse } from 'url';

// Store the game state
const gameStates = new Map();
const connections = new Map();

// Create HTTP server
const httpServer = createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const { query } = parse(req.url || '', true);
  const { tableId, playerId } = query;

  if (!tableId || !playerId) {
    ws.close();
    return;
  }

  // Store connection
  if (!connections.has(tableId)) {
    connections.set(tableId, new Map());
  }
  connections.get(tableId).set(playerId, ws);

  // Initialize game state if it doesn't exist
  if (!gameStates.has(tableId)) {
    gameStates.set(tableId, {
      players: [],
      communityCards: [],
      pot: 0,
      currentBet: 0,
      currentPosition: 0,
    });
  }

  // Add player to the game
  const gameState = gameStates.get(tableId);
  const playerExists = gameState.players.find((p: any) => p.id === playerId);

  if (!playerExists) {
    gameState.players.push({
      id: playerId,
      position: gameState.players.length + 1,
      chips: 1000,
      isActive: true,
      isCurrent: false,
    });
  }

  // Send initial game state
  const message = {
    type: 'gameState',
    payload: gameState,
  };
  ws.send(JSON.stringify(message));

  // Broadcast player joined
  broadcastToTable(tableId, {
    type: 'playerJoined',
    payload: { id: playerId },
  });

  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'playerAction') {
        handlePlayerAction(tableId, message.payload);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    const gameState = gameStates.get(tableId);
    if (gameState) {
      gameState.players = gameState.players.filter((p: any) => p.id !== playerId);
      
      // Remove connection
      connections.get(tableId)?.delete(playerId);
      if (connections.get(tableId)?.size === 0) {
        connections.delete(tableId);
      }

      // Broadcast player left and updated game state
      broadcastToTable(tableId, {
        type: 'playerLeft',
        payload: playerId,
      });
      broadcastToTable(tableId, {
        type: 'gameState',
        payload: gameState,
      });
    }
  });
});

function broadcastToTable(tableId: string, message: any) {
  const tableConnections = connections.get(tableId);
  if (!tableConnections) return;

  const messageStr = JSON.stringify(message);
  for (const ws of tableConnections.values()) {
    ws.send(messageStr);
  }
}

function handlePlayerAction(tableId: string, payload: any) {
  const { action, playerId } = payload;
  const gameState = gameStates.get(tableId);
  
  if (!gameState) return;

  // TODO: Implement game logic
  console.log(`Player ${playerId} action:`, action);

  // Broadcast updated game state
  broadcastToTable(tableId, {
    type: 'gameState',
    payload: gameState,
  });
}

const port = parseInt(process.env.SOCKET_PORT || '3001', 10);
httpServer.listen(port, () => {
  console.log(`WebSocket server running on port ${port}`);
});

export async function GET(req: Request) {
  return new Response('WebSocket server is running', { status: 200 });
}

export const runtime = 'nodejs'; 