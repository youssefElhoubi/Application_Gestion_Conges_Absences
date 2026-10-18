import { describe, it, expect } from 'vitest';
import { TokenService } from '@/src/modules/auth/token.service';
import { SignJWT } from 'jose';

describe('Unit: TokenService (JWT & Opaque Refresh Tokens)', () => {
  const mockUser = {
    id: 'usr-test-101',
    email: 'test.user@entreprise.ma',
    role: 'SUPERVISOR' as const,
    employeeId: 'MAT-9901',
  };
  const mockSessionId = 'sess-test-abc-123';

  it('1. Signs and verifies a valid JWT access token with all required claims', async () => {
    const token = await TokenService.signAccessToken(mockUser, mockSessionId);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // Header.Payload.Signature

    const claims = await TokenService.verifyAccessToken(token);
    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe(mockUser.id);
    expect(claims?.email).toBe(mockUser.email);
    expect(claims?.role).toBe(mockUser.role);
    expect(claims?.employeeId).toBe(mockUser.employeeId);
    expect(claims?.sessionId).toBe(mockSessionId);
    expect(claims?.iss).toBe('absnace-platform');
    expect(claims?.aud).toBe('absnace-client');
    expect(claims?.exp).toBeDefined();
    expect(claims?.iat).toBeDefined();
  });

  it('2. Rejects expired JWT access tokens gracefully', async () => {
    const secretKey = new TextEncoder().encode(
      process.env.JWT_ACCESS_SECRET || 'dev-insecure-jwt-secret-min-32-chars-long-2026-key!'
    );

    // Manually issue an already expired token (-10 seconds)
    const expiredToken = await new SignJWT({
      email: mockUser.email,
      role: mockUser.role,
      employeeId: mockUser.employeeId,
      sessionId: mockSessionId,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(mockUser.id)
      .setIssuer('absnace-platform')
      .setAudience('absnace-client')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 100)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(secretKey);

    const result = await TokenService.verifyAccessToken(expiredToken);
    expect(result).toBeNull();
  });

  it('3. Rejects tokens signed with an unauthorized/different secret', async () => {
    const wrongSecret = new TextEncoder().encode('unauthorized-impostor-secret-key-32-chars!');
    const forgedToken = await new SignJWT({
      email: mockUser.email,
      role: 'ADMIN',
      employeeId: null,
      sessionId: 'fake-session',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject('usr-attacker')
      .setIssuer('absnace-platform')
      .setAudience('absnace-client')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(wrongSecret);

    const result = await TokenService.verifyAccessToken(forgedToken);
    expect(result).toBeNull();
  });

  it('4. Rejects tokens with invalid issuer or audience', async () => {
    const secretKey = new TextEncoder().encode(
      process.env.JWT_ACCESS_SECRET || 'dev-insecure-jwt-secret-min-32-chars-long-2026-key!'
    );

    const wrongAudienceToken = await new SignJWT({
      email: mockUser.email,
      role: mockUser.role,
      sessionId: mockSessionId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(mockUser.id)
      .setIssuer('absnace-platform')
      .setAudience('malicious-audience')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secretKey);

    const result = await TokenService.verifyAccessToken(wrongAudienceToken);
    expect(result).toBeNull();
  });

  it('5. Rejects null, empty, or malformed token strings', async () => {
    expect(await TokenService.verifyAccessToken('')).toBeNull();
    expect(await TokenService.verifyAccessToken('invalid.jwt.structure')).toBeNull();
    expect(await TokenService.verifyAccessToken(null as unknown as string)).toBeNull();
  });

  it('6. Generates high-entropy opaque refresh tokens with base64url encoding', () => {
    const token1 = TokenService.generateOpaqueRefreshToken();
    const token2 = TokenService.generateOpaqueRefreshToken();

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
    // 32 bytes in base64url is 43 characters without padding
    expect(token1.length).toBeGreaterThanOrEqual(42);
    // Base64url characters: A-Z, a-z, 0-9, -, _
    expect(/^[A-Za-z0-9_-]+$/.test(token1)).toBe(true);
  });

  it('7. Generates deterministic SHA-256 token hash for database storage', () => {
    const rawToken = 'sample_refresh_token_string_12345';
    const hash1 = TokenService.hashToken(rawToken);
    const hash2 = TokenService.hashToken(rawToken);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex digest is exactly 64 characters
    expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);

    const differentHash = TokenService.hashToken('different_token_string');
    expect(hash1).not.toBe(differentHash);
  });
});
