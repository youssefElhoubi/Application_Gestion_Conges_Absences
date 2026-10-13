import { z } from 'zod';

export const DashboardMetricsFilterSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  siteId: z.coerce.number().int().positive().optional(),
  employeeId: z.string().trim().min(2).max(50).optional(),
  periodMode: z.enum(['custom', 'current_year', 'current_month', 'all_time']).default('current_year'),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  {
    message: 'endDate cannot precede startDate.',
    path: ['endDate'],
  }
);

export type DashboardMetricsFilter = z.output<typeof DashboardMetricsFilterSchema>;
export type DashboardMetricsFilterInput = z.input<typeof DashboardMetricsFilterSchema>;

export interface PendingRequestTypeBreakdown {
  typeCode: string;
  typeName: string;
  count: number;
}

export interface DashboardMetricsResponse {
  // 5 Core Metrics
  activeEmployees: number;
  validatedLeaveDays: number;
  recoveryDaysAvailable: number;
  nonJustifiedAbsenceDays: number;
  pendingLeaveRequests: number;

  // Secondary & Auxiliary Context
  nonJustifiedAbsenceCount: number;
  recoveryDaysReserved: number; // Pending recovery leave requests not yet debited
  pendingRequestsByType: PendingRequestTypeBreakdown[];

  // Meta & Scope Information
  generatedAt: string;
  period: {
    startDate: string | null;
    endDate: string | null;
    mode: string;
  };
  appliedFilters: {
    siteId: number | null;
    employeeId: string | null;
    userScopeRole: string;
  };
}
