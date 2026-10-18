/**
 * Centralized Authentication & Security Configuration
 * Strictly enforces production secret requirements and security invariants.
 */
export class AuthConfig {
  public static readonly ISSUER = 'absnace-platform';
  public static readonly AUDIENCE = 'absnace-client';
  public static readonly ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60; // 15 minutes
  public static readonly REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

  /**
   * Resolves the JWT signing key.
   * Throws immediately if run in production without a verified, 32+ character secret.
   */
  public static getJwtSecret(): Uint8Array {
    const isProduction = process.env.NODE_ENV === 'production';
    const secret = process.env.JWT_ACCESS_SECRET;

    if (isProduction) {
      if (!secret || secret.trim().length < 32) {
        throw new Error(
          'CRITICAL SECURITY CONFIGURATION ERROR: JWT_ACCESS_SECRET must be explicitly configured with at least 32 characters in production environments.'
        );
      }
      return new TextEncoder().encode(secret.trim());
    }

    // Local development and test fallback
    const devSecret = secret?.trim() || 'dev-insecure-jwt-secret-min-32-chars-long-2026-key!';
    return new TextEncoder().encode(devSecret);
  }

  /**
   * Determines whether cookies require the Secure attribute.
   * Enforced in production or when explicitly configured via COOKIE_SECURE.
   */
  public static isCookieSecure(): boolean {
    return process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';
  }

  /**
   * Cookie configuration for short-lived JWT Access Token
   */
  public static getAccessTokenCookieOptions() {
    return {
      httpOnly: true,
      secure: this.isCookieSecure(),
      sameSite: 'lax' as const,
      path: '/',
      maxAge: this.ACCESS_TOKEN_MAX_AGE_SECONDS,
    };
  }

  /**
   * Cookie configuration for persistent Refresh Token
   * Uses SameSite=Strict for complete CSRF immunity
   */
  public static getRefreshTokenCookieOptions() {
    return {
      httpOnly: true,
      secure: this.isCookieSecure(),
      sameSite: 'strict' as const,
      path: '/',
      maxAge: this.REFRESH_TOKEN_MAX_AGE_SECONDS,
    };
  }
}
