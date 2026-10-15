import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { HolidayWorkCreditService } from '@/src/modules/holiday-work-credits/holiday-work-credit.service';
import {
  GrantHolidayCreditSchema,
  HolidayCreditQuerySchema,
} from '@/src/modules/holiday-work-credits/holiday-work-credit.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

interface CustomError {
  statusCode?: number;
  message?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = HolidayCreditQuerySchema.parse(searchParams);
    const result = await HolidayWorkCreditService.listCredits(query, session);
    return NextResponse.json(serializeForClient(result));
  } catch (error: unknown) {
    const err = error as CustomError;
    const status = err.statusCode ?? 400;
    return NextResponse.json({ error: err.message || 'Erreur lors de la récupération des crédits.' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const body = await request.json();
    const validated = GrantHolidayCreditSchema.parse(body);
    const credit = await HolidayWorkCreditService.grantCredit(validated, session);
    return NextResponse.json(serializeForClient(credit), { status: 201 });
  } catch (error: unknown) {
    const err = error as CustomError;
    const status = err.statusCode ?? 400;
    return NextResponse.json({ error: err.message || "Erreur lors de l'attribution du crédit." }, { status });
  }
}
