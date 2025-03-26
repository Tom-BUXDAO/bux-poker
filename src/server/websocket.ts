import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';

// Extend WebSocket type to include isAlive
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

interface Player {
  id: string;
  position: number;
  chips: number;
  isActive: boolean;
  isCurrent: boolean;
  disconnectedAt?: number;
  cards?: { rank: string; suit: string }[];
  isDealer?: boolean;
  currentBet: number;
  name: string;
}

interface GameState {
  players: Player[];
  communityCards: any[];
  pot: number;
  currentBet: number;
  currentPosition: number;
  dealerPosition?: number;
  smallBlind: number;
  bigBlind: number;
  status: 'waiting' | 'playing' | 'finished';
  deck?: string[];
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

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 35000;  // 35 seconds

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

// Initialize a new deck of cards
function createDeck(): string[] {
  const suits = ['H', 'D', 'C', 'S'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(`${rank}${suit}`);
    }
  }
  
  return shuffleDeck(deck);
}

// Fisher-Yates shuffle algorithm
function shuffleDeck(deck: string[]): string[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deal cards to players
function dealCards(gameState: GameState) {
  if (!gameState.deck) return;
  
  const activePlayers = gameState.players.filter(p => p.isActive);
  
  // Deal 2 cards to each player
  for (let i = 0; i < 2; i++) {
    for (const player of activePlayers) {
      if (!player.cards) player.cards = [];
      const card = gameState.deck.pop();
      if (card) {
        const [rank, suit] = [card.slice(0, -1), card.slice(-1)];
        player.cards.push({ rank, suit });
      }
    }
  }
}

function handleGameStart(tableId: string) {
  const gameState = gameStates.get(tableId);
  if (!gameState) return;

  const activePlayers = gameState.players.filter(p => p.isActive);
  if (activePlayers.length < 2) return;

  // Initialize game state
  gameState.status = 'playing';
  gameState.pot = 0;
  gameState.currentBet = 0;
  gameState.smallBlind = 10;
  gameState.bigBlind = 20;
  gameState.communityCards = [];
  gameState.deck = createDeck();

  // Randomly select dealer
  const dealerIndex = Math.floor(Math.random() * activePlayers.length);
  const dealerPosition = activePlayers[dealerIndex].position;
  gameState.dealerPosition = dealerPosition;

  // Reset all player states
  gameState.players.forEach(player => {
    player.currentBet = 0;
    player.cards = [];
    player.isDealer = player.position === dealerPosition;
  });

  // Get players in clockwise order
  const orderedPlayers = [...activePlayers].sort((a, b) => a.position - b.position);
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

  // Small blind is next player after dealer
  const sbIdx = (dealerIdx + 1) % orderedPlayers.length;
  const sbPlayer = orderedPlayers[sbIdx];
  sbPlayer.chips -= gameState.smallBlind;
  sbPlayer.currentBet = gameState.smallBlind;
  gameState.pot += gameState.smallBlind;

  // Announce small blind
  broadcastToTable(tableId, {
    type: 'chat',
    payload: {
      playerId: 'system',
      message: `${sbPlayer.name} posts small blind of ${gameState.smallBlind}`,
      timestamp: new Date()
    }
  });

  // Big blind is next player after small blind
  const bbIdx = (sbIdx + 1) % orderedPlayers.length;
  const bbPlayer = orderedPlayers[bbIdx];
  bbPlayer.chips -= gameState.bigBlind;
  bbPlayer.currentBet = gameState.bigBlind;
  gameState.pot += gameState.bigBlind;
  gameState.currentBet = gameState.bigBlind;

  // Announce big blind
  broadcastToTable(tableId, {
    type: 'chat',
    payload: {
      playerId: 'system',
      message: `${bbPlayer.name} posts big blind of ${gameState.bigBlind}`,
      timestamp: new Date()
    }
  });

  // Deal cards to all players
  dealCards(gameState);

  // Announce dealing
  broadcastToTable(tableId, {
    type: 'chat',
    payload: {
      playerId: 'system',
      message: `Dealing cards to all players`,
      timestamp: new Date()
    }
  });

  // First to act is next player after big blind
  const firstToActIdx = (bbIdx + 1) % orderedPlayers.length;
  const firstToActPlayer = orderedPlayers[firstToActIdx];
  gameState.currentPosition = firstToActPlayer.position;
  firstToActPlayer.isCurrent = true;

  // Broadcast updated game state
  broadcastToTable(tableId, {
    type: 'gameState',
    payload: gameState,
  });

  // Broadcast game started event
  broadcastToTable(tableId, {
    type: 'gameStarted',
    payload: {
      dealerPosition: gameState.dealerPosition,
      smallBlind: gameState.smallBlind,
      bigBlind: gameState.bigBlind,
      currentPosition: gameState.currentPosition
    },
  });
}

wss.on('connection', (ws: ExtendedWebSocket, req) => {
  const { query } = parse(req.url || '', true);
  const tableId = Array.isArray(query.tableId) ? query.tableId[0] : query.tableId;
  const playerId = Array.isArray(query.playerId) ? query.playerId[0] : query.playerId;

  console.log(`Player ${playerId} attempting to connect to table ${tableId}`);

  if (!tableId || !playerId) {
    ws.close();
    return;
  }

  // Set up heartbeat
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Send immediate ping to establish connection
  ws.ping();

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

  // Check for existing connection and handle reconnection
  const existingConnection = connections.get(tableId)?.get(playerId);
  if (existingConnection) {
    console.log(`Existing connection found for player ${playerId}`);
    // Only close if it's in a broken state
    if (existingConnection.readyState !== WebSocket.OPEN) {
      console.log(`Closing broken connection for player ${playerId}`);
      existingConnection.close(1000, 'Connection replaced');
      connections.get(tableId)?.delete(playerId);
    } else {
      // If the existing connection is healthy, close the new one
      console.log(`Rejecting duplicate connection for player ${playerId}`);
      ws.close(1000, 'Duplicate connection');
      return;
    }
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
      smallBlind: 10,
      bigBlind: 20,
      status: 'waiting',
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
        currentBet: 0,
        name: '',
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
      
      if (message.type === 'startGame') {
        handleGameStart(tableId);
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

// Set up heartbeat interval
const interval = setInterval(() => {
  wss.clients.forEach((wsClient) => {
    const ws = wsClient as ExtendedWebSocket;
    if (ws.isAlive === false) {
      console.log('Client failed heartbeat, terminating');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
  clearInterval(interval);
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