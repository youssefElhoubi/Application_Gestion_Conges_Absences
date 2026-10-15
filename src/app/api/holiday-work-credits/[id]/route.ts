import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { HolidayWorkCreditService } from '@/src/modules/holiday-work-credits/holiday-work-credit.service';
import { CorrectHolidayCreditSchema } from '@/src/modules/holiday-work-credits/holiday-work-credit.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

interface CustomError {
  statusCode?: number;
  message?: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    const credit = await HolidayWorkCreditService.getCreditById(BigInt(id), session);
    return NextResponse.json(serializeForClient(credit));
  } catch (error: unknown) {
    const err = error as CustomError;
    const status = err.statusCode ?? 400;
    return NextResponse.json({ error: err.message || 'Erreur lors du chargement du crédit.' }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    const body = await request.json();
    const validated = CorrectHolidayCreditSchema.parse(body);
    const updated = await HolidayWorkCreditService.correctCredit(BigInt(id), validated, session);
    return NextResponse.json(serializeForClient(updated));
  } catch (error: unknown) {
    const err = error as CustomError;
    const status = err.statusCode ?? 400;
    return NextResponse.json({ error: err.message || 'Erreur lors de la mise à jour du crédit.' }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    const deleted = await HolidayWorkCreditService.deleteCredit(BigInt(id), session);
    return NextResponse.json(serializeForClient(deleted));
  } catch (error: unknown) {
    const err = error as CustomError;
    const status = err.statusCode ?? 400;
    return NextResponse.json({ error: err.message || 'Erreur lors de la suppression du crédit.' }, { status });
  }
}
