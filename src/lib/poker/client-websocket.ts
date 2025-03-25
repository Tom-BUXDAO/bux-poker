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

  connect(tableId: string, playerId: string) {
    if (typeof window === 'undefined') return;

    // Use environment variable for WebSocket URL in production
    const wsUrl = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001'}/api/socket?tableId=${tableId}&playerId=${playerId}`;
    
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.emit('connected', null);
    };

    this.socket.onclose = () => {
      this.emit('disconnected', null);
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

  disconnect() {
    if (this.socket) {
      this.socket.close();
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