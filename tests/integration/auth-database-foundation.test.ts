import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { PasswordService } from '@/src/modules/auth/password.service';
import { TokenService } from '@/src/modules/auth/token.service';
import { seedDatabase } from '@/prisma/seed';

describe('Integration: Authentication Database Foundation', () => {
  const testEmail = 'foundation.test@entreprise.ma';
  const testPassword = 'SecureFoundationPassword#2026';

  beforeEach(async () => {
    // Clean up test data
    await prisma.session.deleteMany({
      where: { user: { email: testEmail } },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: { user: { email: testEmail } },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  it('1. Persists User with Argon2id hash and verifies password successfully', async () => {
    const passwordHash = await PasswordService.hash(testPassword);
    expect(passwordHash.startsWith('$argon2id$')).toBe(true);

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        role: 'EMPLOYEE',
        isActive: true,
      },
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.passwordHash).toBe(passwordHash);

    // Verify authentication against database-stored hash
    const isValid = await PasswordService.verify(user.passwordHash, testPassword);
    expect(isValid).toBe(true);

    const isInvalid = await PasswordService.verify(user.passwordHash, 'WrongPassword#999');
    expect(isInvalid).toBe(false);
  });

  it('2. Supports updating security audit columns (lastLoginAt, passwordChangedAt)', async () => {
    const passwordHash = await PasswordService.hash(testPassword);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    const now = new Date();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: now,
        passwordChangedAt: now,
      },
    });

    expect(updated.lastLoginAt).toBeDefined();
    expect(updated.passwordChangedAt).toBeDefined();
    expect(new Date(updated.lastLoginAt!).getTime()).toBe(now.getTime());
  });

  it('3. Persists Session with hashed refresh token and relation to User', async () => {
    const passwordHash = await PasswordService.hash(testPassword);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        role: 'SUPERVISOR',
        isActive: true,
      },
    });

    const rawRefreshToken = TokenService.generateOpaqueRefreshToken();
    const tokenHash = TokenService.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId: 'family-test-01',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.1.100',
        expiresAt,
      },
      include: {
        user: { select: { email: true, role: true } },
      },
    });

    expect(session.id).toBeDefined();
    expect(session.userId).toBe(user.id);
    expect(session.tokenHash).toBe(tokenHash);
    expect(session.isRevoked).toBe(false);
    expect(session.user.email).toBe(testEmail);
    expect(session.user.role).toBe('SUPERVISOR');
  });

  it('4. Enforces unique constraint on Session.tokenHash (prevents duplicate tokens)', async () => {
    const passwordHash = await PasswordService.hash(testPassword);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        role: 'EMPLOYEE',
      },
    });

    const duplicateTokenHash = TokenService.hashToken('shared_token_payload');
    const expiresAt = new Date(Date.now() + 3600000);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: duplicateTokenHash,
        expiresAt,
      },
    });

    // Attempting to insert duplicate tokenHash must reject
    await expect(
      prisma.session.create({
        data: {
          userId: user.id,
          tokenHash: duplicateTokenHash,
          expiresAt,
        },
      })
    ).rejects.toThrow();
  });

  it('5. Cascades session deletion when parent User is deleted', async () => {
    const passwordHash = await PasswordService.hash(testPassword);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        role: 'EMPLOYEE',
      },
    });

    const tokenHash = TokenService.hashToken(TokenService.generateOpaqueRefreshToken());
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const sessionsBefore = await prisma.session.count({ where: { userId: user.id } });
    expect(sessionsBefore).toBe(1);

    // Delete user
    await prisma.user.delete({ where: { id: user.id } });

    // Sessions must be cascade deleted automatically
    const sessionsAfter = await prisma.session.count({ where: { userId: user.id } });
    expect(sessionsAfter).toBe(0);
  });

  it('6. Verifies seeded test/development users have valid, verifiable Argon2id hashes', async () => {
    await seedDatabase();

    const adminUser = await prisma.user.findUnique({
      where: { id: 'usr-admin-default' },
    });
    expect(adminUser).not.toBeNull();
    expect(adminUser?.email).toBe('admin@entreprise.ma');
    expect(adminUser?.passwordHash.startsWith('$argon2id$')).toBe(true);

    const isAdminPasswordValid = await PasswordService.verify(
      adminUser!.passwordHash,
      process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!'
    );
    expect(isAdminPasswordValid).toBe(true);

    const employeeUser = await prisma.user.findUnique({
      where: { id: 'usr-emp-alami' },
    });
    expect(employeeUser).not.toBeNull();
    expect(employeeUser?.email).toBe('fz.alami@entreprise.ma');
    expect(employeeUser?.passwordHash.startsWith('$argon2id$')).toBe(true);

    const isEmpPasswordValid = await PasswordService.verify(
      employeeUser!.passwordHash,
      process.env.SEED_EMPLOYEE_PASSWORD || 'EmployeePassword123!'
    );
    expect(isEmpPasswordValid).toBe(true);
  });
});
