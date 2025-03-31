'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, PlayerAction } from '@/types/poker';

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: { type: string; payload: any }) => void;
  sendGameAction: (action: PlayerAction) => void;
  sendChat: (message: { playerId: string; message: string }) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
  sendGameAction: () => {},
  sendChat: () => {},
});

export function WebSocketProvider({ 
  children, 
  tableId,
  playerId 
}: { 
  children: React.ReactNode;
  tableId: string;
  playerId: string;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket>();

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_HOST || 'http://localhost:3000', {
      path: '/api/socket',
      query: { tableId, playerId },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [tableId, playerId]);

  const sendMessage = (message: { type: string; payload: any }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(message.type, message.payload);
    }
  };

  const sendGameAction = (action: PlayerAction) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('gameAction', action);
    }
  };

  const sendChat = (message: { playerId: string; message: string }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat', message);
    }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage, sendGameAction, sendChat }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => useContext(WebSocketContext); 