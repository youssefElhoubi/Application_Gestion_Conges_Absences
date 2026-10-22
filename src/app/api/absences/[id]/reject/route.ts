import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { RejectAbsenceSchema } from '@/src/modules/absences/absence.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { revalidateAbsencePaths } from '@/src/modules/absences/absence-revalidation';
import { extractErrorInfo } from '@/src/server/errors/api-error-handler';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const validated = RejectAbsenceSchema.parse(body);
    const rejected = await AbsenceService.rejectAbsence(BigInt(id), validated, session);

    // Revalidate affected views for HR and employees
    revalidateAbsencePaths(rejected.id, rejected.employeeId);

    return NextResponse.json(serializeForClient(rejected));
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
