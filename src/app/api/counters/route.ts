import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { CounterService } from '@/src/modules/counters/counter.service';
import { MultiEmployeeCounterQuerySchema } from '@/src/modules/counters/counter.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function GET(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = MultiEmployeeCounterQuerySchema.parse(searchParams);
    const result = await CounterService.getMultiEmployeeCounters(query, session);
    return NextResponse.json(serializeForClient(result));
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
