'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WebSocketProvider } from '@/lib/poker/WebSocketContext';
import RotateScreen from '@/components/RotateScreen';
import { SessionProvider } from "next-auth/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <WebSocketProvider>
            <RotateScreen />
            {children}
          </WebSocketProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
