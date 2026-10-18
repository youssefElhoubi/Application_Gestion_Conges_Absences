import crypto from 'node:crypto';
import { prisma } from '@/src/infrastructure/db/prisma';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { RateLimiterService } from './rate-limiter.service';
import { LoginInput, SafeUserProfile } from './auth.schema';
import { UnauthorizedError, ForbiddenError, TooManyRequestsError } from './auth.guard';
import { AuthConfig } from '@/src/infrastructure/config/auth.config';

// Precomputed valid Argon2id hash for constant-time comparison against non-existent accounts
// Mitigates username enumeration via response-time variance
const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$u8fPcmOQ209W4s5v$Yq9oG5G17VfXz3r9M5Yf6Q7K8l9M0n1O2p3Q4r5S6t8';

export interface AuthSuccessResult {
  user: SafeUserProfile;
  accessToken: string;
  rawRefreshToken: string;
}

export interface SafeSessionInfo {
  id: string;
  userId: string;
  familyId: string;
  userAgent: string | null;
  ipAddress: string | null;
  isRevoked: boolean;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
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
   * Performs Refresh Token Rotation (RTR) atomically inside a PostgreSQL transaction.
   * Concurrency Protection:
   * Uses an atomic update claim (isRevoked: false -> isRevoked: true) within the transaction
   * to guarantee that competing concurrent requests cannot create multiple descendants.
   *
   * Reuse Detection:
   * If an already revoked token is submitted, the entire family lineage is immediately revoked.
   *
   * Expiration:
   * Enforces both absolute expiration (expiresAt) and idle inactivity expiration (IDLE_TIMEOUT_SECONDS).
   */
  public static async refresh(
    rawRefreshToken: string,
    meta: { ip: string; userAgent?: string | null }
  ): Promise<AuthSuccessResult> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedError('Jeton de rafraîchissement requis.');
    }

    const tokenHash = TokenService.hashToken(rawRefreshToken);
    const now = new Date();

    // 1. Inspect session record
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

    // 2. Reuse Detection: If token was already revoked, immediately persist family revocation
    if (session.isRevoked) {
      await prisma.session.updateMany({
        where: { familyId: session.familyId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedError(
        'Tentative de réutilisation de jeton détectée. Session révoquée.'
      );
    }

    // 3. Absolute Expiration Verification: Persist revocation
    if (session.expiresAt <= now) {
      await prisma.session.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedError(
        'Session expirée (délai absolu dépassé). Veuillez vous reconnecter.'
      );
    }

    // 4. Idle Inactivity Expiration Verification: Persist revocation
    const idleTimeoutMs = AuthConfig.IDLE_TIMEOUT_SECONDS * 1000;
    if (
      idleTimeoutMs > 0 &&
      now.getTime() - session.updatedAt.getTime() > idleTimeoutMs
    ) {
      await prisma.session.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedError(
        'Session expirée pour inactivité. Veuillez vous reconnecter.'
      );
    }

    // 5. Account Status Verification: Disabling account revokes all user sessions
    if (!session.user.isActive) {
      await prisma.session.updateMany({
        where: { userId: session.userId },
        data: { isRevoked: true },
      });
      throw new ForbiddenError('Ce compte est désactivé.');
    }

    // 6. Concurrency-Safe Atomic Claim & Rotation Transaction
    try {
      return await prisma.$transaction(async (tx) => {
        // Atomically mark current token revoked only if it is currently active.
        const claimResult = await tx.session.updateMany({
          where: {
            id: session.id,
            isRevoked: false,
          },
          data: {
            isRevoked: true,
          },
        });

        if (claimResult.count === 0) {
          throw new UnauthorizedError(
            'Concurrence de rafraîchissement détectée ou jeton déjà consommé.'
          );
        }

        // 7. Create next session in the same lineage family
        const newRawRefreshToken = TokenService.generateOpaqueRefreshToken();
        const newTokenHash = TokenService.hashToken(newRawRefreshToken);
        const expiresAt = new Date(
          now.getTime() + TokenService.REFRESH_TOKEN_MAX_AGE_SECONDS * 1000
        );

        const newSession = await tx.session.create({
          data: {
            userId: session.userId,
            tokenHash: newTokenHash,
            familyId: session.familyId,
            userAgent: meta.userAgent ? meta.userAgent.slice(0, 255) : session.userAgent,
            ipAddress: meta.ip.slice(0, 45),
            expiresAt,
          },
        });

        // 8. Issue new signed JWT Access Token
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
      });
    } catch (err) {
      if (
        err instanceof UnauthorizedError &&
        err.message.includes('Concurrence')
      ) {
        // Concurrency collision: ensure family revocation is committed
        await prisma.session
          .updateMany({
            where: { familyId: session.familyId },
            data: { isRevoked: true },
          })
          .catch(() => null);
      }
      throw err;
    }
  }

  /**
   * Revokes the current session and invalidates refresh credentials server-side.
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
   * Retrieves active/past sessions for a user in a safe format (never exposes token hashes).
   */
  public static async listUserSessions(userId: string): Promise<SafeSessionInfo[]> {
    const sessions = await prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        familyId: true,
        userAgent: true,
        ipAddress: true,
        isRevoked: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      familyId: s.familyId,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      isRevoked: s.isRevoked,
      createdAt: s.createdAt,
      lastActiveAt: s.updatedAt,
      expiresAt: s.expiresAt,
    }));
  }

  /**
   * Revokes a specific session by its ID.
   */
  public static async revokeSessionById(
    sessionId: string,
    userId?: string
  ): Promise<boolean> {
    const whereClause: { id: string; userId?: string } = { id: sessionId };
    if (userId) {
      whereClause.userId = userId;
    }

    const result = await prisma.session.updateMany({
      where: whereClause,
      data: { isRevoked: true },
    });

    return result.count > 0;
  }

  /**
   * Revokes all active sessions for a user (e.g. account disabled or universal logout).
   */
  public static async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return result.count;
  }

  /**
   * Revokes an entire token family lineage (e.g. on compromise/reuse detection).
   */
  public static async revokeFamily(familyId: string): Promise<number> {
    const result = await prisma.session.updateMany({
      where: { familyId, isRevoked: false },
      data: { isRevoked: true },
    });
    return result.count;
  }

  /**
   * Retrieves current authenticated user profile directly from database.
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
