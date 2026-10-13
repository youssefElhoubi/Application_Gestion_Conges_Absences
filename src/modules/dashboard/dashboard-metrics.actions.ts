'use server';

import { SessionResolver } from '../auth/session.resolver';
import { DashboardMetricsService } from './dashboard-metrics.service';
import {
  DashboardMetricsFilterSchema,
  DashboardMetricsFilterInput,
} from './dashboard-metrics.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function getDashboardMetricsAction(rawFilter: DashboardMetricsFilterInput = {}) {
  try {
    const session = await SessionResolver.require();
    const validated = DashboardMetricsFilterSchema.parse(rawFilter);
    const result = await DashboardMetricsService.getDashboardMetrics(validated, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to retrieve dashboard metrics.',
      code: error.code ?? 'DASHBOARD_METRICS_ERROR',
    };
  }
}
