import { GameState, PlayerAction } from '@/types/poker';

type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;

interface WebSocketMessage {
  type: string;
  payload: any;
}

class PokerWebSocket {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private connectedHandlers: ConnectionHandler[] = [];
  private disconnectedHandlers: ConnectionHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private tableId: string | null = null;
  private playerId: string | null = null;

  constructor() {
    this.messageHandlers = new Map();
  }

  public connect(tableId: string, playerId: string): void {
    this.tableId = tableId;
    this.playerId = playerId;
    this.createConnection();
  }

  private createConnection(): void {
    if (!this.tableId || !this.playerId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WEBSOCKET_URL || `${protocol}//${window.location.hostname}:3001`;
    const url = `${host}?tableId=${this.tableId}&playerId=${this.playerId}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.connectedHandlers.forEach(handler => handler());
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        this.disconnectedHandlers.forEach(handler => handler());
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          const handlers = this.messageHandlers.get(message.type);
          if (handlers) {
            handlers.forEach(handler => handler(message.payload));
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    console.log(`Attempting to reconnect in ${this.reconnectDelay}ms...`);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectDelay *= 2; // Exponential backoff
      this.createConnection();
    }, this.reconnectDelay);
  }

  public on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)?.push(handler);
  }

  public onConnected(handler: ConnectionHandler): void {
    this.connectedHandlers.push(handler);
  }

  public onDisconnected(handler: ConnectionHandler): void {
    this.disconnectedHandlers.push(handler);
  }

  public sendAction(action: { type: PlayerAction; amount?: number }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.playerId) {
      console.error('Cannot send action: WebSocket not ready or no player ID');
      return;
    }

    const message = {
      type: 'playerAction',
      payload: {
        ...action,
        playerId: this.playerId,
        timestamp: new Date().toISOString()
      }
    };

    console.log('Sending action message:', message);
    this.ws.send(JSON.stringify(message));
  }

  public sendMessage(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket not ready');
      return;
    }

    // Add timestamp to payload if not present
    if (message.payload && typeof message.payload === 'object') {
      message.payload.timestamp = message.payload.timestamp || new Date().toISOString();
    }

    console.log('Sending message:', message);
    this.ws.send(JSON.stringify(message));
  }

  public cleanup(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.messageHandlers.clear();
    this.connectedHandlers = [];
    this.disconnectedHandlers = [];
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  }
}

// Create a singleton instance
const pokerWebSocket = new PokerWebSocket();
export default pokerWebSocket; 