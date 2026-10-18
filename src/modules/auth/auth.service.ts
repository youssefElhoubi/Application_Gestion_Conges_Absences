import crypto from 'node:crypto';
import { prisma } from '@/src/infrastructure/db/prisma';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { RateLimiterService } from './rate-limiter.service';
import { LoginInput, SafeUserProfile } from './auth.schema';
import { UnauthorizedError, ForbiddenError, TooManyRequestsError } from './auth.guard';

// Precomputed valid Argon2id hash for constant-time comparison against non-existent accounts
// Mitigates username enumeration via response-time variance
const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$u8fPcmOQ209W4s5v$Yq9oG5G17VfXz3r9M5Yf6Q7K8l9M0n1O2p3Q4r5S6t8';

export interface AuthSuccessResult {
  user: SafeUserProfile;
  accessToken: string;
  rawRefreshToken: string;
}

export class AuthService {
  /**
   * Authenticates user credentials with multi-signal rate limiting,
   * progressive backoff delays, timing-safe verification, and session persistence.
   */
  public static async login(
    input: LoginInput,
    meta: { ip: string; userAgent?: string | null }
  ): Promise<AuthSuccessResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const clientIp = meta.ip.trim();

    // 1. Rate Limiter Inspection
    const check = await RateLimiterService.checkAttempt(clientIp, normalizedEmail);
    if (!check.allowed) {
      throw new TooManyRequestsError(
        'Trop de tentatives de connexion infructueuses. Veuillez réessayer plus tard.',
        check.retryAfterSeconds
      );
    }

    // 2. Progressive Delay Backoff (sleep if previous failures accrued)
    if (check.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, check.delayMs));
    }

    // 3. User Identity Lookup
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        employeeId: true,
      },
    });

    // 4. Constant-Time Timing Defense: Execute hash verification even if user does not exist
    if (!user) {
      await PasswordService.verify(DUMMY_ARGON2_HASH, input.password);
      await RateLimiterService.recordFailedAttempt(clientIp, normalizedEmail);
      throw new UnauthorizedError('Identifiants invalides.');
    }

    // 5. Password Hash Verification
    const isPasswordValid = await PasswordService.verify(user.passwordHash, input.password);
    if (!isPasswordValid) {
      await RateLimiterService.recordFailedAttempt(clientIp, normalizedEmail);
      throw new UnauthorizedError('Identifiants invalides.');
    }

    // 6. Account Status Verification
    if (!user.isActive) {
      await RateLimiterService.recordFailedAttempt(clientIp, normalizedEmail);
      throw new ForbiddenError(
        'Ce compte est désactivé. Veuillez contacter un administrateur RH.'
      );
    }

    // 7. Successful Authentication: Reset Rate Limiter Ledger
    await RateLimiterService.resetLedger(clientIp, normalizedEmail);

    // 8. Update Last Login Timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 9. Create Persistent Relational Session with Hashed Refresh Token
    const rawRefreshToken = TokenService.generateOpaqueRefreshToken();
    const tokenHash = TokenService.hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + TokenService.REFRESH_TOKEN_MAX_AGE_SECONDS * 1000
    );

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        userAgent: meta.userAgent ? meta.userAgent.slice(0, 255) : null,
        ipAddress: clientIp.slice(0, 45),
        expiresAt,
      },
    });

    // 10. Issue Signed Short-Lived JWT Access Token
    const accessToken = await TokenService.signAccessToken(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      },
      session.id
    );

    const safeUser: SafeUserProfile = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    };

    return {
      user: safeUser,
      accessToken,
      rawRefreshToken,
    };
  }

  /**
   * Performs Refresh Token Rotation (RTR).
   * Implements token family reuse detection: revokes entire lineage upon reuse.
   */
  public static async refresh(
    rawRefreshToken: string,
    meta: { ip: string; userAgent?: string | null }
  ): Promise<AuthSuccessResult> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedError('Jeton de rafraîchissement requis.');
    }

    const tokenHash = TokenService.hashToken(rawRefreshToken);

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            employeeId: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedError('Session invalide ou expirée.');
    }

    // Reuse Detection: If an already revoked token is submitted, revoke the entire family lineage
    if (session.isRevoked) {
      await prisma.session.updateMany({
        where: { familyId: session.familyId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedError(
        'Tentative de réutilisation de jeton détectée. Session révoquée.'
      );
    }

    // Expiration Verification
    if (session.expiresAt <= new Date()) {
      await prisma.session.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedError('Session expirée. Veuillez vous reconnecter.');
    }

    // Account Status Verification
    if (!session.user.isActive) {
      await prisma.session.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });
      throw new ForbiddenError('Ce compte est désactivé.');
    }

    // Invalidate the current session token (single-use rotation)
    await prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // Create next session in the same lineage family
    const newRawRefreshToken = TokenService.generateOpaqueRefreshToken();
    const newTokenHash = TokenService.hashToken(newRawRefreshToken);
    const expiresAt = new Date(
      Date.now() + TokenService.REFRESH_TOKEN_MAX_AGE_SECONDS * 1000
    );

    const newSession = await prisma.session.create({
      data: {
        userId: session.userId,
        tokenHash: newTokenHash,
        familyId: session.familyId,
        userAgent: meta.userAgent ? meta.userAgent.slice(0, 255) : session.userAgent,
        ipAddress: meta.ip.slice(0, 45),
        expiresAt,
      },
    });

    // Issue new Access Token
    const accessToken = await TokenService.signAccessToken(
      {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        employeeId: session.user.employeeId,
      },
      newSession.id
    );

    const safeUser: SafeUserProfile = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      employeeId: session.user.employeeId,
    };

    return {
      user: safeUser,
      accessToken,
      rawRefreshToken: newRawRefreshToken,
    };
  }

  /**
   * Revokes the current session and invalidates refresh credentials server-side.
   * Note: Issued JWT access tokens remain cryptographically valid until their
   * short-lived expiration (15 minutes).
   */
  public static async logout(
    rawRefreshToken?: string | null,
    sessionId?: string | null
  ): Promise<{ success: boolean }> {
    if (rawRefreshToken) {
      const tokenHash = TokenService.hashToken(rawRefreshToken);
      await prisma.session
        .updateMany({
          where: { tokenHash },
          data: { isRevoked: true },
        })
        .catch(() => null);
    }

    if (sessionId) {
      await prisma.session
        .updateMany({
          where: { id: sessionId },
          data: { isRevoked: true },
        })
        .catch(() => null);
    }

    return { success: true };
  }

  /**
   * Retrieves current authenticated user profile directly from database
   */
  public static async getCurrentUser(userId: string): Promise<SafeUserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        email: true,
        role: true,
        employeeId: true,
      },
    });

    return user;
  }
}
