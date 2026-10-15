import { describe, it, expect } from 'vitest';
import { BalanceCalculator } from '@/src/domain/calculations/balance.calculator';
import { AnnualLeaveAccrualCalculator } from '@/src/domain/calculations/annual-leave-accrual.calculator';

describe('Unit: Annual Leave Balances & Statutory Accruals', () => {
  it('Scenario 1: Employee with no leave history (hired 12 months ago in current year)', () => {
    const balance = BalanceCalculator.calculate({
      employee: {
        employeeId: 'EMP-01',
        fullName: 'Test Employee',
        birthDate: new Date('1990-01-01'),
        hireDate: new Date('2026-01-01'),
        active: true,
        siteId: 1,
        weeklyRestDays: [0],
      },
      totalUnconsumedHolidayCredits: 0,
      unconsumedHolidayCreditsCount: 0,
      totalApprovedDeductions: 0,
      referenceDate: new Date('2026-12-31'),
    });

    expect(balance.isEligibleForAnnualLeave).toBe(true);
    expect(balance.statutoryAccruedDays).toBe(18.0); // 12 * 1.5
    expect(balance.totalApprovedDeductions).toBe(0.0);
    expect(balance.netAvailableBalance).toBe(18.0);
  });

  it('Scenario 2: Employee with approved annual leave deducted from balance', () => {
    const balance = BalanceCalculator.calculate({
      employee: {
        employeeId: 'EMP-01',
        fullName: 'Test Employee',
        birthDate: new Date('1990-01-01'),
        hireDate: new Date('2026-01-01'),
        active: true,
        siteId: 1,
        weeklyRestDays: [0],
      },
      totalUnconsumedHolidayCredits: 0,
      unconsumedHolidayCreditsCount: 0,
      totalApprovedDeductions: 5.5, // 5.5 days taken (including half-day)
      referenceDate: new Date('2026-12-31'),
    });

    expect(balance.statutoryAccruedDays).toBe(18.0);
    expect(balance.totalApprovedDeductions).toBe(5.5);
    expect(balance.netAvailableBalance).toBe(12.5); // 18.0 - 5.5
  });

  it('Scenario 3: 6-Month Seniority Entitlement Threshold (Art. 231)', () => {
    // Exactly 5 months seniority
    const fiveMonths = BalanceCalculator.calculate({
      employee: {
        employeeId: 'EMP-02',
        fullName: 'New Hire',
        birthDate: new Date('1995-01-01'),
        hireDate: new Date('2026-05-13'),
        active: true,
        siteId: 1,
        weeklyRestDays: [0],
      },
      totalUnconsumedHolidayCredits: 0,
      unconsumedHolidayCreditsCount: 0,
      totalApprovedDeductions: 0,
      referenceDate: new Date('2026-10-13'),
    });

    expect(fiveMonths.serviceMonths).toBe(5);
    expect(fiveMonths.isEligibleForAnnualLeave).toBe(false);
    expect(fiveMonths.netAvailableBalance).toBe(0.0); // Usable balance locked!

    // Exactly 6 months seniority
    const sixMonths = BalanceCalculator.calculate({
      employee: {
        employeeId: 'EMP-02',
        fullName: 'New Hire',
        birthDate: new Date('1995-01-01'),
        hireDate: new Date('2026-04-13'),
        active: true,
        siteId: 1,
        weeklyRestDays: [0],
      },
      totalUnconsumedHolidayCredits: 0,
      unconsumedHolidayCreditsCount: 0,
      totalApprovedDeductions: 0,
      referenceDate: new Date('2026-10-13'),
    });

    expect(sixMonths.serviceMonths).toBe(6);
    expect(sixMonths.isEligibleForAnnualLeave).toBe(true);
    expect(sixMonths.netAvailableBalance).toBe(9.0); // 6 * 1.5 unlocked!
  });

  it('Scenario 4: Seniority-based increment bonus (+1.5 days per 5 years - Art. 232)', () => {
    // 10 completed years of service -> 2 blocks of 5 years = +3.0 days bonus
    const accrual = AnnualLeaveAccrualCalculator.calculateAccrual(
      new Date('2016-01-01'),
      new Date('1985-01-01'),
      new Date('2026-07-01') // 10.5 years (6 completed months in current year)
    );

    expect(accrual.serviceYears).toBe(10);
    expect(accrual.baseAccruedDays).toBe(9.0); // 6 months in current year * 1.5
    expect(accrual.seniorityBonusDays).toBe(3.0);
    expect(accrual.cappedAccruedDays).toBe(12.0);
  });

  it('Scenario 5: Statutory cap of 30 days max yearly balance (Art. 232)', () => {
    // Senior employee with 45 years seniority -> 9 blocks of 5 years = +13.5 days bonus
    // 18.0 base + 13.5 bonus = 31.5 -> Must be capped at 30.0!
    const accrual = AnnualLeaveAccrualCalculator.calculateAccrual(
      new Date('1980-01-01'),
      new Date('1960-01-01'),
      new Date('2026-12-31')
    );

    expect(accrual.rawTotalAccruedDays).toBe(31.5);
    expect(accrual.cappedAccruedDays).toBe(30.0);
    expect(accrual.isYearlyCapReached).toBe(true);
  });

  it('Scenario 6: Minor employee under 18 accrues at 2.0 days/month', () => {
    const minorAccrual = AnnualLeaveAccrualCalculator.calculateAccrual(
      new Date('2026-01-01'),
      new Date('2009-05-01'), // 17 years old in 2026
      new Date('2026-12-31')
    );

    expect(minorAccrual.isMinorRate).toBe(true);
    expect(minorAccrual.baseAccruedDays).toBe(24.0); // 12 * 2.0 = 24.0 days
  });
});
