import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import crypto from 'node:crypto';
import { Role } from '@/src/generated/prisma';

export interface AccessTokenClaims extends JWTPayload {
  sub: string;            // User ID
  email: string;          // User Email
  role: Role;             // User Role enum
  employeeId: string | null; // Associated Employee Matricule
  sessionId: string;      // Relational Session ID in PostgreSQL
}

export class TokenService {
  private static readonly ISSUER = 'absnace-platform';
  private static readonly AUDIENCE = 'absnace-client';
  public static readonly ACCESS_TOKEN_EXPIRATION = '15m'; // 15 minutes
  public static readonly ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60; // 900 seconds
  public static readonly REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days (604,800 seconds)

  /**
   * Resolves secret key as Uint8Array for Web Cryptography API (compatible with Edge & Node)
   */
  private static getSecretKey(): Uint8Array {
    const secret = process.env.JWT_ACCESS_SECRET || 'dev-insecure-jwt-secret-min-32-chars-long-2026-key!';
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_ACCESS_SECRET) {
      throw new Error('JWT_ACCESS_SECRET must be set in production environment.');
    }
    return new TextEncoder().encode(secret);
  }

  /**
   * Issues a signed, short-lived JWT Access Token
   */
  public static async signAccessToken(user: {
    id: string;
    email: string;
    role: Role;
    employeeId: string | null;
  }, sessionId: string): Promise<string> {
    const secretKey = this.getSecretKey();

    return await new SignJWT({
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      sessionId,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer(this.ISSUER)
      .setAudience(this.AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(this.ACCESS_TOKEN_EXPIRATION)
      .sign(secretKey);
  }

  /**
   * Verifies and decodes a JWT Access Token.
   * Returns null if signature is invalid, token is expired, or claims are malformed.
   */
  public static async verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
    if (!token || typeof token !== 'string') {
      return null;
    }

    try {
      const secretKey = this.getSecretKey();
      const { payload } = await jwtVerify(token, secretKey, {
        issuer: this.ISSUER,
        audience: this.AUDIENCE,
      });

      if (!payload.sub || !payload.email || !payload.role) {
        return null;
      }

      return payload as AccessTokenClaims;
    } catch {
      return null;
    }
  }

  /**
   * Generates a 256-bit cryptographically secure opaque refresh token.
   */
  public static generateOpaqueRefreshToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generates SHA-256 hash of a raw token string for secure server-side database storage.
   */
  public static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }
}
