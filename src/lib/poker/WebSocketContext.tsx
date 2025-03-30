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
  const handlersRef = useRef(new Map<string, Set<(data?: any) => void>>());
  const connectionRef = useRef({
    tableId: '',
    playerId: '',
    playerData: null as { name: string; chips: number } | null
  });

  const connect = (tableId: string, playerId: string, playerData: { name: string; chips: number }) => {
    try {
      console.log('WebSocket context: connecting with', { tableId, playerId, playerData });
      
      // Store connection info
      connectionRef.current = {
        tableId,
        playerId,
        playerData
      };

      // Initialize WebSocket connection
      wsRef.current.init({
        tableId,
        playerId,
        playerData
      });
    } catch (error) {
      console.error('Error in WebSocket context connect:', error);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    try {
      console.log('WebSocket context: disconnecting');
      wsRef.current.cleanup();
      setIsConnected(false);
      connectionRef.current = {
        tableId: '',
        playerId: '',
        playerData: null
      };
    } catch (error) {
      console.error('Error in WebSocket context disconnect:', error);
    }
  };

  const sendMessage = (message: { type: string; payload: any }) => {
    try {
      if (!isConnected) {
        console.log('Cannot send message: WebSocket is not connected');
        return;
      }

      const formattedMessage = {
        type: message.type,
        payload: {
          ...message.payload,
          playerId: connectionRef.current.playerId,
          tableId: connectionRef.current.tableId,
          timestamp: new Date().toISOString()
        }
      };

      wsRef.current.sendMessage(formattedMessage);
    } catch (error) {
      console.error('Error in WebSocket context sendMessage:', error);
    }
  };

  const on = (event: string, handler: (data?: any) => void) => {
    try {
      if (!handlersRef.current.has(event)) {
        handlersRef.current.set(event, new Set());
      }
      handlersRef.current.get(event)?.add(handler);
      wsRef.current.on(event, handler);
    } catch (error) {
      console.error('Error in WebSocket context on:', error);
    }
  };

  const off = (event: string, handler: (data?: any) => void) => {
    try {
      const handlers = handlersRef.current.get(event);
      if (handlers?.has(handler)) {
        handlers.delete(handler);
        wsRef.current.off(event, handler);
      }
    } catch (error) {
      console.error('Error in WebSocket context off:', error);
    }
  };

  // Set up core event handlers
  useEffect(() => {
    const handleConnect = () => {
      console.log('WebSocket connected (context)');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('WebSocket disconnected (context)');
      setIsConnected(false);
    };

    const handleError = (error: any) => {
      console.error('WebSocket error (context):', error);
      setIsConnected(false);
    };

    wsRef.current.on('connect', handleConnect);
    wsRef.current.on('disconnect', handleDisconnect);
    wsRef.current.on('error', handleError);

    // Clean up event handlers on unmount
    return () => {
      wsRef.current.off('connect', handleConnect);
      wsRef.current.off('disconnect', handleDisconnect);
      wsRef.current.off('error', handleError);
    };
  }, []);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('WebSocket context: cleaning up on unmount');
      disconnect();
    };
  }, []);

  const value = {
    isConnected,
    connect,
    disconnect,
    sendMessage,
    on,
    off
  };

  return (
    <WebSocketContext.Provider value={value}>
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