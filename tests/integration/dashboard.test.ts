import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { createMockSession } from '@/tests/helpers/auth-mock';
import { DashboardMetricsService } from '@/src/modules/dashboard/dashboard-metrics.service';
import { Prisma } from '@/src/generated/prisma';
import { AuthSession, ForbiddenError } from '@/src/modules/auth/auth.guard';
import type { Site, Employee } from '@/src/generated/prisma';

describe('Integration: Dashboard Aggregation Metrics and Real Database Queries', () => {
  let site1: Site;
  let site2: Site;
  let types: Awaited<ReturnType<typeof seedCoreTypesAndRules>>;
  let emp1: Employee;
  let emp2: Employee;
  let hrSession: AuthSession;

  beforeEach(async () => {
    await cleanDatabase();
    types = await seedCoreTypesAndRules();

    site1 = await prisma.site.create({
      data: { code: 'SITE-1', name: 'Site One', weeklyRestDays: [0] },
    });

    site2 = await prisma.site.create({
      data: { code: 'SITE-2', name: 'Site Two', weeklyRestDays: [0] },
    });

    // Site 1 Employees
    emp1 = await prisma.employee.create({
      data: {
        employeeId: 'EMP-DASH-1',
        cin: 'DASH01',
        fullName: 'Employee One',
        email: 'emp1@company.ma',
        siteId: site1.id,
        hireDate: new Date('2023-01-01'),
        active: true,
      },
    });

    emp2 = await prisma.employee.create({
      data: {
        employeeId: 'EMP-DASH-2',
        cin: 'DASH02',
        fullName: 'Employee Two',
        email: 'emp2@company.ma',
        siteId: site1.id,
        hireDate: new Date('2023-01-01'),
        active: true,
      },
    });

    await prisma.employee.create({
      data: {
        employeeId: 'EMP-DASH-INACT',
        cin: 'DASH03',
        fullName: 'Inactive Employee',
        email: 'inactive@company.ma',
        siteId: site1.id,
        hireDate: new Date('2023-01-01'),
        active: false, // Inactive!
      },
    });

    // Site 2 Employee
    await prisma.employee.create({
      data: {
        employeeId: 'EMP-DASH-S2',
        cin: 'DASH04',
        fullName: 'Site 2 Employee',
        email: 'site2@company.ma',
        siteId: site2.id,
        hireDate: new Date('2023-01-01'),
        active: true,
      },
    });

    hrSession = createMockSession('HR_MANAGER', { siteId: site1.id });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it('Scenario 1: Metric 1 - Active Employees Count respects active flag and site filters', async () => {
    // Global metrics (all sites)
    const globalMetrics = await DashboardMetricsService.getDashboardMetrics(
      { periodMode: 'all_time' },
      hrSession
    );
    // 3 active employees (emp1, emp2, empSite2). empInactive is excluded!
    expect(globalMetrics.activeEmployees).toBe(3);

    // Filter by Site 1
    const site1Metrics = await DashboardMetricsService.getDashboardMetrics(
      { siteId: site1.id, periodMode: 'all_time' },
      hrSession
    );
    expect(site1Metrics.activeEmployees).toBe(2);

    // Filter by Site 2
    const site2Metrics = await DashboardMetricsService.getDashboardMetrics(
      { siteId: site2.id, periodMode: 'all_time' },
      hrSession
    );
    expect(site2Metrics.activeEmployees).toBe(1);
  });

  it('Scenario 2: Metric 2 - Validated Leave Days sums approved annual leave and handles half-days', async () => {
    // 1. Approved Annual Leave (4.0 days)
    await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-04'),
        fraction: 'FULL_DAY',
        calculatedWorkingDays: new Prisma.Decimal(4.0),
        enteredDays: new Prisma.Decimal(4.0),
        retainedDays: new Prisma.Decimal(4.0),
        status: 'APPROVED',
      },
    });

    // 2. Approved Annual Leave Half-Day (0.5 days)
    await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-10'),
        fraction: 'HALF_DAY_MORNING',
        calculatedWorkingDays: new Prisma.Decimal(0.5),
        enteredDays: new Prisma.Decimal(1.0),
        retainedDays: new Prisma.Decimal(0.5),
        status: 'APPROVED',
      },
    });

    // 3. Pending Annual Leave (2.0 days - Must be EXCLUDED)
    await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-02'),
        fraction: 'FULL_DAY',
        calculatedWorkingDays: new Prisma.Decimal(2.0),
        enteredDays: new Prisma.Decimal(2.0),
        retainedDays: new Prisma.Decimal(2.0),
        status: 'PENDING',
      },
    });

    // 4. Rejected Annual Leave (3.0 days - Must be EXCLUDED)
    await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-03'),
        fraction: 'FULL_DAY',
        calculatedWorkingDays: new Prisma.Decimal(3.0),
        enteredDays: new Prisma.Decimal(3.0),
        retainedDays: new Prisma.Decimal(3.0),
        status: 'REJECTED',
      },
    });

    // 5. Approved Exceptional Leave (4.0 days - Must be EXCLUDED from annual leave)
    await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.evenement.id,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-04'),
        fraction: 'FULL_DAY',
        calculatedWorkingDays: new Prisma.Decimal(4.0),
        enteredDays: new Prisma.Decimal(4.0),
        retainedDays: new Prisma.Decimal(4.0),
        status: 'APPROVED',
      },
    });

    const metrics = await DashboardMetricsService.getDashboardMetrics(
      { siteId: site1.id, periodMode: 'all_time' },
      hrSession
    );

    // 4.0 + 0.5 = 4.5 days
    expect(metrics.validatedLeaveDays).toBe(4.5);
  });

  it('Scenario 3: Metric 3 - Recovery Days Available reflects earned credits, consumption, and pending reservation', async () => {
    const holiday1 = await prisma.publicHoliday.create({
      data: { date: new Date('2026-01-11'), label: 'Manifeste' },
    });
    const holiday2 = await prisma.publicHoliday.create({
      data: { date: new Date('2026-05-01'), label: 'Fête Travail' },
    });

    // Credit 1: 2.0 credited, 0.5 consumed -> 1.5 available
    await prisma.holidayWorkCredit.create({
      data: {
        employeeId: emp1.employeeId,
        publicHolidayId: holiday1.id,
        creditedDays: new Prisma.Decimal(2.0),
        consumedDays: new Prisma.Decimal(0.5),
        isFullyConsumed: false,
      },
    });

    // Credit 2: 1.0 credited, 0.0 consumed -> 1.0 available
    await prisma.holidayWorkCredit.create({
      data: {
        employeeId: emp1.employeeId,
        publicHolidayId: holiday2.id,
        creditedDays: new Prisma.Decimal(1.0),
        consumedDays: new Prisma.Decimal(0.0),
        isFullyConsumed: false,
      },
    });

    // Pending Recovery Leave: 1.0 days (reserves credit)
    await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.recuperation.id,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-01'),
        fraction: 'FULL_DAY',
        calculatedWorkingDays: new Prisma.Decimal(1.0),
        enteredDays: new Prisma.Decimal(1.0),
        retainedDays: new Prisma.Decimal(1.0),
        status: 'PENDING',
      },
    });

    const metrics = await DashboardMetricsService.getDashboardMetrics(
      { siteId: site1.id, periodMode: 'all_time' },
      hrSession
    );

    // Available = (2.0 - 0.5) + (1.0 - 0.0) = 2.5
    expect(metrics.recoveryDaysAvailable).toBe(2.5);
    // Reserved = 1.0
    expect(metrics.recoveryDaysReserved).toBe(1.0);
  });

  it('Scenario 4: Metric 4 - Unjustified Absence Days and Count', async () => {
    // 1. Approved unjustified absence (2.5 days)
    await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.injustifiee.id,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-03'),
        fraction: 'FULL_DAY',
        calculatedWorkingDays: new Prisma.Decimal(2.5),
        enteredDays: new Prisma.Decimal(3.0),
        retainedDays: new Prisma.Decimal(2.5),
        status: 'APPROVED',
      },
    });

    // 2. Pending unjustified absence (must be EXCLUDED)
    await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.injustifiee.id,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-01'),
        fraction: 'FULL_DAY',
        calculatedWorkingDays: new Prisma.Decimal(1.0),
        enteredDays: new Prisma.Decimal(1.0),
        retainedDays: new Prisma.Decimal(1.0),
        status: 'PENDING',
      },
    });

    const metrics = await DashboardMetricsService.getDashboardMetrics(
      { siteId: site1.id, periodMode: 'all_time' },
      hrSession
    );

    expect(metrics.nonJustifiedAbsenceDays).toBe(2.5);
    expect(metrics.nonJustifiedAbsenceCount).toBe(1);
  });

  it('Scenario 5: Metric 5 - Pending Leave Requests counts requests (not days)', async () => {
    // 2 Pending requests for emp1 (one 3-day request, one 1-day request)
    await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-03'),
        fraction: 'FULL_DAY',
        calculatedWorkingDays: new Prisma.Decimal(3.0),
        enteredDays: new Prisma.Decimal(3.0),
        retainedDays: new Prisma.Decimal(3.0),
        status: 'PENDING',
      },
    });

    await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.recuperation.id,
        startDate: new Date('2026-11-10'),
        endDate: new Date('2026-11-10'),
        fraction: 'FULL_DAY',
        calculatedWorkingDays: new Prisma.Decimal(1.0),
        enteredDays: new Prisma.Decimal(1.0),
        retainedDays: new Prisma.Decimal(1.0),
        status: 'PENDING',
      },
    });

    const metrics = await DashboardMetricsService.getDashboardMetrics(
      { siteId: site1.id, periodMode: 'all_time' },
      hrSession
    );

    // Exactly 2 pending requests
    expect(metrics.pendingLeaveRequests).toBe(2);
  });

  it('Scenario 6: Employee session is strictly scoped to own records and cannot probe other employees', async () => {
    const empSession = createMockSession('EMPLOYEE', {
      employeeId: emp1.employeeId,
      siteId: site1.id,
    });

    // Employee requesting their own dashboard
    const myMetrics = await DashboardMetricsService.getDashboardMetrics(
      { periodMode: 'all_time' },
      empSession
    );
    expect(myMetrics.appliedFilters.employeeId).toBe(emp1.employeeId);

    // Employee attempting to probe another employee's dashboard
    await expect(
      DashboardMetricsService.getDashboardMetrics(
        { employeeId: emp2.employeeId, periodMode: 'all_time' },
        empSession
      )
    ).rejects.toThrow(ForbiddenError);
  });
});
