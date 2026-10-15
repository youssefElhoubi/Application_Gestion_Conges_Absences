import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { createMockSession } from '@/tests/helpers/auth-mock';
import { PublicHolidayService } from '@/src/modules/public-holidays/public-holiday.service';
import { HolidayWorkCreditService } from '@/src/modules/holiday-work-credits/holiday-work-credit.service';
import { LeaveRuleService } from '@/src/modules/leave-rules/leave-rule.service';
import { CounterService } from '@/src/modules/counters/counter.service';
import { Prisma } from '@/src/generated/prisma';

describe('Integration: Public Holidays, Holiday Work Credits, Leave Rules & Counters', () => {
  let adminSession: any;
  let site: any;
  let employee: any;

  beforeEach(async () => {
    await cleanDatabase();
    adminSession = createMockSession('ADMIN');

    site = await prisma.site.create({
      data: { code: 'SITE-OUJ', name: 'Oujda Branch', weeklyRestDays: [0] },
    });

    employee = await prisma.employee.create({
      data: {
        employeeId: 'EMP-OUJ-01',
        cin: 'OUJ123',
        fullName: 'Said Oujdi',
        email: 'said@company.ma',
        siteId: site.id,
        hireDate: new Date('2023-01-01'),
      },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it('Scenario 1: Public Holiday Management (Create, List, Update, Calendar query)', async () => {
    // 1. Create Holiday
    const holiday = await PublicHolidayService.createHoliday(
      {
        date: new Date('2026-07-30'),
        label: 'Fête du Trône',
        isReligious: false,
        comment: 'Moroccan Throne Day',
      },
      adminSession
    );
    expect(holiday.id).toBeDefined();
    expect(holiday.label).toBe('Fête du Trône');

    // 2. List Holidays
    const holidays = await PublicHolidayService.listHolidays({ year: 2026 }, adminSession);
    expect(holidays.data.some((h: any) => h.label === 'Fête du Trône')).toBe(true);

    // 3. Update Holiday
    const updated = await PublicHolidayService.updateHoliday(
      holiday.id,
      { comment: 'National Holiday' },
      adminSession
    );
    expect(updated.comment).toBe('National Holiday');
  });

  it('Scenario 2: Holiday Work Credit Lifecycle & Credit Granting', async () => {
    const holiday = await prisma.publicHoliday.create({
      data: { date: new Date('2026-05-01'), label: 'Fête du Travail' },
    });

    // 1. Admin grants credit for working on holiday
    const credit = await HolidayWorkCreditService.grantCredit(
      {
        employeeId: employee.employeeId,
        publicHolidayId: Number(holiday.id),
        creditedDays: 1.0,
        comment: 'Worked emergency shift on May 1st',
      },
      adminSession
    );

    expect(credit.id).toBeDefined();
    expect(Number(credit.creditedDays)).toBe(1.0);
    expect(Number(credit.consumedDays)).toBe(0.0);
    expect(credit.isFullyConsumed).toBe(false);

    // 2. List credits for employee
    const credits = await HolidayWorkCreditService.listCredits(
      { employeeId: employee.employeeId } as any,
      adminSession
    );
    expect(credits.data).toHaveLength(1);
    expect(credits.data[0].employeeId).toBe(employee.employeeId);
  });

  it('Scenario 3: Leave Rules Configuration Service', async () => {
    // 1. Create Rule
    const rule = await LeaveRuleService.createRule(
      {
        code: 'MAX_CARRYOVER_DAYS',
        name: 'Report maximal annuel',
        value: 10.0,
        unit: 'DAYS',
        description: 'Maximum 10 days of unused leave carried into next year',
      },
      adminSession
    );

    expect(rule.id).toBeDefined();
    expect(rule.code).toBe('MAX_CARRYOVER_DAYS');

    // 2. List rules
    const rules = await LeaveRuleService.listRules({ active: 'true' } as any, adminSession);
    expect(rules.data.some((r: any) => r.code === 'MAX_CARRYOVER_DAYS')).toBe(true);
  });

  it('Scenario 4: Counter Service computes dynamic balance breakdown', async () => {
    const counter = await CounterService.getEmployeeCounters(
      employee.employeeId,
      new Date('2026-12-31'),
      adminSession
    );

    expect(counter.employeeId).toBe(employee.employeeId);
    expect(counter.isEligibleForAnnualLeave).toBe(true);
    expect(counter.statutoryAccruedDays).toBe(18.0);
    expect(counter.netAvailableBalance).toBe(18.0);
  });
});
