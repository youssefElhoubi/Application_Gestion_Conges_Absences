import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { CreateAbsenceSchema } from '@/src/modules/absences/absence.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { revalidateAbsencePaths } from '@/src/modules/absences/absence-revalidation';
import { extractErrorInfo } from '@/src/server/errors/api-error-handler';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    const absence = await AbsenceService.getAbsenceById(BigInt(id), session);
    return NextResponse.json(serializeForClient(absence));
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const validated = CreateAbsenceSchema.parse(body);
    const updated = await AbsenceService.updateAbsenceRequest(BigInt(id), validated, session);

    // Centrally revalidate all affected views
    revalidateAbsencePaths(updated.id, updated.employeeId);

    return NextResponse.json(serializeForClient(updated));
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}


