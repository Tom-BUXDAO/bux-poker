import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { parse } from 'url';
import type { WebSocketMessage, Player } from '@/types/poker';

// Store the game state
const gameStates = new Map();
const connections = new Map();

// Create HTTP server
const httpServer = createServer((req, res) => {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  res.writeHead(200);
  res.end('WebSocket server is running');
});

// Create WebSocket server
const wss = new WebSocketServer({ 
  server: httpServer,
  verifyClient: ({ req }, done) => {
    // Allow all connections
    done(true);
  }
});

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  const { query } = parse(req.url || '', true);
  const tableId = Array.isArray(query.tableId) ? query.tableId[0] : query.tableId;
  const playerId = Array.isArray(query.playerId) ? query.playerId[0] : query.playerId;
  const playerDataStr = Array.isArray(query.playerData) ? query.playerData[0] : query.playerData;

  console.log('Connection params:', { tableId, playerId, playerDataStr });

  if (!tableId || !playerId) {
    console.log('Missing required params, closing connection');
    ws.close();
    return;
  }

  let playerData: Partial<Player> = { id: playerId };
  try {
    if (playerDataStr) {
      const parsed = JSON.parse(decodeURIComponent(playerDataStr));
      playerData = { ...playerData, ...parsed };
      console.log('Parsed player data:', playerData);
    }
  } catch (error) {
    console.error('Failed to parse player data:', error);
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
      smallBlind: 10,
      bigBlind: 20,
      status: 'waiting',
      phase: 'pre-flop',
      roundComplete: false,
    });
  }

  // Add player to the game
  const gameState = gameStates.get(tableId);
  const playerExists = gameState.players.find((p: Player) => p.id === playerId);

  if (!playerExists) {
    gameState.players.push({
      ...playerData,
      position: gameState.players.length + 1,
      isActive: true,
      isCurrent: false,
      isDealer: false,
      cards: [],
      currentBet: 0,
      totalBet: 0,
      folded: false,
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
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      console.log(`Received message from ${playerId}:`, message);
      
      if (message.type === 'playerAction') {
        handlePlayerAction(tableId, message.payload);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log(`Player ${playerId} disconnected from table ${tableId}`);
    const gameState = gameStates.get(tableId);
    if (gameState) {
      gameState.players = gameState.players.filter((p: Player) => p.id !== playerId);
      
      // Remove connection
      connections.get(tableId)?.delete(playerId);
      if (connections.get(tableId)?.size === 0) {
        connections.delete(tableId);
      }

      // Broadcast player left and updated game state
      broadcastToTable(tableId, {
        type: 'playerLeft',
        payload: { id: playerId },
      });
      broadcastToTable(tableId, {
        type: 'gameState',
        payload: gameState,
      });
    }
  });
});

function broadcastToTable(tableId: string, message: WebSocketMessage) {
  const tableConnections = connections.get(tableId);
  if (!tableConnections) return;

  const messageStr = JSON.stringify(message);
  for (const ws of tableConnections.values()) {
    ws.send(messageStr);
  }
}

function handlePlayerAction(tableId: string, payload: Record<string, unknown>) {
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
  return new Response('WebSocket server is running', { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export const runtime = 'nodejs'; 