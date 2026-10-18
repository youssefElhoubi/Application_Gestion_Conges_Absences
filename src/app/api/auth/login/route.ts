import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/src/modules/auth/auth.service';
import { LoginSchema } from '@/src/modules/auth/auth.schema';
import { RateLimiterService } from '@/src/modules/auth/rate-limiter.service';
import { AuthConfig } from '@/src/infrastructure/config/auth.config';
import { UnauthorizedError, ForbiddenError, TooManyRequestsError } from '@/src/modules/auth/auth.guard';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête JSON invalide.' },
        { status: 400 }
      );
    }

    const validation = LoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Données de connexion invalides.',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const clientIp = RateLimiterService.extractClientIp(request.headers);
    const userAgent = request.headers.get('user-agent');

    const result = await AuthService.login(validation.data, {
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

    // Set secure HttpOnly cookies
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

    // Apply strict security headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');

    return response;
  } catch (error: unknown) {
    if (error instanceof TooManyRequestsError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 429,
          headers: {
            'Retry-After': String(error.retryAfterSeconds),
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { error: 'Une erreur interne est survenue lors de l\'authentification.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
