import { prisma } from '@/src/infrastructure/db/prisma';

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds: number;
  delayMs: number;
  remainingPoints: number;
}

export interface RateLimiterConfig {
  maxAttemptsPerWindow: number; // Max allowed failed attempts per window before hard throttle (e.g. 10)
  windowSeconds: number;        // Time window in seconds (e.g. 300s = 5 minutes)
  baseDelayMs: number;          // Base delay multiplier for progressive backoff (e.g. 1000ms)
  maxDelayMs: number;           // Maximum delay cap (e.g. 10,000ms)
}

export class RateLimiterService {
  private static readonly DEFAULT_CONFIG: RateLimiterConfig = {
    maxAttemptsPerWindow: Number(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || 10),
    windowSeconds: Number(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS || 300), // 5 minutes
    baseDelayMs: Number(process.env.AUTH_RATE_LIMIT_BASE_DELAY_MS || 1000),   // 1 second base
    maxDelayMs: Number(process.env.AUTH_RATE_LIMIT_MAX_DELAY_MS || 10000),    // 10 seconds cap
  };

  /**
   * Resolves client IP address with proxy-trust verification.
   * Only trusts forwarded headers (X-Forwarded-For / X-Real-IP) when TRUSTED_PROXY is enabled.
   */
  public static extractClientIp(headers: Headers): string {
    const isTrustedProxy = process.env.TRUSTED_PROXY === 'true';

    if (isTrustedProxy) {
      const forwardedFor = headers.get('x-forwarded-for');
      if (forwardedFor) {
        // First IP in comma-separated list is the original client
        const clientIp = forwardedFor.split(',')[0].trim();
        if (clientIp) return clientIp;
      }

      const realIp = headers.get('x-real-ip');
      if (realIp?.trim()) {
        return realIp.trim();
      }
    }

    return '127.0.0.1';
  }

  /**
   * Generates composite rate-limiting keys.
   * Multi-signal protection prevents distributed brute force while blocking denial-of-service against third-party accounts.
   */
  public static buildKeys(clientIp: string, normalizedEmail?: string) {
    const sanitizedIp = clientIp.trim();
    const sanitizedEmail = normalizedEmail ? normalizedEmail.trim().toLowerCase() : null;

    return {
      ipKey: `auth:ip:${sanitizedIp}`,
      pairKey: sanitizedEmail ? `auth:pair:${sanitizedIp}:${sanitizedEmail}` : null,
      accountKey: sanitizedEmail ? `auth:account:${sanitizedEmail}` : null,
    };
  }

  /**
   * Calculates progressive backoff delay based on consecutive failed attempts.
   * Attempts 1-2: 0ms
   * Attempt 3: 1,000ms
   * Attempt 4: 2,000ms
   * Attempt 5: 4,000ms
   * Attempt 6+: 8,000ms (capped at maxDelayMs)
   */
  public static calculateProgressiveDelay(attemptPoints: number, config: RateLimiterConfig = this.DEFAULT_CONFIG): number {
    if (attemptPoints <= 2) {
      return 0;
    }
    const exponentialFactor = Math.pow(2, attemptPoints - 3);
    const delay = exponentialFactor * config.baseDelayMs;
    return Math.min(delay, config.maxDelayMs);
  }

  /**
   * Checks if an authentication attempt is currently allowed and calculates progressive delay.
   */
  public static async checkAttempt(
    clientIp: string,
    normalizedEmail?: string,
    config: RateLimiterConfig = this.DEFAULT_CONFIG
  ): Promise<RateLimitCheckResult> {
    const now = new Date();
    const { ipKey, pairKey } = this.buildKeys(clientIp, normalizedEmail);

    // Primary inspection on composite pairKey (or ipKey if no account)
    const targetKey = pairKey ?? ipKey;

    const record = await prisma.rateLimitLedger.findUnique({
      where: { key: targetKey },
    });

    if (!record) {
      return {
        allowed: true,
        retryAfterSeconds: 0,
        delayMs: 0,
        remainingPoints: config.maxAttemptsPerWindow,
      };
    }

    // Check if window has expired
    if (record.resetAt <= now) {
      // Window expired, clean up ledger asynchronously
      await prisma.rateLimitLedger.delete({ where: { key: targetKey } }).catch(() => null);
      return {
        allowed: true,
        retryAfterSeconds: 0,
        delayMs: 0,
        remainingPoints: config.maxAttemptsPerWindow,
      };
    }

    // Check if currently blocked by progressive delay window
    if (record.blockedUntil && record.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((record.blockedUntil.getTime() - now.getTime()) / 1000);
      return {
        allowed: false,
        retryAfterSeconds,
        delayMs: 0,
        remainingPoints: Math.max(0, config.maxAttemptsPerWindow - record.points),
      };
    }

    // Calculate current progressive delay
    const delayMs = this.calculateProgressiveDelay(record.points, config);
    const isExceeded = record.points >= config.maxAttemptsPerWindow;

    return {
      allowed: !isExceeded,
      retryAfterSeconds: isExceeded ? Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000) : 0,
      delayMs,
      remainingPoints: Math.max(0, config.maxAttemptsPerWindow - record.points),
    };
  }

  /**
   * Records a failed authentication attempt across distributed database store.
   * Applies progressive delay timestamp for subsequent attempts.
   */
  public static async recordFailedAttempt(
    clientIp: string,
    normalizedEmail?: string,
    config: RateLimiterConfig = this.DEFAULT_CONFIG
  ): Promise<{ points: number; delayMs: number }> {
    const now = new Date();
    const windowResetAt = new Date(now.getTime() + config.windowSeconds * 1000);
    const { pairKey, ipKey } = this.buildKeys(clientIp, normalizedEmail);
    const targetKey = pairKey ?? ipKey;

    // Atomic upsert with points increment
    const entry = await prisma.rateLimitLedger.upsert({
      where: { key: targetKey },
      create: {
        key: targetKey,
        points: 1,
        lastAttempt: now,
        resetAt: windowResetAt,
      },
      update: {
        points: { increment: 1 },
        lastAttempt: now,
      },
    });

    const progressiveDelayMs = this.calculateProgressiveDelay(entry.points, config);

    // If progressive delay applies, set blockedUntil timestamp
    if (progressiveDelayMs > 0) {
      const blockedUntil = new Date(now.getTime() + progressiveDelayMs);
      await prisma.rateLimitLedger.update({
        where: { id: entry.id },
        data: { blockedUntil },
      });
    }

    return {
      points: entry.points,
      delayMs: progressiveDelayMs,
    };
  }

  /**
   * Clears accumulated failed points upon successful authentication for the IP/account pair.
   */
  public static async resetOnSuccess(clientIp: string, normalizedEmail: string): Promise<void> {
    const { pairKey } = this.buildKeys(clientIp, normalizedEmail);
    if (pairKey) {
      await prisma.rateLimitLedger.delete({ where: { key: pairKey } }).catch(() => null);
    }
  }

  /**
   * Alias for resetOnSuccess
   */
  public static async resetLedger(clientIp: string, normalizedEmail?: string): Promise<void> {
    if (normalizedEmail) {
      await this.resetOnSuccess(clientIp, normalizedEmail);
    }
  }

  /**
   * Cleans up expired entries across the distributed store.
   */
  public static async pruneExpiredRecords(): Promise<number> {
    const result = await prisma.rateLimitLedger.deleteMany({
      where: { resetAt: { lt: new Date() } },
    });
    return result.count;
  }
}
