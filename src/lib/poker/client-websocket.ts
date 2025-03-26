import { Card, PlayerAction } from '@/types/poker';

interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: Date;
}

interface GameState {
  players: any[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
}

class PokerWebSocket {
  private socket: WebSocket | null = null;
  private eventHandlers: { [key: string]: Function[] } = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private currentTableId: string | null = null;
  private currentPlayerId: string | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  connect(tableId: string, playerId: string) {
    if (typeof window === 'undefined') return;

    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.currentTableId = tableId;
    this.currentPlayerId = playerId;

    // Don't create a new connection if we already have a healthy one
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('Already connected, skipping connection attempt');
      return;
    }

    // Clean up any existing socket
    if (this.socket) {
      this.socket.close(1000, 'Creating new connection');
      this.socket = null;
    }

    // Use environment variable for WebSocket URL in production
    const wsUrl = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001'}/api/socket?tableId=${tableId}&playerId=${playerId}`;
    
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.emit('connected', null);
      this.startPingInterval();
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.emit('disconnected', null);
      this.stopPingInterval();

      // Only attempt reconnect if:
      // 1. It wasn't a clean closure
      // 2. We're not already reconnecting
      // 3. We haven't exceeded max attempts
      if (event.code !== 1000 && !this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.isReconnecting = true;
        this.reconnectTimeout = setTimeout(() => {
          this.reconnect();
          this.isReconnecting = false;
        }, this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000); // Cap at 10 seconds
        this.reconnectAttempts++;
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.emit(message.type, message.payload);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }

  private reconnect() {
    if (this.currentTableId && this.currentPlayerId) {
      console.log(`Attempting reconnect ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
      this.connect(this.currentTableId, this.currentPlayerId);
    }
  }

  private startPingInterval() {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping' });
      }
    }, 15000); // Ping every 15 seconds
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.stopPingInterval();
    if (this.socket) {
      this.socket.close(1000); // Clean closure
      this.socket = null;
    }
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  private emit(event: string, data: any) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }

  sendAction(action: PlayerAction) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'playerAction',
        payload: action
      }));
    }
  }

  sendMessage(message: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  cleanup() {
    this.disconnect();
    this.eventHandlers = {};
  }

  handleFastRefresh() {
    // Cleanup and reconnect on fast refresh in development
    this.cleanup();
  }
}

// Export a singleton instance
export const pokerWebSocket = new PokerWebSocket(); 