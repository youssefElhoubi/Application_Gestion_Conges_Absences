import { cookies, headers } from 'next/headers';
import { prisma } from '@/src/infrastructure/db/prisma';
import { AuthSession, UnauthorizedError } from './auth.guard';
import { TokenService } from './token.service';

export class SessionResolver {
  /**
   * Resolves the authenticated session from verified JWT credentials in Server Actions & Route Handlers.
   * Priority:
   * 1. Authorization header: 'Bearer <jwt_access_token>'
   * 2. Cookie: 'access_token'
   *
   * Security Invariants:
   * - Never trusts client-supplied user IDs or unverified headers.
   * - Validates cryptographic signature, expiration, issuer, and audience.
   * - Verifies real-time active status against PostgreSQL database.
   */
  public static async resolve(): Promise<AuthSession | null> {
    try {
      let rawToken: string | null = null;

      // 1. Inspect Authorization Header
      const reqHeaders = await headers();
      const authHeader = reqHeaders.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        rawToken = authHeader.substring(7).trim();
      }

      // 2. Inspect HttpOnly Cookie if no bearer token
      if (!rawToken) {
        const cookieStore = await cookies();
        const cookieVal = cookieStore.get('access_token')?.value;
        if (cookieVal) {
          rawToken = cookieVal.trim();
        }
      }

      if (!rawToken) {
        return null;
      }

      return await this.resolveFromToken(rawToken);
    } catch {
      return null;
    }
  }

  /**
   * Resolves session directly from an incoming Request object (useful for API route testing)
   */
  public static async resolveFromRequest(request: Request): Promise<AuthSession | null> {
    try {
      let rawToken: string | null = null;

      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        rawToken = authHeader.substring(7).trim();
      }

      if (!rawToken) {
        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) {
          const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
          if (match) {
            rawToken = decodeURIComponent(match[1]);
          }
        }
      }

      if (!rawToken) {
        return null;
      }

      return await this.resolveFromToken(rawToken);
    } catch {
      return null;
    }
  }

  /**
   * Verifies JWT access token and fetches real-time authorization context from PostgreSQL.
   */
  public static async resolveFromToken(token: string): Promise<AuthSession | null> {
    const claims = await TokenService.verifyAccessToken(token);
    if (!claims || !claims.sub) {
      return null;
    }

    // Always fetch active status and role from PostgreSQL as the source of truth
    const user = await prisma.user.findUnique({
      where: { id: claims.sub, isActive: true },
      include: {
        employee: {
          include: {
            subordinates: { select: { employeeId: true } },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const managedEmployeeIds =
      user.employee?.subordinates.map((s: { employeeId: string }) => s.employeeId) ?? [];

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      siteId: user.employee?.siteId ?? null,
      managedEmployeeIds,
    };
  }

  /**
   * Enforces that an authenticated session exists or throws UnauthorizedError.
   */
  public static async require(request?: Request): Promise<AuthSession> {
    const session = request
      ? await this.resolveFromRequest(request)
      : await this.resolve();

    if (!session) {
      throw new UnauthorizedError('Authentication required to perform this action.');
    }
    return session;
  }
}
