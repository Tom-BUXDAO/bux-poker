'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export function Providers({ 
  children, 
  session 
}: { 
  children: React.ReactNode;
  session: any;
}) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
} 