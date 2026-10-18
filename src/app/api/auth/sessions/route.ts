import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { AuthService } from '@/src/modules/auth/auth.service';
import { AuthGuard, ForbiddenError, UnauthorizedError } from '@/src/modules/auth/auth.guard';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { z } from 'zod';

const RevokeSessionSchema = z.object({
  sessionId: z.string().optional(),
  all: z.boolean().optional(),
  userId: z.string().optional(),
});

/**
 * GET /api/auth/sessions
 * Returns safe session list (never exposes raw tokens or token hashes).
 * Regular users inspect their own sessions; ADMIN/HR_MANAGER can inspect target users.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await SessionResolver.require(request);
    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId') || session.userId;

    if (targetUserId !== session.userId) {
      AuthGuard.requireRole(session, ['ADMIN', 'HR_MANAGER']);
    }

    const sessions = await AuthService.listUserSessions(targetUserId);

    return NextResponse.json(
      serializeForClient({
        sessions: sessions.map((s) => ({
          ...s,
          isCurrent: s.id === session.userId,
        })),
      }),
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/sessions/revoke
 * Revokes a single session or all active sessions for a user.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await SessionResolver.require(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête JSON invalide.' },
        { status: 400 }
      );
    }

    const parsed = RevokeSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Paramètres de révocation invalides.' },
        { status: 400 }
      );
    }

    const { sessionId, all, userId } = parsed.data;

    // Revoke all sessions
    if (all) {
      const targetUserId = userId || session.userId;
      if (targetUserId !== session.userId) {
        AuthGuard.requireRole(session, ['ADMIN', 'HR_MANAGER']);
      }

      const count = await AuthService.revokeAllUserSessions(targetUserId);
      return NextResponse.json({
        message: `${count} session(s) révoquée(s) avec succès.`,
      });
    }

    // Revoke single session
    if (sessionId) {
      const isPrivileged =
        session.role === 'ADMIN' || session.role === 'HR_MANAGER';
      const revoked = await AuthService.revokeSessionById(
        sessionId,
        isPrivileged ? undefined : session.userId
      );

      if (!revoked) {
        return NextResponse.json(
          { error: 'Session introuvable ou déjà révoquée.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: 'Session révoquée avec succès.',
      });
    }

    return NextResponse.json(
      { error: 'Veuillez spécifier un sessionId ou all: true.' },
      { status: 400 }
    );
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
