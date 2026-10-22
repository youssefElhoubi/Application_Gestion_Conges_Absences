import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { DashboardMetricsService } from '@/src/modules/dashboard/dashboard-metrics.service';
import { DashboardMetricsFilterSchema } from '@/src/modules/dashboard/dashboard-metrics.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { extractErrorInfo } from '@/src/server/errors/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const filter = DashboardMetricsFilterSchema.parse(searchParams);
    const metrics = await DashboardMetricsService.getDashboardMetrics(filter, session);
    return NextResponse.json(serializeForClient(metrics));
  } catch (error: unknown) {
    const { statusCode, message, code } = extractErrorInfo(error);
    return NextResponse.json(
      {
        error: message || 'Failed to retrieve dashboard metrics.',
        code: code ?? 'DASHBOARD_METRICS_ERROR',
      },
      { status: statusCode }
    );
  }
}
