import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { RateLimiterService } from '@/src/modules/auth/rate-limiter.service';
import { prisma } from '@/src/infrastructure/db/prisma';

describe('Unit: RateLimiterService (Multi-Signal & Progressive Delays)', () => {
  const testIp = '198.51.100.42';
  const testEmail = 'employee.test@entreprise.ma';
  let isDbTableAvailable = false;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1 FROM "RateLimitLedger" LIMIT 1`;
      isDbTableAvailable = true;
    } catch {
      isDbTableAvailable = false;
    }
  });

  beforeEach(async () => {
    // Clean up rate limit ledger before each scenario if available
    try {
      await prisma.rateLimitLedger.deleteMany({
        where: {
          OR: [
            { key: { contains: testIp } },
            { key: { contains: testEmail } },
          ],
        },
      });
    } catch {
      // Table may not exist yet in fresh pre-migration databases
    }
  });

  afterAll(async () => {
    try {
      await prisma.rateLimitLedger.deleteMany({
        where: {
          OR: [
            { key: { contains: testIp } },
            { key: { contains: testEmail } },
          ],
        },
      });
    } catch {
      // Table may not exist yet in fresh pre-migration databases
    }
  });

  it('1. Extracts client IP without proxy trust by default (prevents header spoofing)', () => {
    const originalEnv = process.env.TRUSTED_PROXY;
    delete process.env.TRUSTED_PROXY;

    const headers = new Headers({
      'x-forwarded-for': '203.0.113.195, 10.0.0.1',
      'x-real-ip': '203.0.113.195',
    });

    const ip = RateLimiterService.extractClientIp(headers);
    expect(ip).toBe('127.0.0.1'); // Does not blindly trust headers when TRUSTED_PROXY is off

    process.env.TRUSTED_PROXY = originalEnv;
  });

  it('2. Extracts client IP from X-Forwarded-For when TRUSTED_PROXY is enabled', () => {
    const originalEnv = process.env.TRUSTED_PROXY;
    process.env.TRUSTED_PROXY = 'true';

    const headers = new Headers({
      'x-forwarded-for': '203.0.113.195, 192.168.1.50',
    });

    const ip = RateLimiterService.extractClientIp(headers);
    expect(ip).toBe('203.0.113.195');

    process.env.TRUSTED_PROXY = originalEnv;
  });

  it('2b. Prioritizes platform-verified x-vercel-ip over client-supplied x-forwarded-for', () => {
    const originalEnv = process.env.TRUSTED_PROXY;
    process.env.TRUSTED_PROXY = 'true';

    const headers = new Headers({
      'x-vercel-ip': '198.51.100.99',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      'x-real-ip': '10.0.0.1',
    });

    const ip = RateLimiterService.extractClientIp(headers);
    expect(ip).toBe('198.51.100.99'); // Vercel edge header takes absolute precedence

    process.env.TRUSTED_PROXY = originalEnv;
  });

  it('2c. Prioritizes x-real-ip when x-vercel-ip is absent', () => {
    const originalEnv = process.env.TRUSTED_PROXY;
    process.env.TRUSTED_PROXY = 'true';

    const headers = new Headers({
      'x-real-ip': '198.51.100.44',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });

    const ip = RateLimiterService.extractClientIp(headers);
    expect(ip).toBe('198.51.100.44');

    process.env.TRUSTED_PROXY = originalEnv;
  });

  it('2d. Supports valid IPv6 client addresses', () => {
    const originalEnv = process.env.TRUSTED_PROXY;
    process.env.TRUSTED_PROXY = 'true';

    const headers = new Headers({
      'x-vercel-ip': '2001:db8:85a3::8a2e:370:7334',
    });

    const ip = RateLimiterService.extractClientIp(headers);
    expect(ip).toBe('2001:db8:85a3::8a2e:370:7334');

    process.env.TRUSTED_PROXY = originalEnv;
  });

  it('2e. Rejects malformed or injected IP headers and falls back safely', () => {
    const originalEnv = process.env.TRUSTED_PROXY;
    process.env.TRUSTED_PROXY = 'true';

    // Malformed leading value followed by valid IP
    const headers1 = new Headers({
      'x-forwarded-for': '<script>alert(1)</script>, 198.51.100.55',
    });
    expect(RateLimiterService.extractClientIp(headers1)).toBe('198.51.100.55');

    // Completely invalid IPs
    const headers2 = new Headers({
      'x-vercel-ip': 'not-an-ip',
      'x-real-ip': '999.999.999.999',
      'x-forwarded-for': 'garbage, also-garbage',
    });
    expect(RateLimiterService.extractClientIp(headers2)).toBe('127.0.0.1');

    process.env.TRUSTED_PROXY = originalEnv;
  });

  it('3. Builds multi-signal composite keys (IP, Pair, Account)', () => {
    const keys = RateLimiterService.buildKeys(' 192.168.1.1 ', ' User@Domain.MA ');
    expect(keys.ipKey).toBe('auth:ip:192.168.1.1');
    expect(keys.pairKey).toBe('auth:pair:192.168.1.1:user@domain.ma');
    expect(keys.accountKey).toBe('auth:account:user@domain.ma');
  });

  it('4. Calculates progressive backoff delay accurately', () => {
    const config = {
      maxAttemptsPerWindow: 10,
      windowSeconds: 300,
      baseDelayMs: 1000,
      maxDelayMs: 8000,
    };

    // Attempts 1 and 2 incur 0ms delay
    expect(RateLimiterService.calculateProgressiveDelay(1, config)).toBe(0);
    expect(RateLimiterService.calculateProgressiveDelay(2, config)).toBe(0);

    // Attempt 3: 2^0 * 1000 = 1,000ms
    expect(RateLimiterService.calculateProgressiveDelay(3, config)).toBe(1000);

    // Attempt 4: 2^1 * 1000 = 2,000ms
    expect(RateLimiterService.calculateProgressiveDelay(4, config)).toBe(2000);

    // Attempt 5: 2^2 * 1000 = 4,000ms
    expect(RateLimiterService.calculateProgressiveDelay(5, config)).toBe(4000);

    // Attempt 6: 2^3 * 1000 = 8,000ms (capped at maxDelayMs 8000ms)
    expect(RateLimiterService.calculateProgressiveDelay(6, config)).toBe(8000);
    expect(RateLimiterService.calculateProgressiveDelay(10, config)).toBe(8000);
  });

  it('5. Allows initial attempt when no prior failed attempts exist', async ({ skip }) => {
    if (!isDbTableAvailable) {
      skip('Skipped: public.RateLimitLedger table is not available (pre-migration database)');
      return;
    }
    const check = await RateLimiterService.checkAttempt(testIp, testEmail);
    expect(check.allowed).toBe(true);
    expect(check.delayMs).toBe(0);
    expect(check.retryAfterSeconds).toBe(0);
  });

  it('6. Records failed attempts and accumulates progressive delay timestamps in DB', async ({ skip }) => {
    if (!isDbTableAvailable) {
      skip('Skipped: public.RateLimitLedger table is not available (pre-migration database)');
      return;
    }
    // Record first failed attempt
    const r1 = await RateLimiterService.recordFailedAttempt(testIp, testEmail);
    expect(r1.points).toBe(1);
    expect(r1.delayMs).toBe(0);

    // Record second failed attempt
    const r2 = await RateLimiterService.recordFailedAttempt(testIp, testEmail);
    expect(r2.points).toBe(2);
    expect(r2.delayMs).toBe(0);

    // Record third failed attempt (triggers 1000ms delay)
    const r3 = await RateLimiterService.recordFailedAttempt(testIp, testEmail);
    expect(r3.points).toBe(3);
    expect(r3.delayMs).toBe(1000);

    // Verify DB ledger entry
    const { pairKey } = RateLimiterService.buildKeys(testIp, testEmail);
    const ledger = await prisma.rateLimitLedger.findUnique({ where: { key: pairKey! } });
    expect(ledger).not.toBeNull();
    expect(ledger?.points).toBe(3);
    expect(ledger?.blockedUntil).toBeDefined();
  });

  it('7. Resets accumulated points on successful authentication', async ({ skip }) => {
    if (!isDbTableAvailable) {
      skip('Skipped: public.RateLimitLedger table is not available (pre-migration database)');
      return;
    }
    await RateLimiterService.recordFailedAttempt(testIp, testEmail);
    await RateLimiterService.recordFailedAttempt(testIp, testEmail);

    const { pairKey } = RateLimiterService.buildKeys(testIp, testEmail);
    let ledger = await prisma.rateLimitLedger.findUnique({ where: { key: pairKey! } });
    expect(ledger).not.toBeNull();

    await RateLimiterService.resetOnSuccess(testIp, testEmail);
    ledger = await prisma.rateLimitLedger.findUnique({ where: { key: pairKey! } });
    expect(ledger).toBeNull();
  });
});
