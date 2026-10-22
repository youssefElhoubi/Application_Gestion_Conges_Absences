import { prisma } from '@/src/infrastructure/db/prisma';
import { Prisma } from '@/src/generated/prisma';
import { AuthSession, AuthGuard } from '../auth/auth.guard';
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeQuery,
} from './employee.schema';
import { getPrismaPagination, buildPaginationMeta, PaginatedResult } from '@/src/lib/pagination/pagination';
import { LeaveCalculationEngine } from '@/src/domain/engine/leave-calculation.engine';
import { LeaveBalanceService } from '@/src/application/services/leave-balance.service';

export type EmployeeListItem = Prisma.EmployeeGetPayload<{
  include: {
    site: { select: { id: true; name: true; city: true } };
    manager: { select: { employeeId: true; fullName: true } };
  };
}>;

export class EmployeeService {
  /**
   * Create a new employee (ADMIN or HR_MANAGER only)
   */
  public static async createEmployee(input: CreateEmployeeInput, session: AuthSession) {
    AuthGuard.requireRole(session, ['ADMIN', 'HR_MANAGER']);

    // 1. Verify Site exists and is active
    const site = await prisma.site.findUnique({
      where: { id: input.siteId },
    });
    if (!site) {
      throw new Error(`Referenced site with ID ${input.siteId} does not exist.`);
    }

    // 2. Uniqueness checks
    const [existingId, existingCin, existingEmail] = await Promise.all([
      prisma.employee.findUnique({ where: { employeeId: input.employeeId } }),
      prisma.employee.findUnique({ where: { cin: input.cin } }),
      prisma.employee.findUnique({ where: { email: input.email } }),
    ]);

    if (existingId) throw new Error(`Employee ID "${input.employeeId}" is already registered.`);
    if (existingCin) throw new Error(`CIN "${input.cin}" is already associated with an employee.`);
    if (existingEmail) throw new Error(`Email "${input.email}" is already in use.`);

    // 3. Manager verification if specified
    if (input.managerId) {
      const manager = await prisma.employee.findUnique({
        where: { employeeId: input.managerId },
      });
      if (!manager) {
        throw new Error(`Reporting manager "${input.managerId}" does not exist.`);
      }
    }

    // 4. Create record
    const employee = await prisma.employee.create({
      data: {
        employeeId: input.employeeId,
        cin: input.cin,
        cnssNumber: input.cnssNumber ?? null,
        fullName: input.fullName,
        email: input.email,
        siteId: input.siteId,
        jobTitle: input.jobTitle ?? null,
        department: input.department ?? null,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        hireDate: new Date(input.hireDate),
        managerId: input.managerId ?? null,
        observation: input.observation ?? null,
        active: true,
      },
      include: {
        site: { select: { id: true, code: true, name: true } },
        manager: { select: { employeeId: true, fullName: true } },
      },
    });

    return employee;
  }

  /**
   * Retrieve employee profile with calculated age and seniority metrics
   */
  public static async getEmployeeById(employeeId: string, session: AuthSession) {
    AuthGuard.requireAccessEmployee(session, employeeId);

    const employee = await prisma.employee.findUniqueOrThrow({
      where: { employeeId },
      include: {
        site: true,
        manager: { select: { employeeId: true, fullName: true } },
      },
    });

    const now = new Date();
    const ageMetrics = LeaveCalculationEngine.calculateAge(employee.birthDate, now);
    const seniorityMetrics = LeaveCalculationEngine.calculateSeniority(employee.hireDate, now);

    return {
      ...employee,
      calculatedAge: ageMetrics.ageYears,
      isMinor: ageMetrics.isMinor,
      seniorityMonths: seniorityMetrics.completedMonths,
      seniorityYears: seniorityMetrics.completedYears,
      isEligibleForAnnualLeave: seniorityMetrics.isEligibleForAnnualLeave,
    };
  }

  /**
   * List employees with filtering, searching, and pagination
   */
  public static async listEmployees(
    query: EmployeeQuery,
    session: AuthSession
  ): Promise<PaginatedResult<EmployeeListItem>> {
    AuthGuard.requireRole(session, ['ADMIN', 'HR_MANAGER', 'SUPERVISOR']);

    const { skip, take, page, pageSize } = getPrismaPagination(query);

    // Build where clause
    const where: Prisma.EmployeeWhereInput = {};

    if (query.siteId) {
      where.siteId = query.siteId;
    }

    if (query.active === 'true') {
      where.active = true;
    } else if (query.active === 'false') {
      where.active = false;
    }

    if (query.department) {
      where.department = { contains: query.department, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { employeeId: { contains: query.search, mode: 'insensitive' } },
        { cin: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Supervisor scoping
    if (session.role === 'SUPERVISOR') {
      where.OR = [
        ...(session.employeeId ? [{ employeeId: session.employeeId }] : []),
        { employeeId: { in: session.managedEmployeeIds } },
      ];
    }

    const [totalItems, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { hireDate: 'desc' },
        include: {
          site: { select: { id: true, name: true, city: true } },
          manager: { select: { employeeId: true, fullName: true } },
        },
      }),
    ]);

    return {
      data: employees,
      meta: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  /**
   * Update employee details
   */
  public static async updateEmployee(
    employeeId: string,
    input: UpdateEmployeeInput,
    session: AuthSession
  ) {
    AuthGuard.requireRole(session, ['ADMIN', 'HR_MANAGER']);

    if (input.siteId) {
      const site = await prisma.site.findUnique({ where: { id: input.siteId } });
      if (!site) throw new Error(`Site with ID ${input.siteId} does not exist.`);
    }

    return await prisma.employee.update({
      where: { employeeId },
      data: {
        ...input,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
      },
      include: {
        site: true,
      },
    });
  }

  /**
   * Toggle employee active status (preserves all historical leaves)
   */
  public static async setEmployeeStatus(
    employeeId: string,
    active: boolean,
    session: AuthSession
  ) {
    AuthGuard.requireRole(session, ['ADMIN', 'HR_MANAGER']);

    return await prisma.employee.update({
      where: { employeeId },
      data: { active },
    });
  }

  /**
   * Get employee's absence history
   */
  public static async getAbsenceHistory(employeeId: string, session: AuthSession) {
    AuthGuard.requireAccessEmployee(session, employeeId);

    return await prisma.absence.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
      include: {
        type: true,
        reason: true,
        approvalHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  /**
   * Get employee's real-time calculated balances
   */
  public static async getEmployeeBalances(employeeId: string, session: AuthSession) {
    AuthGuard.requireAccessEmployee(session, employeeId);
    return await LeaveBalanceService.getDynamicBalance(employeeId);
  }
}
