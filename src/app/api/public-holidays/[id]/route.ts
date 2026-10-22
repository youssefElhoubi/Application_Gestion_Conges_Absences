import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { PublicHolidayService } from '@/src/modules/public-holidays/public-holiday.service';
import { UpdatePublicHolidaySchema } from '@/src/modules/public-holidays/public-holiday.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { extractErrorInfo } from '@/src/server/errors/api-error-handler';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    const holiday = await PublicHolidayService.getHolidayById(BigInt(id), session);
    return NextResponse.json(serializeForClient(holiday));
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
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
    const validated = UpdatePublicHolidaySchema.parse(body);
    const updated = await PublicHolidayService.updateHoliday(BigInt(id), validated, session);
    return NextResponse.json(serializeForClient(updated));
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    const deleted = await PublicHolidayService.deleteHoliday(BigInt(id), session);
    return NextResponse.json(serializeForClient(deleted));
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
