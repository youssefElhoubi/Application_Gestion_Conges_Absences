import { prisma } from '@/src/infrastructure/db/prisma';
import { AuthSession, AuthGuard } from '../auth/auth.guard';
import { MultiEmployeeCounterQuery } from './counter.schema';
import { getPrismaPagination, buildPaginationMeta, PaginatedResult } from '@/src/lib/pagination/pagination';
import { LeaveBalanceService } from '@/src/application/services/leave-balance.service';

export class CounterService {
  /**
   * Get single employee balance summary
   */
  public static async getEmployeeCounters(
    employeeId: string,
    asOfDate: Date = new Date(),
    session: AuthSession
  ) {
    AuthGuard.requireAccessEmployee(session, employeeId);
    return await LeaveBalanceService.getDynamicBalance(employeeId, asOfDate);
  }

  /**
   * Get multi-employee balance summaries with pagination (ADMIN, HR_MANAGER, SUPERVISOR)
   */
  public static async getMultiEmployeeCounters(
    query: MultiEmployeeCounterQuery,
    session: AuthSession
  ): Promise<PaginatedResult<any>> {
    AuthGuard.requireRole(session, ['ADMIN', 'HR_MANAGER', 'SUPERVISOR']);

    const { skip, take, page, pageSize } = getPrismaPagination(query);
    const where: any = {};

    if (query.siteId) where.siteId = query.siteId;
    if (query.active === 'true') where.active = true;
    else if (query.active === 'false') where.active = false;

    if (session.role === 'SUPERVISOR') {
      where.OR = [
        { employeeId: session.employeeId },
        { employeeId: { in: session.managedEmployeeIds } },
      ];
    }

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { employeeId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();

    const [totalItems, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { fullName: 'asc' },
        select: {
          employeeId: true,
          fullName: true,
          jobTitle: true,
          site: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Calculate dynamic balance for each employee
    const balanceSummaries = await Promise.all(
      employees.map(async (emp: any) => {
        const balance = await LeaveBalanceService.getDynamicBalance(emp.employeeId, asOfDate);
        return {
          ...balance,
          fullName: emp.fullName,
          siteName: emp.site?.name,
          jobTitle: emp.jobTitle,
        };
      })
    );

    return {
      data: balanceSummaries,
      meta: buildPaginationMeta(totalItems, page, pageSize),
    };
  }
}
