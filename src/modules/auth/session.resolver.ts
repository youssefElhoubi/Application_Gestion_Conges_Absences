import { cookies, headers } from 'next/headers';
import { prisma } from '@/src/infrastructure/db/prisma';
import { AuthSession, UnauthorizedError } from './auth.guard';

export class SessionResolver {
  /**
   * Resolves the authenticated session in Server Actions and Route Handlers.
   * Priority:
   * 1. Authorization header (Bearer token / session ID)
   * 2. Cookie ('session_token' or 'auth_user_id')
   * 3. Header 'x-user-id' (useful for API clients & test mocks)
   */
  public static async resolve(): Promise<AuthSession | null> {
    try {
      let userId: string | null = null;

      // Check headers
      const reqHeaders = await headers();
      const authHeader = reqHeaders.get('authorization');
      const directUserHeader = reqHeaders.get('x-user-id');

      if (directUserHeader) {
        userId = directUserHeader;
      } else if (authHeader && authHeader.startsWith('Bearer ')) {
        userId = authHeader.substring(7).trim();
      } else {
        // Check cookies
        const cookieStore = await cookies();
        const cookieVal = cookieStore.get('auth_user_id')?.value || cookieStore.get('session_token')?.value;
        if (cookieVal) {
          userId = cookieVal;
        }
      }

      if (!userId) {
        return null;
      }

      // Fetch user from database
      const user = await prisma.user.findUnique({
        where: { id: userId, isActive: true },
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

      const managedEmployeeIds = user.employee?.subordinates.map((s: { employeeId: string }) => s.employeeId) ?? [];

      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        siteId: user.employee?.siteId ?? null,
        managedEmployeeIds,
      };
    } catch {
      return null;
    }
  }

  public static async require(): Promise<AuthSession> {
    const session = await this.resolve();
    if (!session) {
      throw new UnauthorizedError('Authentication required to perform this action.');
    }
    return session;
  }
}
