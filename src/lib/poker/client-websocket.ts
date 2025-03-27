import { GameState, PlayerAction } from '@/types/poker';

type EventHandler = () => void;
type MessageHandler = (data: Record<string, unknown>) => void;

interface WebSocketConfig {
  tableId: string;
  playerId: string;
  playerData?: {
    name: string;
    chips: number;
  };
}

class PokerWebSocket {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig | null = null;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  public init(config: WebSocketConfig): void {
    this.config = config;
    this.connect();
  }

  public cleanup(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventHandlers.clear();
    this.messageHandlers.clear();
  }

  public on(event: string, handler: EventHandler | MessageHandler): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler as EventHandler);
    this.eventHandlers.set(event, handlers);
  }

  private connect(): void {
    if (!this.config) return;
    const { tableId, playerId, playerData } = this.config;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WEBSOCKET_URL || `${protocol}//${window.location.hostname}:3001`;
    const playerDataParam = playerData ? `&playerData=${encodeURIComponent(JSON.stringify(playerData))}` : '';
    const url = `${host}?tableId=${tableId}&playerId=${playerId}${playerDataParam}`;

    try {
      console.log('Connecting to WebSocket:', url);
      this.ws = new window.WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.triggerEvent('connect');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.triggerEvent('disconnect');
        if (event.code !== 1000) { // Don't reconnect if closed normally
          this.reconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.triggerEvent('error');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          this.triggerEvent('message', data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.reconnect();
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    console.log(`Attempting to reconnect in ${this.reconnectDelay}ms...`);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectDelay *= 2; // Exponential backoff
      this.connect();
    }, this.reconnectDelay);
  }

  private triggerEvent(event: string, data?: Record<string, unknown>): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      if (data) {
        (handler as MessageHandler)(data);
      } else {
        (handler as EventHandler)();
      }
    });
  }

  public sendMessage(message: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.config) {
      console.error('Cannot send message: WebSocket not ready or no config');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
}

// Create a singleton instance
const pokerWebSocket = new PokerWebSocket();
export default pokerWebSocket; 