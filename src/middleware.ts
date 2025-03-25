import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle WebSocket upgrade for /api/socket
  if (request.nextUrl.pathname.startsWith('/api/socket')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-socket-upgrade', '1');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/socket',
}; 