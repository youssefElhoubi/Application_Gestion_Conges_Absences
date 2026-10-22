import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { createMockSession } from '@/tests/helpers/auth-mock';
import { CounterService } from '@/src/modules/counters/counter.service';
import { MultiEmployeeCounterQuerySchema } from '@/src/modules/counters/counter.schema';
import { AuthSession, ForbiddenError } from '@/src/modules/auth/auth.guard';
import { Prisma } from '@/src/generated/prisma';
import type { Site } from '@/src/generated/prisma';

describe('Integration: Organization-Wide Leave Balances & Counter Service', () => {
  let site1: Site;
  let site2: Site;
  let types: Awaited<ReturnType<typeof seedCoreTypesAndRules>>;
  let hrSession: AuthSession;
  let supervisorSession: AuthSession;
  let employeeSession: AuthSession;

  beforeEach(async () => {
    await cleanDatabase();
    types = await seedCoreTypesAndRules();

    site1 = await prisma.site.create({
      data: { code: 'SITE-CASA', name: 'Casablanca Headquarter', weeklyRestDays: [0] },
    });

    site2 = await prisma.site.create({
      data: { code: 'SITE-TANGER', name: 'Tanger Factory', weeklyRestDays: [0, 6] },
    });

    // 1. Senior employee at Site 1 (hired 2021, eligible, has approved leaves and recovery credit)
    const emp1 = await prisma.employee.create({
      data: {
        employeeId: 'EMP-BAL-01',
        cin: 'BAL001',
        fullName: 'Amina Mansouri',
        email: 'amina@company.ma',
        jobTitle: 'Senior Manager',
        siteId: site1.id,
        hireDate: new Date('2021-01-01'),
        active: true,
      },
    });

    // 2. Junior employee at Site 1 (hired 3 months ago, < 6 months, not eligible)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    await prisma.employee.create({
      data: {
        employeeId: 'EMP-BAL-02',
        cin: 'BAL002',
        fullName: 'Bilal Chraibi',
        email: 'bilal@company.ma',
        jobTitle: 'Junior Developer',
        siteId: site1.id,
        hireDate: threeMonthsAgo,
        active: true,
      },
    });

    // 3. Inactive employee at Site 2
    await prisma.employee.create({
      data: {
        employeeId: 'EMP-BAL-03',
        cin: 'BAL003',
        fullName: 'Chaimae Berrada',
        email: 'chaimae@company.ma',
        jobTitle: 'Technicienne',
        siteId: site2.id,
        hireDate: new Date('2020-05-01'),
        active: false,
      },
    });

    // Add approved annual leave for emp1 (3 days)
    await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        calculatedWorkingDays: new Prisma.Decimal(3.0),
        enteredDays: new Prisma.Decimal(3.0),
        retainedDays: new Prisma.Decimal(3.0),
        status: 'APPROVED',
      },
    });

    // Add worked public holiday recovery credit for emp1 (1 day)
    const holiday = await prisma.publicHoliday.create({
      data: {
        date: new Date('2026-05-01'),
        label: 'Fête du Travail',
      },
    });

    await prisma.holidayWorkCredit.create({
      data: {
        employeeId: emp1.employeeId,
        publicHolidayId: holiday.id,
        creditedDays: new Prisma.Decimal(1.0),
        consumedDays: new Prisma.Decimal(0.0),
        isFullyConsumed: false,
      },
    });

    hrSession = createMockSession('HR_MANAGER', {
      userId: 'usr-hr',
      email: 'hr@company.ma',
    });

    supervisorSession = createMockSession('SUPERVISOR', {
      userId: 'usr-sup',
      email: 'sup@company.ma',
      employeeId: emp1.employeeId,
      managedEmployeeIds: ['EMP-BAL-02'],
    });

    employeeSession = createMockSession('EMPLOYEE', {
      userId: 'usr-emp',
      email: 'emp@company.ma',
      employeeId: 'EMP-BAL-02',
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Retrieves organization-wide leave balances for HR Manager with pagination', async () => {
    const query = MultiEmployeeCounterQuerySchema.parse({ page: 1, pageSize: 10, active: 'all' });
    const result = await CounterService.getMultiEmployeeCounters(query, hrSession);

    expect(result.data).toHaveLength(3);
    expect(result.meta.totalItems).toBe(3);
    expect(result.meta.totalPages).toBe(1);

    const amina = result.data.find((e) => e.employeeId === 'EMP-BAL-01');
    expect(amina).toBeDefined();
    expect(amina.fullName).toBe('Amina Mansouri');
    expect(amina.siteName).toBe('Casablanca Headquarter');
    expect(amina.jobTitle).toBe('Senior Manager');
    expect(amina.isEligibleForAnnualLeave).toBe(true);
    expect(amina.totalApprovedDeductions).toBe(3.0);
    expect(amina.activeRecoveryCreditDays).toBe(1.0);
    expect(amina.netAvailableBalance).toBe((amina.statutoryAccruedDays + 1.0) - 3.0);
  });

  it('2. Enforces 6-month entitlement lock for new hires', async () => {
    const query = MultiEmployeeCounterQuerySchema.parse({ search: 'Bilal', active: 'all' });
    const result = await CounterService.getMultiEmployeeCounters(query, hrSession);

    expect(result.data).toHaveLength(1);
    const bilal = result.data[0];
    expect(bilal.isEligibleForAnnualLeave).toBe(false);
    expect(bilal.serviceMonths).toBeLessThan(6);
    expect(bilal.netAvailableBalance).toBe(0.0);
  });

  it('3. Filters employees by active status and site correctly', async () => {
    const activeQuery = MultiEmployeeCounterQuerySchema.parse({ active: 'true' });
    const activeResult = await CounterService.getMultiEmployeeCounters(activeQuery, hrSession);
    expect(activeResult.data).toHaveLength(2);
    expect(activeResult.data.some((e) => e.employeeId === 'EMP-BAL-03')).toBe(false);

    const site2Query = MultiEmployeeCounterQuerySchema.parse({ siteId: site2.id, active: 'all' });
    const site2Result = await CounterService.getMultiEmployeeCounters(site2Query, hrSession);
    expect(site2Result.data).toHaveLength(1);
    expect(site2Result.data[0].employeeId).toBe('EMP-BAL-03');
    expect(site2Result.data[0].siteName).toBe('Tanger Factory');
  });

  it('4. Filters employees by search term (fullName or matricule ID)', async () => {
    const queryByName = MultiEmployeeCounterQuerySchema.parse({ search: 'mansouri', active: 'all' });
    const searchByName = await CounterService.getMultiEmployeeCounters(queryByName, hrSession);
    expect(searchByName.data).toHaveLength(1);
    expect(searchByName.data[0].employeeId).toBe('EMP-BAL-01');

    const queryById = MultiEmployeeCounterQuerySchema.parse({ search: 'BAL-02', active: 'all' });
    const searchById = await CounterService.getMultiEmployeeCounters(queryById, hrSession);
    expect(searchById.data).toHaveLength(1);
    expect(searchById.data[0].fullName).toBe('Bilal Chraibi');
  });

  it('5. Enforces role-based access control (RBAC)', async () => {
    const query = MultiEmployeeCounterQuerySchema.parse({ active: 'all' });

    await expect(
      CounterService.getMultiEmployeeCounters(query, employeeSession)
    ).rejects.toThrow(ForbiddenError);

    const supervisorResult = await CounterService.getMultiEmployeeCounters(query, supervisorSession);
    expect(supervisorResult.data).toHaveLength(2);
    expect(supervisorResult.data.map((e) => e.employeeId).sort()).toEqual([
      'EMP-BAL-01',
      'EMP-BAL-02',
    ]);
  });

  it('6. Supports server-side sorting by fullName, employeeId, hireDate, and site', async () => {
    // Sort by employeeId asc vs desc
    const sortIdAsc = await CounterService.getMultiEmployeeCounters(
      MultiEmployeeCounterQuerySchema.parse({ active: 'all', sortBy: 'employeeId', sortOrder: 'asc' }),
      hrSession
    );
    expect(sortIdAsc.data.map((e) => e.employeeId)).toEqual([
      'EMP-BAL-01',
      'EMP-BAL-02',
      'EMP-BAL-03',
    ]);

    const sortIdDesc = await CounterService.getMultiEmployeeCounters(
      MultiEmployeeCounterQuerySchema.parse({ active: 'all', sortBy: 'employeeId', sortOrder: 'desc' }),
      hrSession
    );
    expect(sortIdDesc.data.map((e) => e.employeeId)).toEqual([
      'EMP-BAL-03',
      'EMP-BAL-02',
      'EMP-BAL-01',
    ]);

    // Sort by hireDate asc (oldest first: 2020 Chaimae, 2021 Amina, 3mo ago Bilal)
    const sortHireAsc = await CounterService.getMultiEmployeeCounters(
      MultiEmployeeCounterQuerySchema.parse({ active: 'all', sortBy: 'hireDate', sortOrder: 'asc' }),
      hrSession
    );
    expect(sortHireAsc.data[0].employeeId).toBe('EMP-BAL-03');
    expect(sortHireAsc.data[1].employeeId).toBe('EMP-BAL-01');
    expect(sortHireAsc.data[2].employeeId).toBe('EMP-BAL-02');

    // Sort by site name asc (Casablanca Headquarter first, Tanger Factory second)
    const sortSiteAsc = await CounterService.getMultiEmployeeCounters(
      MultiEmployeeCounterQuerySchema.parse({ active: 'all', sortBy: 'site', sortOrder: 'asc' }),
      hrSession
    );
    expect(sortSiteAsc.data[0].siteName).toBe('Casablanca Headquarter');
    expect(sortSiteAsc.data[2].siteName).toBe('Tanger Factory');
  });

  it('7. Combines search, filter, and pagination correctly', async () => {
    // Page 1 with pageSize 1 for active employees at site1
    const pagedResult = await CounterService.getMultiEmployeeCounters(
      MultiEmployeeCounterQuerySchema.parse({
        siteId: site1.id,
        active: 'true',
        page: 1,
        pageSize: 1,
      }),
      hrSession
    );

    expect(pagedResult.data).toHaveLength(1);
    expect(pagedResult.meta.totalItems).toBe(2);
    expect(pagedResult.meta.totalPages).toBe(2);
    expect(pagedResult.meta.hasNextPage).toBe(true);
    expect(pagedResult.meta.hasPrevPage).toBe(false);

    // Page 2
    const page2Result = await CounterService.getMultiEmployeeCounters(
      MultiEmployeeCounterQuerySchema.parse({
        siteId: site1.id,
        active: 'true',
        page: 2,
        pageSize: 1,
      }),
      hrSession
    );

    expect(page2Result.data).toHaveLength(1);
    expect(page2Result.meta.page).toBe(2);
    expect(page2Result.meta.hasNextPage).toBe(false);
    expect(page2Result.meta.hasPrevPage).toBe(true);
    expect(page2Result.data[0].employeeId).not.toBe(pagedResult.data[0].employeeId);
  });

  it('8. Preserves supervisor scoping when search query is applied (AND condition)', async () => {
    // Supervisor manages EMP-BAL-01 and EMP-BAL-02, but NOT EMP-BAL-03 (Chaimae)
    // Searching for 'Chaimae' should return 0 results for supervisor even though Chaimae exists in DB
    const searchOutOfScope = await CounterService.getMultiEmployeeCounters(
      MultiEmployeeCounterQuerySchema.parse({ search: 'Chaimae', active: 'all' }),
      supervisorSession
    );
    expect(searchOutOfScope.data).toHaveLength(0);

    // Searching for 'Amina' should return EMP-BAL-01 for supervisor
    const searchInScope = await CounterService.getMultiEmployeeCounters(
      MultiEmployeeCounterQuerySchema.parse({ search: 'Amina', active: 'all' }),
      supervisorSession
    );
    expect(searchInScope.data).toHaveLength(1);
    expect(searchInScope.data[0].employeeId).toBe('EMP-BAL-01');
  });
});
