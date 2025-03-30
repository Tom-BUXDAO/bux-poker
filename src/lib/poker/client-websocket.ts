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
  private isCleanedUp = false;
  private intentionalClose = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private eventHandlers: { [key: string]: Set<Function> } = {};

  init(config: WebSocketConfig) {
    // Reset state on new initialization
    this.isCleanedUp = false;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.config = config;

    // Clear any existing timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.connect();
  }

  private connect() {
    if (this.isCleanedUp) return;

    try {
      const { tableId, playerId, playerData } = this.config!;
      
      // Validate required parameters
      if (!tableId || !playerId) {
        throw new Error('Missing required parameters: tableId and playerId');
      }

      // Create WebSocket URL
      const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = process.env.NEXT_PUBLIC_WS_HOST || 'localhost:3001';
      const wsUrl = new URL(`${wsProtocol}//${wsHost}`);

      // Add query parameters with proper encoding
      wsUrl.searchParams.append('tableId', encodeURIComponent(tableId));
      wsUrl.searchParams.append('playerId', encodeURIComponent(playerId));
      if (playerData) {
        wsUrl.searchParams.append('playerData', encodeURIComponent(JSON.stringify(playerData)));
      }
      
      console.log('Attempting WebSocket connection to:', wsUrl.toString());
      console.log('With player data:', {
        tableId,
        playerId,
        playerData
      });
      
      this.ws = new WebSocket(wsUrl.toString());

      this.ws.onopen = () => {
        console.log('WebSocket connection established successfully');
        this.reconnectAttempts = 0;
        this.triggerEvent('connect');
        
        // Start ping interval
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('Sending ping');
            this.ws.send(JSON.stringify({ type: 'ping' }));
          } else {
            console.log('Cannot send ping - connection not open:', this.ws?.readyState);
          }
        }, 30000);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        clearInterval(this.pingInterval!);
        this.pingInterval = null;
        
        if (!this.intentionalClose && !this.isCleanedUp) {
          this.handleReconnect();
        }
        this.triggerEvent('disconnect');
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket connection error:', {
          error,
          readyState: this.ws?.readyState,
          url: wsUrl.toString()
        });
        this.triggerEvent('error', { error });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          this.triggerEvent('message', data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      if (!this.isCleanedUp) {
        this.handleReconnect();
      }
    }
  }

  private handleReconnect() {
    if (this.isCleanedUp || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Not attempting reconnect:', {
        isCleanedUp: this.isCleanedUp,
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.maxReconnectAttempts
      });
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log('Scheduling reconnect:', {
      attempt: this.reconnectAttempts + 1,
      maxAttempts: this.maxReconnectAttempts,
      delay
    });

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      console.log('Attempting reconnect:', {
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts
      });
      this.connect();
    }, delay);
  }

  cleanup() {
    console.log('Cleaning up WebSocket');
    this.isCleanedUp = true;
    this.intentionalClose = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    
    this.ws = null;
    this.config = null;
    this.eventHandlers = {};
  }

  public on(event: string, handler: EventHandler | MessageHandler): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = new Set();
    }
    this.eventHandlers[event].add(handler);
  }

  public off(event: string, handler: EventHandler | MessageHandler): void {
    this.eventHandlers[event].delete(handler);
    if (this.eventHandlers[event].size === 0) {
      delete this.eventHandlers[event];
    }
  }

  private triggerEvent(event: string, data?: Record<string, unknown>): void {
    // Don't trigger events if cleaned up
    if (this.isCleanedUp) {
      console.log('Not triggering event after cleanup:', event);
      return;
    }

    const handlers = this.eventHandlers[event];
    if (!handlers) return;

    // Convert handlers to array to avoid iterator issues
    const handlersArray = Array.from(handlers);
    
    handlersArray.forEach(handler => {
      // Wrap each handler execution in a try-catch
      window.setTimeout(() => {
        try {
          if (data) {
            (handler as MessageHandler)(data);
          } else {
            (handler as EventHandler)();
          }
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
          // Log but don't rethrow
        }
      }, 0);
    });
  }

  public sendMessage(message: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.config) {
      console.error('Cannot send message:', {
        noWebSocket: !this.ws,
        notOpen: this.ws?.readyState !== WebSocket.OPEN,
        noConfig: !this.config,
        readyState: this.ws?.readyState
      });
      return;
    }

    try {
      // Validate message format
      if (!message.type || typeof message.type !== 'string') {
        throw new Error('Message must have a type property of type string');
      }

      // Ensure payload exists
      const payload = message.payload ?? {};
      if (typeof payload !== 'object' || payload === null) {
        throw new Error('Message payload must be an object');
      }

      // Format message according to server expectations
      const formattedMessage = {
        type: message.type,
        payload: {
          ...payload,
          playerId: this.config.playerId,
          tableId: this.config.tableId,
          timestamp: new Date().toISOString()
        }
      };

      console.log('Sending message:', formattedMessage);
      this.ws.send(JSON.stringify(formattedMessage));
    } catch (error) {
      console.error('Error sending message:', error);
      this.triggerEvent('error', { error });
    }
  }
}

// Create a singleton instance
const pokerWebSocket = new PokerWebSocket();
export default pokerWebSocket; 