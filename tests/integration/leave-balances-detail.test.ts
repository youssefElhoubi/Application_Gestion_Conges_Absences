import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { createMockSession } from '@/tests/helpers/auth-mock';
import { CounterService } from '@/src/modules/counters/counter.service';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { HolidayWorkCreditService } from '@/src/modules/holiday-work-credits/holiday-work-credit.service';
import { AuthSession, ForbiddenError } from '@/src/modules/auth/auth.guard';
import { Prisma } from '@/src/generated/prisma';
import type { Site, Employee } from '@/src/generated/prisma';

describe('Integration: Employee-Specific Leave Balance Details & Calculations', () => {
  let site: Site;
  let types: Awaited<ReturnType<typeof seedCoreTypesAndRules>>;
  let hrSession: AuthSession;
  let supervisorSession: AuthSession;
  let employeeSession: AuthSession;
  let emp1: Employee;
  let emp2: Employee;

  beforeEach(async () => {
    await cleanDatabase();
    types = await seedCoreTypesAndRules();

    site = await prisma.site.create({
      data: { code: 'SITE-CASA', name: 'Casablanca HQ', weeklyRestDays: [0] },
    });

    // 1. Senior employee (hired 2021, eligible, has approved leaves and recovery credit)
    emp1 = await prisma.employee.create({
      data: {
        employeeId: 'EMP-DET-01',
        cin: 'DET001',
        fullName: 'Fatima Zahra Bennani',
        email: 'fatima@company.ma',
        jobTitle: 'Senior HR Specialist',
        department: 'Ressources Humaines',
        siteId: site.id,
        hireDate: new Date('2021-01-01'),
        active: true,
      },
    });

    // 2. Junior employee (hired 2 months ago, < 6 months, not eligible)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    emp2 = await prisma.employee.create({
      data: {
        employeeId: 'EMP-DET-02',
        cin: 'DET002',
        fullName: 'Yassine Alami',
        email: 'yassine@company.ma',
        jobTitle: 'Junior Analyst',
        department: 'Finance',
        siteId: site.id,
        hireDate: twoMonthsAgo,
        active: true,
      },
    });

    // Add 4 days approved annual leave for emp1
    await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-04'),
        calculatedWorkingDays: new Prisma.Decimal(4.0),
        enteredDays: new Prisma.Decimal(4.0),
        retainedDays: new Prisma.Decimal(4.0),
        status: 'APPROVED',
      },
    });

    // Add worked public holiday recovery credit for emp1 (2 days credited, 0 consumed)
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
        creditedDays: new Prisma.Decimal(2.0),
        consumedDays: new Prisma.Decimal(0.0),
        isFullyConsumed: false,
      },
    });

    hrSession = createMockSession('HR_MANAGER', {
      userId: 'usr-hr-det',
      email: 'hr@company.ma',
    });

    supervisorSession = createMockSession('SUPERVISOR', {
      userId: 'usr-sup-det',
      email: 'sup@company.ma',
      employeeId: emp1.employeeId,
      managedEmployeeIds: [emp2.employeeId],
    });

    employeeSession = createMockSession('EMPLOYEE', {
      userId: 'usr-emp-det',
      email: 'yassine@company.ma',
      employeeId: emp2.employeeId,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Retrieves authoritative balance details and statutory entitlement breakdown for eligible senior employee', async () => {
    const balance = await CounterService.getEmployeeCounters(emp1.employeeId, new Date(), hrSession);

    expect(balance.employeeId).toBe('EMP-DET-01');
    expect(balance.isEligibleForAnnualLeave).toBe(true);
    expect(balance.serviceYears).toBeGreaterThanOrEqual(5);
    expect(balance.totalApprovedDeductions).toBe(4.0);
    expect(balance.activeRecoveryCreditDays).toBe(2.0);
    expect(balance.netAvailableBalance).toBe((balance.statutoryAccruedDays + 2.0) - 4.0);

    // Calculation breakdown
    expect(balance.calculationBreakdown.monthlyRateApplied).toBe(1.5);
    expect(balance.calculationBreakdown.isMinorRate).toBe(false);
    expect(balance.calculationBreakdown.unconsumedHolidayCreditsCount).toBe(1);
  });

  it('2. Enforces statutory 6-month gate with locked available balance for newly hired employee', async () => {
    const balance = await CounterService.getEmployeeCounters(emp2.employeeId, new Date(), hrSession);

    expect(balance.employeeId).toBe('EMP-DET-02');
    expect(balance.isEligibleForAnnualLeave).toBe(false);
    expect(balance.serviceMonths).toBeLessThan(6);
    expect(balance.statutoryAccruedDays).toBeGreaterThan(0); // Acquired in background
    expect(balance.netAvailableBalance).toBe(0.0); // Consumption locked
  });

  it('3. Confirms that pending absence requests do NOT deduct from net available balance', async () => {
    const initialBalance = await CounterService.getEmployeeCounters(emp1.employeeId, new Date(), hrSession);

    // Submit a 5-day PENDING leave request
    const pendingAbsence = await prisma.absence.create({
      data: {
        employeeId: emp1.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-05'),
        calculatedWorkingDays: new Prisma.Decimal(5.0),
        enteredDays: new Prisma.Decimal(5.0),
        retainedDays: new Prisma.Decimal(5.0),
        status: 'PENDING',
      },
    });

    const balanceAfterPending = await CounterService.getEmployeeCounters(emp1.employeeId, new Date(), hrSession);

    // netAvailableBalance MUST remain unchanged while absence is PENDING
    expect(balanceAfterPending.netAvailableBalance).toBe(initialBalance.netAvailableBalance);
    expect(balanceAfterPending.totalApprovedDeductions).toBe(initialBalance.totalApprovedDeductions);

    // Clean up
    await prisma.absence.delete({ where: { id: pendingAbsence.id } });
  });

  it('4. Enforces RBAC permissions for employee balance inspection', async () => {
    // Supervisor can view managed subordinate (emp2)
    const supViewSub = await CounterService.getEmployeeCounters(emp2.employeeId, new Date(), supervisorSession);
    expect(supViewSub.employeeId).toBe(emp2.employeeId);

    // Regular employee CANNOT view another employee's balance details
    await expect(
      CounterService.getEmployeeCounters(emp1.employeeId, new Date(), employeeSession)
    ).rejects.toThrow(ForbiddenError);
  });

  it('5. Integrates absence history: returns employee-specific records with retainedDays, type, and status without leaking other employees', async () => {
    // Query absences specifically for emp1
    const emp1Absences = await AbsenceService.listAbsences(
      { employeeId: emp1.employeeId, page: 1, pageSize: 10, status: 'ALL', sortOrder: 'desc' },
      hrSession
    );

    expect(emp1Absences.data.length).toBe(1);
    const item = emp1Absences.data[0];
    expect(item.employeeId).toBe(emp1.employeeId);
    expect(Number(item.retainedDays)).toBe(4.0);
    expect(item.status).toBe('APPROVED');
    expect(item.type.name).toBeDefined();
    expect(item.type.isDeductible).toBe(true);

    // Confirm that querying emp2 yields 0 absences (isolated)
    const emp2Absences = await AbsenceService.listAbsences(
      { employeeId: emp2.employeeId, page: 1, pageSize: 10, status: 'ALL', sortOrder: 'desc' },
      hrSession
    );
    expect(emp2Absences.data.length).toBe(0);
  });

  it('6. Integrates recovery credits: verifies holiday link, credited days, and authoritative balance source', async () => {
    // Query recovery credits for emp1
    const emp1Credits = await HolidayWorkCreditService.listCredits(
      { employeeId: emp1.employeeId, page: 1, pageSize: 10, sortOrder: 'desc', isFullyConsumed: 'all' },
      hrSession
    );

    expect(emp1Credits.data.length).toBe(1);
    const credit = emp1Credits.data[0];
    expect(credit.employeeId).toBe(emp1.employeeId);
    expect(Number(credit.creditedDays)).toBe(2.0);
    expect(Number(credit.consumedDays)).toBe(0.0);
    expect(credit.isFullyConsumed).toBe(false);
    expect(credit.publicHoliday.label).toBe('Fête du Travail');

    // Authoritative balance is retrieved from CounterService, not sum of client records
    const balance = await CounterService.getEmployeeCounters(emp1.employeeId, new Date(), hrSession);
    expect(balance.activeRecoveryCreditDays).toBe(2.0);
  });
});
