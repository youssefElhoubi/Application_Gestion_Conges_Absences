import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { ApproveAbsenceSchema } from '@/src/modules/absences/absence.schema';
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
    const validated = ApproveAbsenceSchema.parse(body);
    const approved = await AbsenceService.approveAbsence(BigInt(id), validated, session);

    // Revalidate affected views for HR and employees
    revalidateAbsencePaths(approved.id, approved.employeeId);

    return NextResponse.json(serializeForClient(approved));
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
