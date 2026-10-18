import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/src/modules/auth/auth.service';
import { TokenService } from '@/src/modules/auth/token.service';
import { AuthConfig } from '@/src/infrastructure/config/auth.config';

/**
 * Logout Endpoint
 * Revokes the server-side session and clears client cookies.
 *
 * Architecture Note:
 * Issued short-lived JWT access tokens remain cryptographically valid until their
 * 15-minute expiration window expires. Immediate server-side revocation is guaranteed
 * because the refresh token and database session are revoked, preventing token renewal.
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    const accessToken =
      request.cookies.get('access_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    let sessionId: string | null = null;
    if (accessToken) {
      const claims = await TokenService.verifyAccessToken(accessToken);
      if (claims?.sessionId) {
        sessionId = claims.sessionId;
      }
    }

    await AuthService.logout(refreshToken, sessionId);

    const response = NextResponse.json(
      { message: 'Déconnexion réussie.' },
      { status: 200 }
    );

    // Clear authentication cookies
    response.cookies.set('access_token', '', {
      ...AuthConfig.getAccessTokenCookieOptions(),
      maxAge: 0,
      expires: new Date(0),
    });

    response.cookies.set('refresh_token', '', {
      ...AuthConfig.getRefreshTokenCookieOptions(),
      maxAge: 0,
      expires: new Date(0),
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');

    return response;
  } catch {
    // Logout should fail gracefully and ensure cookies are cleared even on error
    const response = NextResponse.json(
      { message: 'Déconnexion effectuée.' },
      { status: 200 }
    );
    response.cookies.set('access_token', '', {
      ...AuthConfig.getAccessTokenCookieOptions(),
      maxAge: 0,
      expires: new Date(0),
    });
    response.cookies.set('refresh_token', '', {
      ...AuthConfig.getRefreshTokenCookieOptions(),
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  }
}
