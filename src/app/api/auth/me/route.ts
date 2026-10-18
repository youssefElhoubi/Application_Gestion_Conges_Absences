import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

/**
 * Current User Authentication Endpoint
 * Returns verified user profile and authorization scope derived strictly from database.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await SessionResolver.require(request);

    return NextResponse.json(
      serializeForClient({
        user: {
          id: session.userId,
          email: session.email,
          role: session.role,
          employeeId: session.employeeId,
          siteId: session.siteId,
          managedEmployeeIds: session.managedEmployeeIds,
        },
      }),
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
        },
      }
    );
  } catch (error: unknown) {
    const status = (error as { statusCode?: number })?.statusCode ?? 401;
    const message =
      error instanceof Error ? error.message : 'Authentification requise pour cette ressource.';
    return NextResponse.json(
      { error: message },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
