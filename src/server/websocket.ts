import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import {
  GameState,
  Player,
  ChatMessage,
  PlayerAction,
  TablePosition,
  PLAYER_ACTIONS
} from '@/types/poker';
import {
  createDeck,
  dealCards,
  validatePlayerAction,
  isBettingRoundComplete,
  moveToNextPhase,
  findNextActivePlayer
} from '@/lib/poker/game-logic';
import type { WebSocketMessage, WebSocketPayload } from '@/types/poker';
import { syncTestTournament, syncGameState, syncPlayerState } from '@/lib/tournament/db-sync';
import { IncomingMessage, ServerResponse } from 'http';
import { TournamentStatus, TableStatus } from '@prisma/client';

// Extend WebSocket type to include isAlive
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  tableId?: string;
  playerId?: string;
}

// Store the game state
const gameStates = new Map<string, GameState>();
const connections = new Map<string, Map<string, WebSocket>>();
const disconnectionTimers = new Map<string, Map<string, NodeJS.Timeout>>();

// Constants
const DISCONNECTION_GRACE_PERIOD = 30000; // 30 seconds
const MAX_PLAYERS_PER_TABLE = 8;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 35000; // 35 seconds
const ACTION_TIMEOUT = 30000; // 30 seconds

// Create HTTP server with request handler
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  console.log('Received HTTP request:', req.method, req.url);
  console.log('Headers:', req.headers);
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Upgrade, Connection');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle WebSocket upgrade requests
  if (req.headers.upgrade?.toLowerCase() === 'websocket') {
    console.log('WebSocket upgrade request received');
    console.log('Upgrade headers:', {
      upgrade: req.headers.upgrade,
      connection: req.headers.connection,
      'sec-websocket-key': req.headers['sec-websocket-key']
    });
    return;
  }

  // Health check endpoint
  if (req.url === '/health') {
    console.log('Health check request');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok',
      connections: wss.clients.size,
      uptime: process.uptime()
    }));
    return;
  }

  // Handle all other requests
  console.log('Unknown request type');
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Create WebSocket server with more robust configuration
const wss = new WebSocketServer({ 
  server: httpServer,
  clientTracking: true,
  perMessageDeflate: false, // Disable per-message deflate to reduce latency
  verifyClient: async (info, callback) => {
    console.log('Received connection request:', info.req.url);
    const { url } = info.req;
    if (!url) {
      console.log('Rejected connection: Missing URL');
      callback(false, 400, 'Missing URL');
      return;
    }

    const { query } = parse(url, true);
    console.log('Parsed query parameters:', query);
    
    try {
      // Decode and validate parameters
      const tableId = decodeURIComponent(query.tableId as string);
      const playerId = decodeURIComponent(query.playerId as string);
      const playerData = query.playerData ? JSON.parse(decodeURIComponent(query.playerData as string)) : undefined;

      if (!tableId || !playerId) {
        console.log('Rejected connection: Missing tableId or playerId', { tableId, playerId });
        callback(false, 400, 'Missing tableId or playerId');
        return;
      }

      console.log('Verified client connection:', { tableId, playerId, playerData });
      callback(true);
    } catch (error) {
      console.error('Error parsing connection parameters:', error);
      callback(false, 400, 'Invalid connection parameters');
    }
  }
});

// Helper function to find the next available position
function findNextPosition(players: Player[]): TablePosition | null {
  const takenPositions = new Set(players.map((p: Player) => p.position ?? 0));
  console.log('Current taken positions:', Array.from(takenPositions));
  
  // Filter out invalid positions
  const validPositions = new Set(
    Array.from(takenPositions)
      .filter((pos): pos is TablePosition => 
        typeof pos === 'number' && pos >= 1 && pos <= MAX_PLAYERS_PER_TABLE
      )
  );
  console.log('Valid taken positions:', Array.from(validPositions));
  
  // Find the first available position
  for (let i = 1; i <= MAX_PLAYERS_PER_TABLE; i++) {
    const position = i as TablePosition;
    if (!validPositions.has(position)) {
      console.log(`Assigning position ${position} to new player`);
      return position;
    }
  }
  console.log('No available positions found');
  return null;
}

function cleanupDisconnectedPlayer(tableId: string, playerId: string) {
  const gameState = gameStates.get(tableId);
  if (!gameState) return;

  const player = gameState.players.find((p: Player) => p.id === playerId);
  if (!player) return;

  // Remove player from game state
  gameState.players = gameState.players.filter((p: Player) => p.id !== playerId);
  
  // Remove connection
  connections.get(tableId)?.delete(playerId);
  if (connections.get(tableId)?.size === 0) {
    connections.delete(tableId);
  }

  // Broadcast player left and updated game state
  broadcastToTable(tableId, {
    type: 'playerLeft',
    payload: { playerId }
  });
  broadcastToTable(tableId, {
    type: 'gameState',
    payload: gameState
  });
}

function handleGameStart(tableId: string) {
  const gameState = gameStates.get(tableId);
  if (!gameState) return;

  const activePlayers = gameState.players.filter((p: Player) => p.isActive);
  if (activePlayers.length < 2) return;

  // Initialize game state
  gameState.status = 'playing';
  gameState.phase = 'pre-flop';
  gameState.pot = 0;
  gameState.currentBet = 0;
  gameState.smallBlind = 10;
  gameState.bigBlind = 20;
  gameState.minRaise = gameState.bigBlind;
  gameState.lastRaise = 0;
  gameState.communityCards = [];
  gameState.deck = createDeck();
  gameState.roundComplete = false;

  // Randomly select dealer
  const dealerIndex = Math.floor(Math.random() * activePlayers.length);
  const dealerPosition = activePlayers[dealerIndex].position;
  gameState.dealerPosition = dealerPosition;

  // Reset all player states
  gameState.players.forEach((player: Player) => {
    player.currentBet = 0;
    player.totalBetThisRound = 0;
    player.cards = [];
    player.hasActed = false;
    player.isDealer = player.position === dealerPosition;
    player.isActive = true;
    player.isCurrent = false;
  });

  // Get players in clockwise order
  const orderedPlayers = [...activePlayers]
    .filter(p => typeof p.position === 'number')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const dealerIdx = orderedPlayers.findIndex(p => p.position === dealerPosition);
  
  // Announce dealer
  const dealerPlayer = orderedPlayers[dealerIdx];
  broadcastToTable(tableId, {
    type: 'chat',
    payload: {
      playerId: 'system',
      message: `${dealerPlayer.name} is the dealer`,
      timestamp: new Date()
    }
  });

  // Post blinds
  const sbIdx = (dealerIdx + 1) % orderedPlayers.length;
  const sbPlayer = orderedPlayers[sbIdx];
  sbPlayer.chips -= gameState.smallBlind;
  sbPlayer.currentBet = gameState.smallBlind;
  sbPlayer.totalBetThisRound = gameState.smallBlind;
  gameState.pot += gameState.smallBlind;

  broadcastToTable(tableId, {
    type: 'chat',
    payload: {
      playerId: 'system',
      message: `${sbPlayer.name} posts small blind of ${gameState.smallBlind}`,
      timestamp: new Date()
    }
  });

  const bbIdx = (sbIdx + 1) % orderedPlayers.length;
  const bbPlayer = orderedPlayers[bbIdx];
  bbPlayer.chips -= gameState.bigBlind;
  bbPlayer.currentBet = gameState.bigBlind;
  bbPlayer.totalBetThisRound = gameState.bigBlind;
  gameState.pot += gameState.bigBlind;
  gameState.currentBet = gameState.bigBlind;

  broadcastToTable(tableId, {
    type: 'chat',
    payload: {
      playerId: 'system',
      message: `${bbPlayer.name} posts big blind of ${gameState.bigBlind}`,
      timestamp: new Date()
    }
  });

  // Deal cards
  dealCards(gameState);
  broadcastToTable(tableId, {
    type: 'chat',
    payload: {
      playerId: 'system',
      message: 'Dealing cards to all players',
      timestamp: new Date()
    }
  });

  // First to act is UTG (next after BB)
  const firstToActIdx = (bbIdx + 1) % orderedPlayers.length;
  const firstToActPlayer = orderedPlayers[firstToActIdx];
  if (firstToActPlayer.position) {
    gameState.currentPosition = firstToActPlayer.position;
    firstToActPlayer.isCurrent = true;
  }

  // Broadcast game state
  broadcastToTable(tableId, {
    type: 'gameState',
    payload: gameState
  });
}

interface PlayerActionPayload {
  type: PlayerAction;
  playerId: string;
  amount?: number;
  timestamp: Date;
}

function isValidPlayerAction(payload: any): payload is PlayerActionPayload {
  const hasValidObject = typeof payload === 'object' && payload !== null;
  const hasValidPlayerId = typeof payload.playerId === 'string';
  const hasValidType = typeof payload.type === 'string' && PLAYER_ACTIONS.includes(payload.type);
  const hasValidAmount = !payload.amount || typeof payload.amount === 'number';
  const hasValidTimestamp = !payload.timestamp || payload.timestamp instanceof Date;

  console.log('Validating player action:', payload);
  console.log('Validation result:', {
    hasValidObject,
    hasValidPlayerId,
    hasValidType,
    hasValidAmount,
    hasValidTimestamp
  });

  return hasValidObject && hasValidPlayerId && hasValidType;
}

function handlePlayerAction(tableId: string, payload: PlayerActionPayload) {
  const gameState = gameStates.get(tableId);
  if (!gameState) {
    console.error('No game state found for table:', tableId);
    return;
  }

  const { type: action, playerId, amount } = payload;
  const player = gameState.players.find((p: Player) => p.id === playerId);
  
  if (!player) {
    console.error('Player not found:', playerId);
    return;
  }

  if (!player.isCurrent) {
    console.error('Not player\'s turn:', playerId, 'Current position:', gameState.currentPosition, 'Player position:', player.position);
    return;
  }

  // Validate action
  const validation = validatePlayerAction(gameState, playerId, action, amount);
  if (!validation.isValid) {
    console.error('Invalid action:', validation.error);
    // Send error to player
    const playerConnection = connections.get(tableId)?.get(playerId);
    if (playerConnection) {
      playerConnection.send(JSON.stringify({
        type: 'error',
        payload: validation.error
      }));
    }
    return;
  }

  console.log(`Processing ${action} action for player ${playerId}`);

  // Process the action
  switch (action) {
    case 'fold':
      player.isActive = false;
      player.cards = [];
      player.hasActed = true;
      broadcastToTable(tableId, {
        type: 'chat',
        payload: {
          playerId: 'system',
          message: `${player.name} folds`,
          timestamp: new Date()
        }
      });
      break;

    case 'check':
      player.hasActed = true;
      broadcastToTable(tableId, {
        type: 'chat',
        payload: {
          playerId: 'system',
          message: `${player.name} checks`,
          timestamp: new Date()
        }
      });
      break;

    case 'call':
      const callAmount = gameState.currentBet - player.currentBet;
      player.chips -= callAmount;
      player.currentBet = gameState.currentBet;
      player.totalBetThisRound = (player.totalBetThisRound || 0) + callAmount;
      gameState.pot += callAmount;
      player.hasActed = true;
      broadcastToTable(tableId, {
        type: 'chat',
        payload: {
          playerId: 'system',
          message: `${player.name} calls ${callAmount}`,
          timestamp: new Date()
        }
      });
      break;

    case 'raise':
      if (amount && amount > gameState.currentBet) {
        const raiseAmount = amount - player.currentBet;
        player.chips -= raiseAmount;
        player.currentBet = amount;
        player.totalBetThisRound = (player.totalBetThisRound || 0) + raiseAmount;
        gameState.pot += raiseAmount;
        gameState.currentBet = amount;
        gameState.lastRaise = amount - gameState.currentBet;
        gameState.minRaise = gameState.lastRaise;
        player.hasActed = true;

        // Reset hasActed for other players
        gameState.players.forEach((p: Player) => {
          if (p.id !== player.id && p.isActive) {
            p.hasActed = false;
          }
        });

        broadcastToTable(tableId, {
          type: 'chat',
          payload: {
            playerId: 'system',
            message: `${player.name} raises to ${amount}`,
            timestamp: new Date()
          }
        });
      }
      break;

    case 'all-in':
      const allInAmount = player.chips;
      player.currentBet += allInAmount;
      player.totalBetThisRound = (player.totalBetThisRound || 0) + allInAmount;
      gameState.pot += allInAmount;
      if (player.currentBet > gameState.currentBet) {
        gameState.currentBet = player.currentBet;
        gameState.lastRaise = allInAmount;
        gameState.minRaise = gameState.lastRaise;
        // Reset hasActed for other players if this is a raise
        gameState.players.forEach((p: Player) => {
          if (p.id !== player.id && p.isActive) {
            p.hasActed = false;
          }
        });
      }
      player.chips = 0;
      player.hasActed = true;
      broadcastToTable(tableId, {
        type: 'chat',
        payload: {
          playerId: 'system',
          message: `${player.name} is all-in for ${allInAmount}`,
          timestamp: new Date()
        }
      });
      break;
  }

  // Move to next player or phase
  player.isCurrent = false;
  if (isBettingRoundComplete(gameState)) {
    console.log('Betting round complete, moving to next phase');
    moveToNextPhase(gameState);
    if (gameState.phase !== 'showdown') {
      const nextPlayer = findNextActivePlayer(gameState, gameState.dealerPosition ?? 0);
      if (nextPlayer?.position) {
        nextPlayer.isCurrent = true;
        gameState.currentPosition = nextPlayer.position;
      }
    }
  } else {
    console.log('Moving to next player');
    const nextPlayer = findNextActivePlayer(gameState, player.position ?? 0);
    if (nextPlayer?.position) {
      nextPlayer.isCurrent = true;
      gameState.currentPosition = nextPlayer.position;
    }
  }

  // Broadcast updated game state
  broadcastToTable(tableId, {
    type: 'gameState',
    payload: gameState,
  });
}

// Helper function to broadcast to all connections at a table
async function broadcastToTable(tableId: string, message: WebSocketMessage) {
  const table = connections.get(tableId);
  if (!table) return;

  // If this is a game state update, sync with database
  if (message.type === 'gameState' && 'players' in message.payload) {
    try {
      const gameState = message.payload as GameState;
      await syncGameState(tableId, gameState);
      
      // Sync each player's state
      if (gameState.players) {
        await Promise.all(
          gameState.players.map(player => syncPlayerState(tableId, player))
        );
      }
    } catch (error) {
      console.error('Failed to sync game state:', error);
    }
  }

  // Send message to all connected clients
  const messageStr = JSON.stringify(message);
  for (const [_, ws] of table.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  }
}

interface WebSocketError {
  type: 'error';
  payload: string;
}

interface ClientConnection {
  ws: WebSocket;
  playerId: string;
  tableId: string;
  lastHeartbeat?: number;
}

interface TableState {
  players: Map<string, Player>;
  gameState: GameState;
  connections: Map<string, ClientConnection>;
}

// Initialize test tournament data
syncTestTournament().catch(console.error);

// Start the server
const port = process.env.WS_PORT || 3001;
httpServer.listen(port, () => {
  console.log(`WebSocket server running on port ${port}`);
  console.log('Ready to accept connections');
  console.log(`Server URL: ws://localhost:${port}`);
});

// Add server-level error handling
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

wss.on('close', () => {
  console.log('WebSocket server closed');
});

// Log server stats periodically
setInterval(() => {
  console.log('Server stats:', {
    clients: wss.clients.size,
    tables: connections.size,
    games: gameStates.size
  });
}, 30000);

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

// Heartbeat check interval
setInterval(() => {
  wss.clients.forEach((wsClient: WebSocket) => {
    const ws = wsClient as ExtendedWebSocket;
    if (!ws.isAlive) {
      console.log('Client failed heartbeat check:', { tableId: ws.tableId, playerId: ws.playerId });
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

// Add connection event handler
wss.on('connection', async (ws: ExtendedWebSocket, req: IncomingMessage) => {
  console.log('New WebSocket connection attempt');
  
  // Parse connection parameters
  const { query } = parse(req.url || '', true);
  const tableId = decodeURIComponent(query.tableId as string);
  const playerId = decodeURIComponent(query.playerId as string);
  const playerData = query.playerData ? JSON.parse(decodeURIComponent(query.playerData as string)) : undefined;

  console.log('Connection parameters:', { tableId, playerId, playerData });

  // Initialize connection tracking
  ws.isAlive = true;
  ws.tableId = tableId;
  ws.playerId = playerId;

  // Get or create game state for this table
  let gameState: GameState = gameStates.get(tableId) || {
    players: [],
    status: 'waiting',
    phase: 'pre-flop',
    pot: 0,
    currentBet: 0,
    communityCards: [],
    smallBlind: 10,
    bigBlind: 20,
    minRaise: 20,
    lastRaise: 0,
    deck: [],
    currentPosition: 1,
    roundComplete: false
  };

  // Add player to game state if not already present
  const existingPlayer = gameState.players.find(p => p.id === playerId);
  if (!existingPlayer && playerData) {
    console.log('Adding new player to game state:', { playerId, playerData });
    const position = findNextPosition(gameState.players);
    if (position) {
      const newPlayer = {
        id: playerId,
        name: playerData.name,
        chips: playerData.chips,
        position,
        isActive: true,
        isCurrent: false,
        currentBet: 0,
        folded: false,
        cards: [],
        totalBetThisRound: 0,
        hasActed: false
      };
      gameState.players.push(newPlayer);
      console.log('Assigned position to player:', { playerId, position });
    } else {
      console.log('No available positions for player:', playerId);
      ws.close(1000, 'Table is full');
      return;
    }
  }

  // Store or update game state
  gameStates.set(tableId, gameState);

  // Track connection
  if (!connections.has(tableId)) {
    connections.set(tableId, new Map());
  }
  connections.get(tableId)?.set(playerId, ws);
  console.log('Current connections for table:', {
    tableId,
    playerCount: connections.get(tableId)?.size || 0,
    players: Array.from(connections.get(tableId)?.keys() || [])
  });

  // Broadcast updated game state
  broadcastToTable(tableId, {
    type: 'gameState',
    payload: gameState as WebSocketPayload
  });

  // Handle pong messages
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Handle messages
  ws.on('message', async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed === 'object' && parsed !== null && 'type' in parsed && 'payload' in parsed) {
        const message = parsed as WebSocketMessage;
        
        switch (message.type) {
          case 'gameState':
          case 'playerJoined':
          case 'playerLeft':
          case 'error':
          case 'chat':
            await broadcastToTable(tableId, message);
            break;
          case 'ping':
            // Handle ping message - just acknowledge receipt
            break;
          case 'playerAction':
            // Handle player action
            if (isValidPlayerAction(message.payload)) {
              await handlePlayerAction(tableId, message.payload);
            }
            break;
          case 'startGame':
            handleGameStart(tableId);
            break;
          default:
            console.warn('Unknown message type:', message.type);
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        payload: error instanceof Error ? error.message : 'Failed to process message'
      }));
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    const table = connections.get(tableId);
    if (table) {
      table.delete(playerId);
      if (table.size === 0) {
        connections.delete(tableId);
        gameStates.delete(tableId);
      } else {
        // Update game state to mark player as inactive
        const gameState = gameStates.get(tableId);
        if (gameState) {
          const player = gameState.players.find(p => p.id === playerId);
          if (player) {
            player.isActive = false;
            player.folded = true;
          }
        }
      }
      console.log(`Player ${playerId} disconnected from table ${tableId}`);
      
      // Broadcast player left message
      broadcastToTable(tableId, {
        type: 'playerLeft',
        payload: { playerId }
      });
    }
  });
});