import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    const absence = await AbsenceService.getAbsenceById(BigInt(id), session);
    return NextResponse.json(serializeForClient(absence));
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const updated = await AbsenceService.updateAbsenceRequest(BigInt(id), body, session);

    // Revalidate affected views
    revalidatePath('/absences');
    revalidatePath(`/absences/${id}`);
    revalidatePath('/portal/requests');
    revalidatePath(`/portal/requests/${id}`);
    revalidatePath('/portal');
    revalidatePath('/leave-balances');
    revalidatePath('/');

    return NextResponse.json(serializeForClient(updated));
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}


