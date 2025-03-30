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

export class PokerWebSocket {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig | null = null;
  private eventHandlers: { [key: string]: Set<Function> } = {};
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  init(config: WebSocketConfig) {
    if (!config.tableId || !config.playerId) {
      console.error('Missing required config:', config);
      return;
    }

    // Store config for reconnects
    this.config = config;
    
    // Don't initialize if already connecting
    if (this.isConnecting) {
      console.log('WebSocket already connecting');
      return;
    }

    // If already connected to the same table/player, don't reconnect
    if (this.ws?.readyState === WebSocket.OPEN && 
        this.config?.tableId === config.tableId && 
        this.config?.playerId === config.playerId) {
      console.log('WebSocket already connected to same table/player');
      return;
    }

    // Close existing connection if any
    this.cleanup(false);
    
    // Reset reconnect attempts on new init
    this.reconnectAttempts = 0;
    
    // Connect
    this.connect();
  }

  private connect() {
    if (!this.config) {
      console.error('Cannot connect: WebSocket not initialized with config');
      return;
    }

    try {
      const { tableId, playerId, playerData } = this.config;
      
      const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = process.env.NEXT_PUBLIC_WS_HOST || 'localhost:3001';
      const wsUrl = new URL(`${wsProtocol}//${wsHost}`);
      
      // Add required parameters
      wsUrl.searchParams.append('tableId', encodeURIComponent(tableId));
      wsUrl.searchParams.append('playerId', encodeURIComponent(playerId));
      if (playerData) {
        wsUrl.searchParams.append('playerData', encodeURIComponent(JSON.stringify(playerData)));
      }

      console.log('Connecting to WebSocket URL:', wsUrl.toString());
      
      this.isConnecting = true;
      this.ws = new WebSocket(wsUrl.toString());

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.triggerEvent('connect');
        
        // Start ping interval
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.cleanup(false);
        this.triggerEvent('disconnect');

        // Attempt reconnect if we haven't exceeded max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          setTimeout(() => this.connect(), 1000 * Math.min(this.reconnectAttempts, 5));
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.triggerEvent('error', { error });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.triggerEvent('message', data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
    } catch (error) {
      console.error('Connection error:', error);
      this.isConnecting = false;
      this.triggerEvent('error', { error });
    }
  }

  cleanup(resetConfig: boolean = true) {
    this.isConnecting = false;
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    if (resetConfig) {
      this.config = null;
      this.eventHandlers = {};
      this.reconnectAttempts = 0;
    }
  }

  public on(event: string, handler: Function): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = new Set();
    }
    this.eventHandlers[event].add(handler);
  }

  public off(event: string, handler: Function): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].delete(handler);
    }
  }

  private triggerEvent(event: string, data?: any): void {
    const handlers = this.eventHandlers[event];
    if (!handlers) return;

    handlers.forEach(handler => {
      try {
        if (data) {
          handler(data);
        } else {
          handler();
        }
      } catch (error) {
        console.error(`Error in handler:`, error);
      }
    });
  }

  public sendMessage(message: { type: string; payload: any }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.config) {
      console.error('Cannot send message - not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
}

const pokerWebSocket = new PokerWebSocket();
export default pokerWebSocket; 