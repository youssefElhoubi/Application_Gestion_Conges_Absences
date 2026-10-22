import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { CounterService } from '@/src/modules/counters/counter.service';
import { MultiEmployeeCounterQuerySchema } from '@/src/modules/counters/counter.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { extractErrorInfo } from '@/src/server/errors/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = MultiEmployeeCounterQuerySchema.parse(searchParams);
    const result = await CounterService.getMultiEmployeeCounters(query, session);
    return NextResponse.json(serializeForClient(result));
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
