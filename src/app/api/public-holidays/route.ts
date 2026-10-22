import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { PublicHolidayService } from '@/src/modules/public-holidays/public-holiday.service';
import {
  CreatePublicHolidaySchema,
  PublicHolidayQuerySchema,
} from '@/src/modules/public-holidays/public-holiday.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { extractErrorInfo } from '@/src/server/errors/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = PublicHolidayQuerySchema.parse(searchParams);
    const result = await PublicHolidayService.listHolidays(query, session);
    return NextResponse.json(serializeForClient(result));
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const body = await request.json();
    const validated = CreatePublicHolidaySchema.parse(body);
    const holiday = await PublicHolidayService.createHoliday(validated, session);
    return NextResponse.json(serializeForClient(holiday), { status: 201 });
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
