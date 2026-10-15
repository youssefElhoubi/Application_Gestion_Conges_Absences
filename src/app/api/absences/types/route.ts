import { NextResponse } from 'next/server';
import { prisma } from '@/src/infrastructure/db/prisma';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function GET() {
  try {
    const types = await prisma.absenceType.findMany({
      where: { active: true },
      include: {
        absenceReasons: {
          where: { active: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(serializeForClient(types));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch absence types';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
