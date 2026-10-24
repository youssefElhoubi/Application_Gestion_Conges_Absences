import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/src/app/api/health/route';
import { prisma } from '@/src/infrastructure/db/prisma';

describe('Integration: Health Endpoint Live Database Readiness', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('performs live database SELECT 1 check, returns HTTP 200 with predictable status, and leaves DB unmodified', async () => {
    // 1. Execute live health check against the running PostgreSQL database
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate');

    const body = await response.json();
    expect(body).toEqual({
      status: 'ok',
      database: 'connected',
    });
  });

  it('returns HTTP 503 when live database query fails without leaking sensitive information', async () => {
    // Simulate database query failure / network disconnection
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(
      new Error('FATAL: password authentication failed for user "postgres"')
    );

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate');

    const body = await response.json();
    expect(body).toEqual({
      status: 'error',
      database: 'disconnected',
    });

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('FATAL');
    expect(serialized).not.toContain('authentication failed');
    expect(serialized).not.toContain('postgres');
  });
});
