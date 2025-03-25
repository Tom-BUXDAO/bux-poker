import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';

interface Player {
  id: string;
  position: number;
  chips: number;
  isActive: boolean;
  isCurrent: boolean;
  disconnectedAt?: number;
}

interface GameState {
  players: Player[];
  communityCards: any[];
  pot: number;
  currentBet: number;
  currentPosition: number;
}

interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: Date;
}

// Store the game state
const gameStates = new Map<string, GameState>();
const connections = new Map<string, Map<string, WebSocket>>();
const disconnectionTimers = new Map<string, Map<string, NodeJS.Timeout>>();

// Create HTTP server
const httpServer = createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer });

// Cleanup disconnected players after grace period
const DISCONNECTION_GRACE_PERIOD = 30000; // 30 seconds
const MAX_PLAYERS_PER_TABLE = 8;

function cleanupDisconnectedPlayer(tableId: string, playerId: string) {
  const gameState = gameStates.get(tableId);
  if (!gameState) return;

  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return;

  // Remove player from game state
  gameState.players = gameState.players.filter(p => p.id !== playerId);
  
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

// Helper function to find the next available position
function findNextPosition(players: Player[]): number | null {
  const takenPositions = new Set(players.map(p => p.position));
  for (let i = 1; i <= MAX_PLAYERS_PER_TABLE; i++) {
    if (!takenPositions.has(i)) {
      return i;
    }
  }
  return null;
}

wss.on('connection', (ws, req) => {
  const { query } = parse(req.url || '', true);
  const tableId = Array.isArray(query.tableId) ? query.tableId[0] : query.tableId;
  const playerId = Array.isArray(query.playerId) ? query.playerId[0] : query.playerId;

  console.log(`Player ${playerId} attempting to connect to table ${tableId}`);

  if (!tableId || !playerId) {
    ws.close();
    return;
  }

  // Get game state first to check table capacity
  const gameState = gameStates.get(tableId);
  if (gameState) {
    const activePlayers = gameState.players.filter(p => p.isActive);
    const existingPlayer = gameState.players.find(p => p.id === playerId);
    
    // If player is not already in the game and table is full, reject connection
    if (!existingPlayer && activePlayers.length >= MAX_PLAYERS_PER_TABLE) {
      console.log(`Table ${tableId} is full (${activePlayers.length}/${MAX_PLAYERS_PER_TABLE}), rejecting player ${playerId}`);
      ws.close(1000, 'Table is full');
      return;
    }
  }

  // Check for existing connection and close it
  const existingConnection = connections.get(tableId)?.get(playerId);
  if (existingConnection) {
    console.log(`Closing existing connection for player ${playerId}`);
    existingConnection.close(1000, 'New connection established');
  }

  // Clear any existing disconnection timer
  const disconnectionTimer = disconnectionTimers.get(tableId)?.get(playerId);
  if (disconnectionTimer) {
    clearTimeout(disconnectionTimer);
    disconnectionTimers.get(tableId)?.delete(playerId);
  }

  // Store connection
  if (!connections.has(tableId)) {
    connections.set(tableId, new Map());
  }
  connections.get(tableId)?.set(playerId, ws);

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

  // Add player to the game or reactivate if they were disconnected
  if (gameState) {
    const existingPlayer = gameState.players.find(p => p.id === playerId);

    if (existingPlayer) {
      // Reactivate player if they were inactive
      if (!existingPlayer.isActive) {
        existingPlayer.isActive = true;
        delete existingPlayer.disconnectedAt;
        console.log(`Reactivating player ${playerId} at position ${existingPlayer.position}`);
        
        // Broadcast player rejoined
        broadcastToTable(tableId, {
          type: 'playerJoined',
          payload: { id: playerId },
        });
      }
    } else {
      // Find next available position
      const nextPosition = findNextPosition(gameState.players);
      if (nextPosition === null) {
        console.log(`No positions available on table ${tableId} for player ${playerId}`);
        ws.close(1000, 'No positions available');
        return;
      }

      // Add new player
      const newPlayer = {
        id: playerId,
        position: nextPosition,
        chips: 1000,
        isActive: true,
        isCurrent: false,
      };
      gameState.players.push(newPlayer);
      console.log(`Added new player ${playerId} at position ${nextPosition}`);

      // Broadcast player joined
      broadcastToTable(tableId, {
        type: 'playerJoined',
        payload: { id: playerId },
      });
    }

    // Send initial game state
    const message = {
      type: 'gameState',
      payload: gameState,
    };
    ws.send(JSON.stringify(message));
  }

  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      
      if (message.type === 'playerAction') {
        handlePlayerAction(tableId, message.payload);
      }

      if (message.type === 'chat') {
        handleChatMessage(tableId, message.payload);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  });

  // Handle disconnection
  ws.on('close', (code, reason) => {
    console.log(`Player ${playerId} disconnected from table ${tableId} (${code}: ${reason})`);
    const gameState = gameStates.get(tableId);
    if (gameState) {
      const player = gameState.players.find(p => p.id === playerId);
      if (player) {
        // Only mark as inactive and set up cleanup if it wasn't a clean closure
        if (code !== 1000) {
          player.isActive = false;
          player.disconnectedAt = Date.now();

          // Set up disconnection timer
          if (!disconnectionTimers.has(tableId)) {
            disconnectionTimers.set(tableId, new Map());
          }
          disconnectionTimers.get(tableId)?.set(
            playerId,
            setTimeout(() => cleanupDisconnectedPlayer(tableId, playerId), DISCONNECTION_GRACE_PERIOD)
          );

          // Broadcast updated game state
          broadcastToTable(tableId, {
            type: 'gameState',
            payload: gameState,
          });
        }
      }
    }

    // Clean up connection
    connections.get(tableId)?.delete(playerId);
    if (connections.get(tableId)?.size === 0) {
      connections.delete(tableId);
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

function handleChatMessage(tableId: string, message: ChatMessage) {
  // Broadcast the chat message to all players at the table
  broadcastToTable(tableId, {
    type: 'chat',
    payload: message
  });
}

const port = parseInt(process.env.SOCKET_PORT || '3001', 10);
httpServer.listen(port, () => {
  console.log(`WebSocket server running on port ${port}`);
}); 