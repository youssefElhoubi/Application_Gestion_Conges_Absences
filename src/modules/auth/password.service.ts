import { hash, verify, type Algorithm } from '@node-rs/argon2';

/**
 * Enterprise Password Service using Argon2id
 * Meets OWASP Password Hashing guidelines (RFC 9106):
 * - Algorithm: Argon2id (resistant against both GPU side-channel and memory-tradeoff attacks)
 * - Memory cost: 19456 KiB (~19 MiB)
 * - Time cost: 2 iterations
 * - Parallelism: 1 thread
 */
export class PasswordService {
  private static readonly ARGON2_CONFIG = {
    algorithm: 2 as unknown as Algorithm, // Argon2id (Algorithm.Argon2id = 2)
    memoryCost: 19456, // 19 MiB
    timeCost: 2,       // 2 iterations
    parallelism: 1,    // 1 lane
  };

  /**
   * Hashes a plaintext password using Argon2id.
   * Returns standard modular crypt-formatted hash string:
   * e.g. $argon2id$v=19$m=19456,t=2,p=1$...
   */
  public static async hash(password: string): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string.');
    }
    return await hash(password, this.ARGON2_CONFIG);
  }

  /**
   * Verifies a plaintext password against an Argon2id hash.
   * Employs constant-time internal comparison.
   * Returns false safely if verification fails or hash is malformed.
   */
  public static async verify(storedHash: string, candidatePassword: string): Promise<boolean> {
    if (!storedHash || !candidatePassword || typeof storedHash !== 'string' || typeof candidatePassword !== 'string') {
      return false;
    }
    try {
      return await verify(storedHash, candidatePassword);
    } catch {
      return false;
    }
  }

  /**
   * Performance diagnostic benchmark.
   * Validates hashing latency on host environment.
   */
  public static async benchmark(): Promise<{ durationMs: number; hashLength: number }> {
    const start = performance.now();
    const testHash = await this.hash('P@sswordDiagnosticBenchmark#2026');
    const durationMs = performance.now() - start;
    return {
      durationMs: Math.round(durationMs * 100) / 100,
      hashLength: testHash.length,
    };
  }
}
