'use client';

import { WebSocketProvider } from '@/lib/poker/WebSocketContext';
import RotateScreen from '@/components/RotateScreen';
import { SessionProvider } from "next-auth/react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <WebSocketProvider>
        <RotateScreen />
        {children}
      </WebSocketProvider>
    </SessionProvider>
  );
} 