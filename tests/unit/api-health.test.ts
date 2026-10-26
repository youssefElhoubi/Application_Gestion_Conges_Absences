import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/src/app/api/health/route';
import { prisma } from '@/src/infrastructure/db/prisma';
import { proxy } from '@/src/proxy';
import { NextRequest } from 'next/server';

describe('Unit: Health Endpoint (GET /api/health)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns HTTP 200 with status "ok" and database "connected" when database check succeeds', async () => {
    vi.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([{ '?column?': 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate');

    const body = await response.json();
    expect(body).toEqual({
      status: 'ok',
      database: 'connected',
    });
  });

  it('returns HTTP 503 with status "error" and database "disconnected" when database connectivity fails', async () => {
    const dbError = new Error('connect ECONNREFUSED 127.0.0.1:5432 - sensitive credentials postgres:secret');
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(dbError);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate');

    const body = await response.json();
    expect(body).toEqual({
      status: 'error',
      database: 'disconnected',
    });

    // Verify sensitive database error details are never exposed
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('ECONNREFUSED');
    expect(serialized).not.toContain('postgres');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('stack');
  });

  it('allows unauthenticated health check probe requests through proxy', () => {
    const req = new NextRequest('http://localhost:3000/api/health', {
      method: 'GET',
    });

    const res = proxy(req);

    // Should not redirect to /login and should not return 401
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
});
