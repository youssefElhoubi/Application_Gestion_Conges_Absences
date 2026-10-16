import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { CreateAbsenceSchema, AbsenceQuerySchema } from '@/src/modules/absences/absence.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function GET(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = AbsenceQuerySchema.parse(searchParams);
    const result = await AbsenceService.listAbsences(query, session);
    return NextResponse.json(serializeForClient(result));
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const body = await request.json();
    const validated = CreateAbsenceSchema.parse(body);
    const created = await AbsenceService.createAbsenceRequest(validated, session);
    revalidatePath('/absences');
    revalidatePath('/portal/requests');
    revalidatePath('/');
    return NextResponse.json(serializeForClient(created), { status: 201 });
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
