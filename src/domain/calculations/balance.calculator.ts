import { DynamicBalanceResult, EmployeeProfileContext } from '../types/business-logic.types';
import { AnnualLeaveAccrualCalculator } from './annual-leave-accrual.calculator';
import { AgeSeniorityCalculator } from './age-seniority.calculator';

export interface RawBalanceComponents {
  employee: EmployeeProfileContext;
  totalUnconsumedHolidayCredits: number;
  unconsumedHolidayCreditsCount: number;
  totalApprovedDeductions: number;
  referenceDate?: Date;
}

export class BalanceCalculator {
  /**
   * Dynamically calculates net available leave balance by aggregating:
   * 1. Statutory Annual Accrual (1.5d adult / 2.0d minor per month, 30d cap)
   * 2. Active Recovery Credits earned from working on public holidays (never expire)
   * 3. Minus Approved Deductible Leaves taken
   */
  public static calculate(components: RawBalanceComponents): DynamicBalanceResult {
    const referenceDate = components.referenceDate ?? new Date();
    const { employee, totalUnconsumedHolidayCredits, unconsumedHolidayCreditsCount, totalApprovedDeductions } = components;

    const serviceMonths = AgeSeniorityCalculator.calculateSeniorityMonths(employee.hireDate, referenceDate);
    const serviceYears = AgeSeniorityCalculator.calculateSeniorityYears(employee.hireDate, referenceDate);

    const accrual = AnnualLeaveAccrualCalculator.calculateAccrual(
      employee.hireDate,
      employee.birthDate,
      referenceDate
    );

    // If seniority is less than 6 months, statutory days are accumulated on record but cannot yet be consumed
    const usableStatutoryDays = accrual.isEntitlementUnlocked ? accrual.cappedAccruedDays : 0.0;

    // Recovery credits from working on public holidays NEVER expire and can always be consumed
    const netAvailable = (usableStatutoryDays + totalUnconsumedHolidayCredits) - totalApprovedDeductions;

    return {
      employeeId: employee.employeeId,
      referenceDate,
      serviceMonths,
      serviceYears,
      isEligibleForAnnualLeave: accrual.isEntitlementUnlocked,
      statutoryAccruedDays: accrual.cappedAccruedDays,
      activeRecoveryCreditDays: totalUnconsumedHolidayCredits,
      totalApprovedDeductions,
      netAvailableBalance: Math.round(netAvailable * 100) / 100,
      calculationBreakdown: {
        monthlyRateApplied: accrual.monthlyRateApplied,
        isMinorRate: accrual.isMinorRate,
        seniorityMonths: serviceMonths,
        maxYearlyCapEnforced: accrual.isYearlyCapReached,
        unconsumedHolidayCreditsCount,
      },
    };
  }
}
