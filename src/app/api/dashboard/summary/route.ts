import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { DashboardService } from '@/src/modules/dashboard/dashboard.service';
import { DashboardFilterSchema } from '@/src/modules/dashboard/dashboard.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { extractErrorInfo } from '@/src/server/errors/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const filter = DashboardFilterSchema.parse(searchParams);
    const summary = await DashboardService.getSummary(filter, session);
    return NextResponse.json(serializeForClient(summary));
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
