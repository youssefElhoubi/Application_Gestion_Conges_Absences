import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { RejectAbsenceSchema } from '@/src/modules/absences/absence.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    const body = await request.json();
    const validated = RejectAbsenceSchema.parse(body);
    const rejected = await AbsenceService.rejectAbsence(BigInt(id), validated, session);
    return NextResponse.json(serializeForClient(rejected));
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
