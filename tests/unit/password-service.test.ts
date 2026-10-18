import { describe, it, expect } from 'vitest';
import { PasswordService } from '@/src/modules/auth/password.service';

describe('Unit: PasswordService (Argon2id)', () => {
  const samplePassword = 'StrongCorporatePassword#2026';

  it('1. Generates valid Argon2id hash containing standard modular crypt identifiers', async () => {
    const hash = await PasswordService.hash(samplePassword);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    // Must start with $argon2id$ and specify v=19, m=19456, t=2, p=1
    expect(hash.startsWith('$argon2id$v=19$m=19456,t=2,p=1$')).toBe(true);
  });

  it('2. Successfully verifies the correct password against its generated hash', async () => {
    const hash = await PasswordService.hash(samplePassword);
    const isValid = await PasswordService.verify(hash, samplePassword);
    expect(isValid).toBe(true);
  });

  it('3. Rejects an incorrect password with constant-time return', async () => {
    const hash = await PasswordService.hash(samplePassword);
    const isValid = await PasswordService.verify(hash, 'WrongPasswordEntirely');
    expect(isValid).toBe(false);
  });

  it('4. Generates unique salts resulting in distinct hashes for identical passwords', async () => {
    const hash1 = await PasswordService.hash(samplePassword);
    const hash2 = await PasswordService.hash(samplePassword);
    expect(hash1).not.toBe(hash2);
    expect(await PasswordService.verify(hash1, samplePassword)).toBe(true);
    expect(await PasswordService.verify(hash2, samplePassword)).toBe(true);
  });

  it('5. Gracefully rejects malformed or null hashes without throwing errors', async () => {
    expect(await PasswordService.verify('', samplePassword)).toBe(false);
    expect(await PasswordService.verify('not_a_valid_argon2_hash', samplePassword)).toBe(false);
    expect(await PasswordService.verify('$argon2id$v=19$corrupted_payload', samplePassword)).toBe(false);
  });

  it('6. Rejects empty passwords during hashing attempt', async () => {
    await expect(PasswordService.hash('')).rejects.toThrow('Password must be a non-empty string.');
  });

  it('7. Benchmarks hashing latency to ensure reasonable authentication performance (< 250ms)', async () => {
    const benchmark = await PasswordService.benchmark();
    expect(benchmark.durationMs).toBeGreaterThan(0);
    expect(benchmark.durationMs).toBeLessThan(250); // Well under reasonable latency budget
    expect(benchmark.hashLength).toBeGreaterThan(50);
  });
});
