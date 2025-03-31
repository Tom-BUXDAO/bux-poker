'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const WebSocketProvider = dynamic(
  () => import('@/lib/poker/WebSocketContext').then(mod => mod.WebSocketProvider),
  { ssr: false }
);

export function WebSocketWrapper({ children }: { children: ReactNode }) {
  return <WebSocketProvider>{children}</WebSocketProvider>;
} 