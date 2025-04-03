import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get hostname of request (e.g. bux-poker.vercel.app, localhost:3000)
  const hostname = request.headers.get('host') || '';
  const isProd = hostname === 'bux-poker.vercel.app';

  // If in production and trying to access with localhost URL, redirect to production URL
  if (isProd && request.nextUrl.pathname.startsWith('/api/auth') && request.nextUrl.searchParams.get('callbackUrl')?.includes('localhost')) {
    const newCallbackUrl = request.nextUrl.searchParams.get('callbackUrl')?.replace('http://localhost:3000', 'https://bux-poker.vercel.app');
    const newUrl = request.nextUrl.clone();
    newUrl.searchParams.set('callbackUrl', newCallbackUrl || '');
    return NextResponse.redirect(newUrl);
  }

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