import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public endpoints and static assets exempt from authentication requirements
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/openapi',
  '/api/openapi.json',
  '/api-docs',
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Static asset and Next.js internal bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/docs')
  ) {
    return NextResponse.next();
  }

  // 2. Explicit public paths bypass
  const isPublicPath = PUBLIC_PATHS.some((path) =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  const hasAccessToken = request.cookies.has('access_token');
  const hasRefreshToken = request.cookies.has('refresh_token');
  const hasAuthHeader = !!request.headers.get('authorization');
  const hasAuthCandidate = hasAccessToken || hasRefreshToken || hasAuthHeader;

  // 3. Already-authenticated redirect away from /login
  if (pathname === '/login') {
    if (hasAccessToken || hasRefreshToken) {
      const redirectTarget = request.nextUrl.searchParams.get('redirect') || '/';
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    }
    return NextResponse.next();
  }

  // 4. Protect backend API routes (excluding public endpoints)
  if (pathname.startsWith('/api/')) {
    if (!isPublicPath && !hasAuthCandidate) {
      return NextResponse.json(
        { error: 'Authentification requise pour cette ressource.' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 5. Protect all application frontend pages
  if (!isPublicPath && !hasAuthCandidate) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
