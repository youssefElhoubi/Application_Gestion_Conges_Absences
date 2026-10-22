import { prisma } from '@/src/infrastructure/db/prisma';
import { Prisma } from '@/src/generated/prisma';
import { AuthSession, AuthGuard } from '../auth/auth.guard';
import { DashboardFilter } from './dashboard.schema';

export class DashboardService {
  /**
   * Retrieves aggregated dashboard summary metrics with role-based scoping
   */
  public static async getSummary(filter: DashboardFilter, session: AuthSession) {
    AuthGuard.requireAuthenticated(session);

    const year = filter.year ?? new Date().getFullYear();
    const periodStart = filter.month
      ? new Date(year, filter.month - 1, 1)
      : new Date(year, 0, 1);
    const periodEnd = filter.month
      ? new Date(year, filter.month, 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59);

    // Build site and role scoping
    const employeeScope: Prisma.EmployeeWhereInput = {};
    if (filter.siteId) employeeScope.siteId = filter.siteId;

    if (session.role === 'SUPERVISOR') {
      employeeScope.OR = [
        ...(session.employeeId ? [{ employeeId: session.employeeId }] : []),
        { employeeId: { in: session.managedEmployeeIds } },
      ];
    } else if (session.role === 'EMPLOYEE') {
      if (session.employeeId) {
        employeeScope.employeeId = session.employeeId;
      }
    }

    const [
      totalActiveEmployees,
      pendingRequestsCount,
      pendingForUserScopeCount,
      approvedAbsencesAggregate,
      absencesByCategory,
      employeesBySite,
      recoveryCreditsAggregate,
    ] = await Promise.all([
      // 1. Total Active Employees
      prisma.employee.count({
        where: { ...employeeScope, active: true },
      }),

      // 2. Global pending requests (scoped by site/filter)
      prisma.absence.count({
        where: {
          status: 'PENDING',
          employee: employeeScope,
        },
      }),

      // 3. Pending requests requiring current user's approval
      prisma.absence.count({
        where: {
          status: 'PENDING',
          employeeId: {
            not: session.employeeId ?? undefined, // Self cannot approve self
            in: session.role === 'SUPERVISOR' ? session.managedEmployeeIds : undefined,
          },
          ...(session.role === 'EMPLOYEE' ? { id: -1 } : {}), // Employee cannot approve anything
        },
      }),

      // 4. Approved days in period
      prisma.absence.aggregate({
        where: {
          status: 'APPROVED',
          employee: employeeScope,
          startDate: { lte: periodEnd },
          endDate: { gte: periodStart },
        },
        _sum: { retainedDays: true },
        _count: { id: true },
      }),

      // 5. Absences grouped by type
      prisma.absence.groupBy({
        by: ['typeId'],
        where: {
          status: 'APPROVED',
          employee: employeeScope,
          startDate: { lte: periodEnd },
          endDate: { gte: periodStart },
        },
        _sum: { retainedDays: true },
        _count: { id: true },
      }),

      // 6. Employees by site
      prisma.site.findMany({
        where: filter.siteId ? { id: filter.siteId } : {},
        select: {
          id: true,
          name: true,
          city: true,
          _count: {
            select: {
              employees: {
                where: { active: true },
              },
            },
          },
        },
      }),

      // 7. Total available recovery credits
      prisma.holidayWorkCredit.aggregate({
        where: {
          isFullyConsumed: false,
          employee: employeeScope,
        },
        _sum: { creditedDays: true, consumedDays: true },
      }),
    ]);

    // Enrich absence categories with type labels
    const typeIds = absencesByCategory.map((a) => a.typeId);
    const types = await prisma.absenceType.findMany({
      where: { id: { in: typeIds } },
      select: { id: true, code: true, name: true, colorHex: true },
    });
    const typeMap = new Map(types.map((t) => [t.id, t]));

    let unjustifiedAbsenceDays = 0;
    const categoryBreakdown = absencesByCategory.map((item) => {
      const typeInfo = typeMap.get(item.typeId);
      const days = Number(item._sum.retainedDays ?? 0);
      if (typeInfo?.code === 'ABSENCE_INJUSTIFIEE') {
        unjustifiedAbsenceDays += days;
      }
      return {
        typeId: item.typeId,
        code: typeInfo?.code ?? 'UNKNOWN',
        name: typeInfo?.name ?? 'Unknown',
        colorHex: typeInfo?.colorHex ?? '#2563eb',
        totalDays: days,
        requestsCount: item._count.id,
      };
    });

    const totalEarnedCredit = Number(recoveryCreditsAggregate._sum.creditedDays ?? 0);
    const totalConsumedCredit = Number(recoveryCreditsAggregate._sum.consumedDays ?? 0);
    const availableRecoveryCredits = Math.max(0, totalEarnedCredit - totalConsumedCredit);

    return {
      period: {
        year,
        month: filter.month ?? null,
        startDate: periodStart,
        endDate: periodEnd,
      },
      kpis: {
        totalActiveEmployees,
        pendingAbsenceRequests: pendingRequestsCount,
        pendingRequiringMyAction: pendingForUserScopeCount,
        totalApprovedDays: Number(approvedAbsencesAggregate._sum.retainedDays ?? 0),
        totalApprovedRequestsCount: approvedAbsencesAggregate._count.id,
        unjustifiedAbsenceDays,
        availableRecoveryCredits,
      },
      categoryBreakdown,
      employeesBySite: employeesBySite.map((s) => ({
        siteId: s.id,
        siteName: s.name,
        city: s.city,
        activeEmployeesCount: s._count.employees,
      })),
    };
  }
}
