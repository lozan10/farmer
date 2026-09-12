import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(
      new URL('/dashboard', request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
