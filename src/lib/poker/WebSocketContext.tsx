'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import pokerWebSocket from './client-websocket';

interface WebSocketContextType {
  isConnected: boolean;
  connect: (tableId: string, playerId: string, playerData: { name: string; chips: number }) => void;
  disconnect: () => void;
  sendMessage: (message: { type: string; payload: any }) => void;
  on: (event: string, handler: (data?: any) => void) => void;
  off: (event: string, handler: (data?: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<typeof pokerWebSocket>(pokerWebSocket);
  const connectionRef = useRef({
    isInitialized: false,
    tableId: '',
    playerId: '',
    handlers: new Map<string, Set<(data?: any) => void>>()
  });

  // Set up connection event handlers
  const setupEventHandlers = () => {
    function handleConnect() {
      console.log('WebSocket connected (context)');
      setIsConnected(true);
    }

    function handleDisconnect() {
      console.log('WebSocket disconnected (context)');
      setIsConnected(false);
    }

    function handleError(error: any) {
      console.error('WebSocket error (context):', error);
      setIsConnected(false);
    }

    try {
      // Set up event handlers
      wsRef.current.on('connect', handleConnect);
      wsRef.current.on('disconnect', handleDisconnect);
      wsRef.current.on('error', handleError);

      // Store handlers for cleanup
      const handlers = connectionRef.current.handlers;
      handlers.set('connect', new Set([handleConnect]));
      handlers.set('disconnect', new Set([handleDisconnect]));
      handlers.set('error', new Set([handleError]));

      // Check initial connection state
      if ((wsRef.current as any).ws?.readyState === WebSocket.OPEN) {
        console.log('Initial connection state: connected');
        setIsConnected(true);
      } else {
        console.log('Initial connection state: disconnected');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error setting up WebSocket event handlers:', error);
    }
  };

  const cleanupEventHandlers = () => {
    try {
      const handlers = connectionRef.current.handlers;
      if (handlers.size > 0) {
        console.log('Cleaning up event handlers');
        handlers.forEach((eventHandlers, event) => {
          if (eventHandlers.size > 0) {
            eventHandlers.forEach(handler => {
              try {
                wsRef.current.off(event, handler);
              } catch (error) {
                console.error(`Error removing handler for event ${event}:`, error);
              }
            });
          }
        });
        handlers.clear();
      }
    } catch (error) {
      console.error('Error during event handler cleanup:', error);
    }
  };

  const connect = (tableId: string, playerId: string, playerData: { name: string; chips: number }) => {
    try {
      // Don't reconnect if already connected to the same table/player
      if (connectionRef.current.isInitialized && 
          connectionRef.current.tableId === tableId && 
          connectionRef.current.playerId === playerId &&
          isConnected) {
        console.log('Already connected, skipping reconnect');
        return;
      }

      // Clean up existing connection if any
      if (connectionRef.current.isInitialized) {
        console.log('Cleaning up existing connection');
        cleanupEventHandlers();
        wsRef.current.cleanup();
        setIsConnected(false);
      }

      console.log('Initializing WebSocket connection:', {
        tableId,
        playerId,
        playerData
      });

      // Initialize new connection
      wsRef.current.init({
        tableId,
        playerId,
        playerData
      });

      // Set up event handlers after initializing connection
      setupEventHandlers();

      connectionRef.current = {
        isInitialized: true,
        tableId,
        playerId,
        handlers: connectionRef.current.handlers
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    try {
      console.log('Disconnecting WebSocket');
      cleanupEventHandlers();
      wsRef.current.cleanup();
      connectionRef.current = {
        isInitialized: false,
        tableId: '',
        playerId: '',
        handlers: new Map()
      };
      setIsConnected(false);
    } catch (error) {
      console.error('Error disconnecting WebSocket:', error);
      setIsConnected(false);
    }
  };

  const sendMessage = (message: { type: string; payload: any }) => {
    try {
      if (connectionRef.current.isInitialized && isConnected) {
        wsRef.current.sendMessage(message);
      } else {
        console.warn('Cannot send message: WebSocket is not connected', {
          isInitialized: connectionRef.current.isInitialized,
          isConnected,
          readyState: (wsRef.current as any)?.ws?.readyState
        });
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  };

  const on = (event: string, handler: (data?: any) => void) => {
    try {
      if (!connectionRef.current.isInitialized) {
        console.warn('Cannot add event handler: WebSocket is not initialized');
        return;
      }

      // Store handler in our ref for cleanup
      if (!connectionRef.current.handlers.has(event)) {
        connectionRef.current.handlers.set(event, new Set());
      }
      connectionRef.current.handlers.get(event)?.add(handler);

      wsRef.current.on(event, handler);
    } catch (error) {
      console.error('Error adding WebSocket event handler:', error);
    }
  };

  const off = (event: string, handler: (data?: any) => void) => {
    try {
      if (!connectionRef.current.isInitialized) return;

      const handlers = connectionRef.current.handlers.get(event);
      if (handlers?.has(handler)) {
        handlers.delete(handler);
        wsRef.current.off(event, handler);
      }
    } catch (error) {
      console.error('Error removing WebSocket event handler:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        console.log('WebSocket provider unmounting');
        if (connectionRef.current.isInitialized) {
          disconnect();
        }
      } catch (error) {
        console.error('Error during WebSocket provider cleanup:', error);
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ 
      isConnected, 
      connect, 
      disconnect, 
      sendMessage, 
      on, 
      off 
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
} 