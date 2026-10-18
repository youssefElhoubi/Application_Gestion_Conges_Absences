import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { PasswordService } from '@/src/modules/auth/password.service';
import { TokenService } from '@/src/modules/auth/token.service';
import { SignJWT } from 'jose';
import { POST as postLoginRoute } from '@/src/app/api/auth/login/route';
import { POST as postRefreshRoute } from '@/src/app/api/auth/refresh/route';
import { POST as postLogoutRoute } from '@/src/app/api/auth/logout/route';
import { GET as getAuthMeRoute } from '@/src/app/api/auth/me/route';
import { GET as getMeRoute } from '@/src/app/api/me/route';
import {
  GET as getSessionsRoute,
  POST as postSessionsRoute,
} from '@/src/app/api/auth/sessions/route';

describe('Integration: Authentication Endpoints & Security Invariants', () => {
  const testEmail = 'auth.integration@entreprise.ma';
  const testPassword = 'SecureAuthEndpoint#2026';
  let testUserId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create a base active test user with Argon2id hash
    const passwordHash = await PasswordService.hash(testPassword);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        role: 'EMPLOYEE',
        isActive: true,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  describe('1. POST /api/auth/login', () => {
    it('authenticates valid credentials, sets HttpOnly cookies, returns safe profile and creates session', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Vitest-Test-Agent/1.0',
          'x-forwarded-for': '192.168.1.50',
        },
        body: JSON.stringify({
          email: '  AUTH.INTEGRATION@ENTREPRISE.MA  ', // Tests normalization
          password: testPassword,
        }),
      });

      const res = await postLoginRoute(req);
      expect(res.status).toBe(200);

      // Verify security headers
      expect(res.headers.get('Cache-Control')).toContain('no-store');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');

      // Verify body payload
      const body = await res.json();
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe(testUserId);
      expect(body.user.email).toBe(testEmail);
      expect(body.user.role).toBe('EMPLOYEE');
      expect(body.user.passwordHash).toBeUndefined(); // Never leaked
      expect(body.accessToken).toBeDefined();

      // Verify cookies
      const accessTokenCookie = res.cookies.get('access_token');
      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie?.httpOnly).toBe(true);
      expect(String(accessTokenCookie?.sameSite).toLowerCase()).toBe('lax');

      const refreshTokenCookie = res.cookies.get('refresh_token');
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie?.httpOnly).toBe(true);
      expect(String(refreshTokenCookie?.sameSite).toLowerCase()).toBe('strict');

      // Verify database session creation
      const tokenHash = TokenService.hashToken(refreshTokenCookie!.value);
      const session = await prisma.session.findUnique({
        where: { tokenHash },
      });
      expect(session).not.toBeNull();
      expect(session?.userId).toBe(testUserId);
      expect(session?.isRevoked).toBe(false);

      // Verify lastLoginAt update
      const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(updatedUser?.lastLoginAt).not.toBeNull();
    });

    it('rejects wrong password with generic 401 error', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'IncorrectPassword#999',
        }),
      });

      const res = await postLoginRoute(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Identifiants invalides.');

      // Verify no session was created
      const sessions = await prisma.session.findMany({ where: { userId: testUserId } });
      expect(sessions.length).toBe(0);
    });

    it('rejects non-existent email with generic 401 error (no email enumeration)', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'non.existent@entreprise.ma',
          password: 'AnyPassword#123',
        }),
      });

      const res = await postLoginRoute(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Identifiants invalides.');
    });

    it('rejects deactivated user with 403 Forbidden even with correct password', async () => {
      // Deactivate user
      await prisma.user.update({
        where: { id: testUserId },
        data: { isActive: false },
      });

      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      const res = await postLoginRoute(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('désactivé');

      // No session created
      const sessions = await prisma.session.findMany({ where: { userId: testUserId } });
      expect(sessions.length).toBe(0);
    });

    it('rejects malformed requests (invalid JSON, missing fields) with 400 Bad Request', async () => {
      // Missing password
      const req1 = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });
      const res1 = await postLoginRoute(req1);
      expect(res1.status).toBe(400);

      // Invalid email syntax
      const req2 = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: testPassword }),
      });
      const res2 = await postLoginRoute(req2);
      expect(res2.status).toBe(400);

      // Empty body
      const req3 = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '',
      });
      const res3 = await postLoginRoute(req3);
      expect(res3.status).toBe(400);
    });
  });

  describe('2. GET /api/auth/me and GET /api/me', () => {
    it('returns verified user profile with valid Bearer token', async () => {
      const accessToken = await TokenService.signAccessToken(
        { id: testUserId, email: testEmail, role: 'EMPLOYEE', employeeId: null },
        'sess-mock-01'
      );

      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      const res = await getAuthMeRoute(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.id).toBe(testUserId);
      expect(body.user.email).toBe(testEmail);
      expect(body.user.role).toBe('EMPLOYEE');
    });

    it('returns verified user profile with access_token cookie', async () => {
      const accessToken = await TokenService.signAccessToken(
        { id: testUserId, email: testEmail, role: 'EMPLOYEE', employeeId: null },
        'sess-mock-02'
      );

      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          cookie: `access_token=${accessToken}`,
        },
      });

      const res = await getAuthMeRoute(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.id).toBe(testUserId);
    });

    it('rejects expired JWT token with 401', async () => {
      const secretKey = new TextEncoder().encode(
        process.env.JWT_ACCESS_SECRET || 'dev-insecure-jwt-secret-min-32-chars-long-2026-key!'
      );
      const expiredToken = await new SignJWT({
        email: testEmail,
        role: 'EMPLOYEE',
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(testUserId)
        .setIssuer('absnace-platform')
        .setAudience('absnace-client')
        .setExpirationTime('-10s') // Expired!
        .sign(secretKey);

      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });

      const res = await getAuthMeRoute(req);
      expect(res.status).toBe(401);
    });

    it('rejects tampered or forged JWT token with 401', async () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature';

      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          authorization: `Bearer ${fakeToken}`,
        },
      });

      const res = await getAuthMeRoute(req);
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests without token with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/me');
      const res = await getAuthMeRoute(req);
      expect(res.status).toBe(401);
    });

    it('resolves authenticated session in portal /api/me route', async () => {
      const accessToken = await TokenService.signAccessToken(
        { id: testUserId, email: testEmail, role: 'EMPLOYEE', employeeId: null },
        'sess-mock-03'
      );

      const req = new NextRequest('http://localhost:3000/api/me', {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      const res = await getMeRoute(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.id).toBe(testUserId);
      expect(body.user.email).toBe(testEmail);
    });
  });

  describe('3. POST /api/auth/refresh (RTR, Concurrency & Expiration)', () => {
    it('rotates refresh token, issues new access token, and invalidates previous token', async () => {
      const rawRefreshToken = TokenService.generateOpaqueRefreshToken();
      const tokenHash = TokenService.hashToken(rawRefreshToken);
      const familyId = 'family-test-rtr-01';

      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash,
          familyId,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const req = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: {
          cookie: `refresh_token=${rawRefreshToken}`,
        },
      });

      const res = await postRefreshRoute(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accessToken).toBeDefined();
      expect(body.user.id).toBe(testUserId);

      // Verify new refresh token cookie issued
      const newRefreshTokenCookie = res.cookies.get('refresh_token');
      expect(newRefreshTokenCookie).toBeDefined();
      expect(newRefreshTokenCookie?.value).not.toBe(rawRefreshToken);

      // Old session must be revoked
      const oldSession = await prisma.session.findUnique({ where: { tokenHash } });
      expect(oldSession?.isRevoked).toBe(true);

      // New session must exist with same familyId
      const newTokenHash = TokenService.hashToken(newRefreshTokenCookie!.value);
      const newSession = await prisma.session.findUnique({ where: { tokenHash: newTokenHash } });
      expect(newSession).not.toBeNull();
      expect(newSession?.familyId).toBe(familyId);
      expect(newSession?.isRevoked).toBe(false);
    });

    it('handles concurrent refresh requests atomically without creating duplicate descendants', async () => {
      const rawRefreshToken = TokenService.generateOpaqueRefreshToken();
      const tokenHash = TokenService.hashToken(rawRefreshToken);
      const familyId = 'family-concurrent-test';

      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash,
          familyId,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      // Launch 2 concurrent refresh requests with the EXACT same refresh token
      const makeReq = () =>
        new NextRequest('http://localhost:3000/api/auth/refresh', {
          method: 'POST',
          headers: {
            cookie: `refresh_token=${rawRefreshToken}`,
          },
        });

      const [res1, res2] = await Promise.all([
        postRefreshRoute(makeReq()),
        postRefreshRoute(makeReq()),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly ONE request must succeed (200), and the competing request must be rejected (401)
      expect(statuses).toEqual([200, 401]);

      // Verify that in the database, exactly ONE active session exists in this family
      const activeSessions = await prisma.session.findMany({
        where: { familyId, isRevoked: false },
      });
      // In the case where the loser triggers reuse or concurrency detection, at most 1 active session exists
      expect(activeSessions.length).toBeLessThanOrEqual(1);
    });

    it('detects refresh token reuse and revokes entire family lineage', async () => {
      const familyId = 'family-reuse-compromised';
      const revokedRawToken = TokenService.generateOpaqueRefreshToken();
      const revokedHash = TokenService.hashToken(revokedRawToken);

      const activeRawToken = TokenService.generateOpaqueRefreshToken();
      const activeHash = TokenService.hashToken(activeRawToken);

      // Create revoked session (previously rotated)
      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash: revokedHash,
          familyId,
          isRevoked: true, // Already rotated!
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      // Create active session currently in that family
      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash: activeHash,
          familyId,
          isRevoked: false,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      // Attacker replays the old revoked token
      const req = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: {
          cookie: `refresh_token=${revokedRawToken}`,
        },
      });

      const res = await postRefreshRoute(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('réutilisation');

      // Verify that the active session in that family was revoked as defense!
      const activeSessionAfter = await prisma.session.findUnique({ where: { tokenHash: activeHash } });
      expect(activeSessionAfter?.isRevoked).toBe(true);
    });

    it('rejects expired refresh token (absolute expiration) and marks it revoked', async () => {
      const rawRefreshToken = TokenService.generateOpaqueRefreshToken();
      const tokenHash = TokenService.hashToken(rawRefreshToken);

      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash,
          familyId: 'family-expired-abs',
          isRevoked: false,
          expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        },
      });

      const req = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: {
          cookie: `refresh_token=${rawRefreshToken}`,
        },
      });

      const res = await postRefreshRoute(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('expirée');

      // Verified revoked in database
      const sessionInDb = await prisma.session.findUnique({ where: { tokenHash } });
      expect(sessionInDb?.isRevoked).toBe(true);
    });

    it('rejects refresh when account has been deactivated (403 Forbidden)', async () => {
      const rawRefreshToken = TokenService.generateOpaqueRefreshToken();
      const tokenHash = TokenService.hashToken(rawRefreshToken);

      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash,
          familyId: 'family-deactivated-user',
          isRevoked: false,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      // Deactivate user
      await prisma.user.update({
        where: { id: testUserId },
        data: { isActive: false },
      });

      const req = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: {
          cookie: `refresh_token=${rawRefreshToken}`,
        },
      });

      const res = await postRefreshRoute(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('désactivé');

      // Session must be revoked
      const sessionInDb = await prisma.session.findUnique({ where: { tokenHash } });
      expect(sessionInDb?.isRevoked).toBe(true);
    });

    it('preserves independent sessions across devices without cross-lineage interference', async () => {
      // Device A Session
      const tokenA = TokenService.generateOpaqueRefreshToken();
      const hashA = TokenService.hashToken(tokenA);
      const familyA = 'family-device-phone';

      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash: hashA,
          familyId: familyA,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      // Device B Session
      const tokenB = TokenService.generateOpaqueRefreshToken();
      const hashB = TokenService.hashToken(tokenB);
      const familyB = 'family-device-laptop';

      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash: hashB,
          familyId: familyB,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      // Device A refreshes successfully
      const reqA = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: { cookie: `refresh_token=${tokenA}` },
      });
      const resA = await postRefreshRoute(reqA);
      expect(resA.status).toBe(200);

      // Device B can still refresh successfully without interference!
      const reqB = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: { cookie: `refresh_token=${tokenB}` },
      });
      const resB = await postRefreshRoute(reqB);
      expect(resB.status).toBe(200);

      const bodyB = await resB.json();
      expect(bodyB.user.id).toBe(testUserId);
    });
  });

  describe('4. POST /api/auth/logout and Post-Logout Refresh Defense', () => {
    it('revokes server-side session and clears authentication cookies', async () => {
      const rawRefreshToken = TokenService.generateOpaqueRefreshToken();
      const tokenHash = TokenService.hashToken(rawRefreshToken);

      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash,
          familyId: 'family-logout-test',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const req = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `refresh_token=${rawRefreshToken}`,
        },
      });

      const res = await postLogoutRoute(req);
      expect(res.status).toBe(200);

      // Check session revoked in database
      const sessionInDb = await prisma.session.findUnique({ where: { tokenHash } });
      expect(sessionInDb?.isRevoked).toBe(true);

      // Check cookies cleared (maxAge: 0)
      const accessCookie = res.cookies.get('access_token');
      expect(accessCookie?.maxAge).toBe(0);

      const refreshCookie = res.cookies.get('refresh_token');
      expect(refreshCookie?.maxAge).toBe(0);
    });

    it('rejects refresh attempts after logout (post-logout refresh defense)', async () => {
      const rawRefreshToken = TokenService.generateOpaqueRefreshToken();
      const tokenHash = TokenService.hashToken(rawRefreshToken);

      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash,
          familyId: 'family-post-logout-test',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      // 1. Logout
      const logoutReq = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: { cookie: `refresh_token=${rawRefreshToken}` },
      });
      await postLogoutRoute(logoutReq);

      // 2. Attempt Refresh with the logged-out token
      const refreshReq = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: { cookie: `refresh_token=${rawRefreshToken}` },
      });
      const refreshRes = await postRefreshRoute(refreshReq);

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('5. Session Inspection & Revocation (/api/auth/sessions)', () => {
    it('lists user sessions in safe format without exposing token hashes', async () => {
      const token1 = TokenService.generateOpaqueRefreshToken();
      const token2 = TokenService.generateOpaqueRefreshToken();

      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash: TokenService.hashToken(token1),
          familyId: 'fam-safe-1',
          userAgent: 'Chrome on macOS',
          ipAddress: '10.0.0.1',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash: TokenService.hashToken(token2),
          familyId: 'fam-safe-2',
          userAgent: 'Firefox on Linux',
          ipAddress: '10.0.0.2',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const accessToken = await TokenService.signAccessToken(
        { id: testUserId, email: testEmail, role: 'EMPLOYEE', employeeId: null },
        'sess-mock-inspect'
      );

      const req = new NextRequest('http://localhost:3000/api/auth/sessions', {
        headers: { authorization: `Bearer ${accessToken}` },
      });

      const res = await getSessionsRoute(req);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(Array.isArray(body.sessions)).toBe(true);
      expect(body.sessions.length).toBe(2);

      // Invariant: tokenHash or secrets are NEVER in safe session output
      for (const s of body.sessions) {
        expect(s.id).toBeDefined();
        expect(s.userId).toBe(testUserId);
        expect(s.userAgent).toBeDefined();
        expect(s.ipAddress).toBeDefined();
        expect(s.tokenHash).toBeUndefined();
        expect(s.rawToken).toBeUndefined();
      }
    });

    it('allows revoking a specific session via POST /api/auth/sessions/revoke', async () => {
      const token = TokenService.generateOpaqueRefreshToken();
      const tokenHash = TokenService.hashToken(token);

      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash,
          familyId: 'fam-to-revoke',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const accessToken = await TokenService.signAccessToken(
        { id: testUserId, email: testEmail, role: 'EMPLOYEE', employeeId: null },
        'sess-mock-revoker'
      );

      const req = new NextRequest('http://localhost:3000/api/auth/sessions/revoke', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ sessionId: session.id }),
      });

      const res = await postSessionsRoute(req);
      expect(res.status).toBe(200);

      const sessionAfter = await prisma.session.findUnique({ where: { id: session.id } });
      expect(sessionAfter?.isRevoked).toBe(true);
    });

    it('allows universal revocation of all sessions via POST /api/auth/sessions/revoke with all: true', async () => {
      for (let i = 0; i < 3; i++) {
        await prisma.session.create({
          data: {
            userId: testUserId,
            tokenHash: TokenService.hashToken(TokenService.generateOpaqueRefreshToken()),
            familyId: `fam-multi-${i}`,
            expiresAt: new Date(Date.now() + 3600000),
          },
        });
      }

      const activeBefore = await prisma.session.count({
        where: { userId: testUserId, isRevoked: false },
      });
      expect(activeBefore).toBe(3);

      const accessToken = await TokenService.signAccessToken(
        { id: testUserId, email: testEmail, role: 'EMPLOYEE', employeeId: null },
        'sess-mock-all'
      );

      const req = new NextRequest('http://localhost:3000/api/auth/sessions/revoke', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ all: true }),
      });

      const res = await postSessionsRoute(req);
      expect(res.status).toBe(200);

      const activeAfter = await prisma.session.count({
        where: { userId: testUserId, isRevoked: false },
      });
      expect(activeAfter).toBe(0);
    });
  });
});
