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

    const conditions: any[] = [];

    if (session.role === 'SUPERVISOR') {
      conditions.push({
        OR: [
          { employeeId: session.employeeId },
          { employeeId: { in: session.managedEmployeeIds } },
        ],
      });
    }

    if (query.search) {
      conditions.push({
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { employeeId: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();

    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';
    let orderBy: any = { fullName: 'asc' };
    if (query.sortBy === 'employeeId') {
      orderBy = { employeeId: sortOrder };
    } else if (query.sortBy === 'fullName') {
      orderBy = { fullName: sortOrder };
    } else if (query.sortBy === 'hireDate') {
      orderBy = { hireDate: sortOrder };
    } else if (query.sortBy === 'site') {
      orderBy = { site: { name: sortOrder } };
    }

    const [totalItems, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          employeeId: true,
          fullName: true,
          jobTitle: true,
          hireDate: true,
          active: true,
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
          hireDate: emp.hireDate,
          active: emp.active,
        };
      })
    );

    return {
      data: balanceSummaries,
      meta: buildPaginationMeta(totalItems, page, pageSize),
    };
  }
}
