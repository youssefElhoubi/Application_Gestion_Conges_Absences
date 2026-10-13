import { prisma } from '@/src/infrastructure/db/prisma';
import { AuthSession, AuthGuard, ForbiddenError } from '../auth/auth.guard';
import {
  DashboardMetricsFilter,
  DashboardMetricsResponse,
  PendingRequestTypeBreakdown,
} from './dashboard-metrics.schema';

export class DashboardMetricsService {
  /**
   * Retrieves and calculates the 5 core dashboard metrics with database-side aggregation and strict RBAC.
   */
  public static async getDashboardMetrics(
    filter: DashboardMetricsFilter,
    session: AuthSession
  ): Promise<DashboardMetricsResponse> {
    AuthGuard.requireAuthenticated(session);

    // 1. Resolve date boundaries
    const { periodStart, periodEnd, mode } = this.resolvePeriodBounds(filter);

    // 2. Build and enforce Role-Based Employee Scope
    const employeeScope = this.resolveEmployeeScope(filter, session);

    // 3. Execute database-side aggregations in parallel
    const [
      activeEmployeesCount,
      validatedLeaveAggregate,
      recoveryCreditAggregate,
      pendingRecoveryAbsencesAggregate,
      unjustifiedAbsenceAggregate,
      pendingRequestsCount,
      pendingByTypeGroup,
    ] = await Promise.all([
      // Metric 1: Active Employees (Current state count)
      prisma.employee.count({
        where: {
          ...employeeScope,
          active: true,
        },
      }),

      // Metric 2: Validated Leave Days (Approved annual paid leave within period)
      prisma.absence.aggregate({
        where: {
          status: 'APPROVED',
          type: { code: 'CONGE_PAYE' }, // Strictly annual paid leave
          ...(periodStart && periodEnd
            ? {
                startDate: { lte: periodEnd },
                endDate: { gte: periodStart },
              }
            : {}),
          employee: employeeScope,
        },
        _sum: { retainedDays: true },
      }),

      // Metric 3: Recovery Days Available (Current unconsumed credit ledger)
      prisma.holidayWorkCredit.aggregate({
        where: {
          isFullyConsumed: false,
          employee: {
            ...employeeScope,
            active: true,
          },
        },
        _sum: {
          creditedDays: true,
          consumedDays: true,
        },
      }),

      // Metric 3 Auxiliary: Recovery Days Reserved by Pending Requests
      prisma.absence.aggregate({
        where: {
          status: 'PENDING',
          type: { code: 'RECUPERATION' },
          employee: employeeScope,
        },
        _sum: { retainedDays: true },
      }),

      // Metric 4: Unjustified Absences (Days and count within period)
      prisma.absence.aggregate({
        where: {
          status: 'APPROVED',
          type: { code: 'ABSENCE_INJUSTIFIEE' },
          ...(periodStart && periodEnd
            ? {
                startDate: { lte: periodEnd },
                endDate: { gte: periodStart },
              }
            : {}),
          employee: employeeScope,
        },
        _sum: { retainedDays: true },
        _count: { id: true },
      }),

      // Metric 5: Leave Requests Pending Approval (Count)
      prisma.absence.count({
        where: this.buildPendingRequestsWhere(employeeScope, session),
      }),

      // Metric 5 Auxiliary: Pending requests broken down by absence type
      prisma.absence.groupBy({
        by: ['typeId'],
        where: this.buildPendingRequestsWhere(employeeScope, session),
        _count: { id: true },
      }),
    ]);

    // 4. Calculate Net Values
    const activeEmployees = activeEmployeesCount;

    const validatedLeaveDays = Number(validatedLeaveAggregate._sum.retainedDays ?? 0);

    const totalEarnedCredits = Number(recoveryCreditAggregate._sum.creditedDays ?? 0);
    const totalConsumedCredits = Number(recoveryCreditAggregate._sum.consumedDays ?? 0);
    const recoveryDaysAvailable = Math.max(0, Math.round((totalEarnedCredits - totalConsumedCredits) * 100) / 100);
    const recoveryDaysReserved = Number(pendingRecoveryAbsencesAggregate._sum.retainedDays ?? 0);

    const nonJustifiedAbsenceDays = Number(unjustifiedAbsenceAggregate._sum.retainedDays ?? 0);
    const nonJustifiedAbsenceCount = unjustifiedAbsenceAggregate._count.id;

    const pendingLeaveRequests = pendingRequestsCount;

    // 5. Enrich pending breakdown with type labels
    const pendingRequestsByType = await this.enrichPendingTypes(pendingByTypeGroup);

    return {
      activeEmployees,
      validatedLeaveDays,
      recoveryDaysAvailable,
      nonJustifiedAbsenceDays,
      pendingLeaveRequests,

      nonJustifiedAbsenceCount,
      recoveryDaysReserved,
      pendingRequestsByType,

      generatedAt: new Date().toISOString(),
      period: {
        startDate: periodStart ? periodStart.toISOString().split('T')[0] : null,
        endDate: periodEnd ? periodEnd.toISOString().split('T')[0] : null,
        mode,
      },
      appliedFilters: {
        siteId: filter.siteId ?? null,
        employeeId: filter.employeeId ?? (session.role === 'EMPLOYEE' ? session.employeeId : null),
        userScopeRole: session.role,
      },
    };
  }

  /**
   * Resolves reporting date boundaries based on filter input and mode
   */
  private static resolvePeriodBounds(filter: DashboardMetricsFilter): {
    periodStart: Date | null;
    periodEnd: Date | null;
    mode: string;
  } {
    const now = new Date();

    if (filter.startDate && filter.endDate) {
      const s = new Date(filter.startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(filter.endDate);
      e.setHours(23, 59, 59, 999);
      return { periodStart: s, periodEnd: e, mode: 'custom' };
    }

    if (filter.periodMode === 'current_month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { periodStart: s, periodEnd: e, mode: 'current_month' };
    }

    if (filter.periodMode === 'all_time') {
      return { periodStart: null, periodEnd: null, mode: 'all_time' };
    }

    // Default: current_year
    const s = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    const e = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { periodStart: s, periodEnd: e, mode: 'current_year' };
  }

  /**
   * Enforces role-based employee scoping
   */
  private static resolveEmployeeScope(filter: DashboardMetricsFilter, session: AuthSession): any {
    const scope: any = {};

    if (session.role === 'EMPLOYEE') {
      // Employees are strictly restricted to their own records
      if (!session.employeeId) {
        throw new ForbiddenError('No employee record linked to current user session.');
      }
      scope.employeeId = session.employeeId;
      return scope;
    }

    if (session.role === 'SUPERVISOR') {
      // Supervisors can only access direct subordinates or self
      const allowedIds = [...session.managedEmployeeIds];
      if (session.employeeId) allowedIds.push(session.employeeId);

      if (filter.employeeId) {
        if (!allowedIds.includes(filter.employeeId)) {
          throw new ForbiddenError(`Supervisor is not authorized to access employee "${filter.employeeId}".`);
        }
        scope.employeeId = filter.employeeId;
      } else {
        scope.employeeId = { in: allowedIds };
      }

      if (filter.siteId) {
        scope.siteId = filter.siteId;
      }

      return scope;
    }

    // ADMIN or HR_MANAGER
    if (filter.siteId) {
      scope.siteId = filter.siteId;
    }

    if (filter.employeeId) {
      scope.employeeId = filter.employeeId;
    }

    return scope;
  }

  /**
   * Builds the WHERE clause for Metric 5 (Pending Requests) incorporating approver scope
   */
  private static buildPendingRequestsWhere(employeeScope: any, session: AuthSession): any {
    const where: any = {
      status: 'PENDING',
      employee: employeeScope,
    };

    if (session.role === 'SUPERVISOR') {
      // Supervisor sees only pending requests from reporting subordinates (excluding self-approval)
      where.employeeId = { in: session.managedEmployeeIds };
    } else if (session.role === 'EMPLOYEE') {
      // Employee sees only their own pending requests
      where.employeeId = session.employeeId;
    }

    return where;
  }

  /**
   * Enriches groupBy results with human-readable type labels
   */
  private static async enrichPendingTypes(
    groups: Array<{ typeId: number; _count: { id: number } }>
  ): Promise<PendingRequestTypeBreakdown[]> {
    if (groups.length === 0) return [];

    const typeIds = groups.map((g) => g.typeId);
    const types = await prisma.absenceType.findMany({
      where: { id: { in: typeIds } },
      select: { id: true, code: true, name: true },
    });
    const typeMap = new Map(types.map((t: any) => [t.id, t]));

    return groups.map((g) => {
      const t = typeMap.get(g.typeId);
      return {
        typeCode: t?.code ?? 'UNKNOWN',
        typeName: t?.name ?? 'Unknown Type',
        count: g._count.id,
      };
    });
  }
}
