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
import type { WebSocketMessage } from '@/types/poker';

// Extend WebSocket type to include isAlive
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
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

// Create HTTP server
const httpServer = createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer });

// Helper function to find the next available position
function findNextPosition(players: Player[]): TablePosition | null {
  const takenPositions = new Set(players.map((p: Player) => p.position));
  for (let i = 1; i <= MAX_PLAYERS_PER_TABLE; i++) {
    const position = i as TablePosition;
    if (!takenPositions.has(position)) {
      return position;
    }
  }
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
    payload: playerId,
  });
  broadcastToTable(tableId, {
    type: 'gameState',
    payload: gameState,
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
  gameState.currentPosition = firstToActPlayer.position;
  firstToActPlayer.isCurrent = true;

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
      const nextPlayer = findNextActivePlayer(gameState, gameState.dealerPosition!);
      if (nextPlayer) {
        nextPlayer.isCurrent = true;
        gameState.currentPosition = nextPlayer.position;
      }
    }
  } else {
    console.log('Moving to next player');
    const nextPlayer = findNextActivePlayer(gameState, player.position);
    if (nextPlayer) {
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
function broadcastToTable(tableId: string, message: any) {
  const tableConnections = connections.get(tableId);
  if (!tableConnections) return;

  const messageStr = JSON.stringify(message);
  for (const connection of tableConnections.values()) {
    connection.send(messageStr);
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

// WebSocket connection handling
wss.on('connection', (ws: ExtendedWebSocket, req: any) => {
  const { query } = parse(req.url || '', true);
  const { tableId, playerId } = query;

  if (typeof tableId !== 'string' || typeof playerId !== 'string') {
    ws.close();
    return;
  }

  // Parse player data from query
  let playerName = playerId;
  let playerChips = 1000;
  try {
    const playerData = JSON.parse(decodeURIComponent(query.playerData as string));
    if (playerData) {
      playerName = playerData.name || playerId;
      playerChips = playerData.chips || 1000;
    }
  } catch (error) {
    console.error('Error parsing player data:', error);
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
      phase: 'pre-flop',
      roundComplete: false,
      minRaise: 20,
      lastRaise: 0
    });
  }

  const gameState = gameStates.get(tableId);
  if (gameState) {
    // Add player to the game or reactivate if they were disconnected
    const existingPlayer = gameState.players.find((p: Player) => p.id === playerId);

    if (existingPlayer) {
      // Reactivate player
      if (!existingPlayer.isActive) {
        existingPlayer.isActive = true;
        delete existingPlayer.disconnectedAt;
        broadcastToTable(tableId, {
          type: 'playerJoined',
          payload: { id: playerId },
        });
      }
    } else {
      // Find next available position
      const nextPosition = findNextPosition(gameState.players);
      if (nextPosition === null) {
        ws.close(1000, 'No positions available');
        return;
      }

      // Add new player
      const newPlayer: Player = {
        id: playerId,
        position: nextPosition,
        chips: playerChips,
        isActive: true,
        isCurrent: false,
        currentBet: 0,
        name: playerName,
        hasActed: false,
        totalBetThisRound: 0,
        folded: false
      };
      gameState.players.push(newPlayer);

      broadcastToTable(tableId, {
        type: 'playerJoined',
        payload: { id: playerId },
      });
    }

    // Send initial game state
    ws.send(JSON.stringify({
      type: 'gameState',
      payload: gameState,
    }));
  }

  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      console.log(`Received message from ${playerId}:`, message);
      
      switch (message.type) {
        case 'startGame':
          console.log(`Starting game for table ${tableId}`);
          handleGameStart(tableId);
          break;
        case 'playerAction':
          console.log(`Processing action for player ${playerId}:`, message.payload);
          const actionPayload = {
            ...message.payload,
            playerId,
            timestamp: new Date()
          };
          if (isValidPlayerAction(actionPayload)) {
            handlePlayerAction(tableId, actionPayload);
          } else {
            console.error('Invalid player action:', actionPayload);
          }
          break;
        case 'chat':
          if (isValidChatMessage(message.payload)) {
            broadcastToTable(tableId, message);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    const gameState = gameStates.get(tableId);
    if (!gameState) return;

    const player = gameState.players.find((p: Player) => p.id === playerId);
    if (!player) return;

    // Mark player as inactive and set disconnection time
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

    // If it was this player's turn, auto-fold
    if (player.isCurrent) {
      const foldAction: PlayerActionPayload = {
        type: 'fold',
        playerId,
        timestamp: new Date()
      };
      handlePlayerAction(tableId, foldAction);
    }

    // Broadcast updated game state
    broadcastToTable(tableId, {
      type: 'gameState',
      payload: gameState,
    });
  });
});

function isValidChatMessage(payload: any): payload is ChatMessage {
  // Convert ISO string timestamp to Date if needed
  if (typeof payload.timestamp === 'string') {
    try {
      payload.timestamp = new Date(payload.timestamp);
    } catch (error) {
      console.error('Invalid timestamp:', error);
      return false;
    }
  }

  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.playerId === 'string' &&
    typeof payload.message === 'string' &&
    payload.timestamp instanceof Date
  );
}

// Start the server
const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
}); 