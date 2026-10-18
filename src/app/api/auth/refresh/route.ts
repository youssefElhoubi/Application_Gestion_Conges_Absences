import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/src/modules/auth/auth.service';
import { RefreshTokenSchema } from '@/src/modules/auth/auth.schema';
import { RateLimiterService } from '@/src/modules/auth/rate-limiter.service';
import { AuthConfig } from '@/src/infrastructure/config/auth.config';
import { UnauthorizedError, ForbiddenError } from '@/src/modules/auth/auth.guard';

export async function POST(request: NextRequest) {
  try {
    // 1. Extract refresh token from HttpOnly cookie first, then body fallback
    let refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      try {
        const body = await request.json();
        const parsed = RefreshTokenSchema.safeParse(body);
        if (parsed.success && parsed.data.refreshToken) {
          refreshToken = parsed.data.refreshToken;
        }
      } catch {
        // Body is optional if cookie is present
      }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Jeton de rafraîchissement absent ou expiré.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const clientIp = RateLimiterService.extractClientIp(request.headers);
    const userAgent = request.headers.get('user-agent');

    const result = await AuthService.refresh(refreshToken, {
      ip: clientIp,
      userAgent,
    });

    const response = NextResponse.json(
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      { status: 200 }
    );

    // Set updated HttpOnly cookies
    response.cookies.set(
      'access_token',
      result.accessToken,
      AuthConfig.getAccessTokenCookieOptions()
    );
    response.cookies.set(
      'refresh_token',
      result.rawRefreshToken,
      AuthConfig.getRefreshTokenCookieOptions()
    );

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('X-Content-Type-Options', 'nosniff');

    return response;
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      const response = NextResponse.json(
        { error: error.message },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
      response.cookies.set('access_token', '', { ...AuthConfig.getAccessTokenCookieOptions(), maxAge: 0, expires: new Date(0) });
      response.cookies.set('refresh_token', '', { ...AuthConfig.getRefreshTokenCookieOptions(), maxAge: 0, expires: new Date(0) });
      return response;
    }

    if (error instanceof UnauthorizedError) {
      // Clear cookies if token was revoked or invalid
      const response = NextResponse.json(
        { error: error.message },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
      response.cookies.set('access_token', '', { ...AuthConfig.getAccessTokenCookieOptions(), maxAge: 0 });
      response.cookies.set('refresh_token', '', { ...AuthConfig.getRefreshTokenCookieOptions(), maxAge: 0 });
      return response;
    }

    return NextResponse.json(
      { error: 'Une erreur interne est survenue lors du rafraîchissement.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
