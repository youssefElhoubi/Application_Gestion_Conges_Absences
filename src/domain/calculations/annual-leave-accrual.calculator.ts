import { MOROCCAN_LABOR_RULES } from '../constants/moroccan-labor-rules';
import { AgeSeniorityCalculator } from './age-seniority.calculator';

export interface AccrualCalculationResult {
  serviceMonths: number;
  isEntitlementUnlocked: boolean; // True only if serviceMonths >= 6
  monthlyRateApplied: number;     // 1.5 or 2.0
  isMinorRate: boolean;
  rawAccruedDays: number;
  cappedAccruedDays: number;       // Capped at 30 days/year
  isYearlyCapReached: boolean;
}

export class AnnualLeaveAccrualCalculator {
  /**
   * Computes annual leave accrual according to Moroccan Labor Law:
   * - Adult: 1.5 days/month
   * - Minor (<18): 2.0 days/month
   * - Entitlement starts after 6 months seniority
   * - Maximum yearly balance capped at 30 days
   */
  public static calculateAccrual(
    hireDate: Date,
    birthDate: Date | null,
    referenceDate: Date = new Date(),
    referenceYearStart?: Date
  ): AccrualCalculationResult {
    const serviceMonths = AgeSeniorityCalculator.calculateSeniorityMonths(hireDate, referenceDate);
    const isEntitlementUnlocked =
      serviceMonths >= MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.MINIMUM_SENIORITY_MONTHS_ENTITLEMENT;

    // Determine months worked in current reference year (or default 12-month rolling window)
    const yearStart = referenceYearStart ?? new Date(referenceDate.getFullYear(), 0, 1);
    const effectiveStartForYear = hireDate > yearStart ? hireDate : yearStart;
    const monthsInCurrentYear = Math.min(
      12,
      AgeSeniorityCalculator.calculateSeniorityMonths(effectiveStartForYear, referenceDate)
    );

    // Calculate month-by-month to accurately handle minor-to-adult transition
    let rawAccruedDays = 0;
    let isCurrentlyMinor = false;
    let latestRate: number = MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.ADULT_RATE_PER_MONTH;

    for (let m = 0; m < monthsInCurrentYear; m++) {
      const monthCheckDate = new Date(effectiveStartForYear);
      monthCheckDate.setMonth(effectiveStartForYear.getMonth() + m);

      const minorInMonth = AgeSeniorityCalculator.isMinor(birthDate, monthCheckDate);
      const rate = minorInMonth
        ? MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.MINOR_RATE_PER_MONTH
        : MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.ADULT_RATE_PER_MONTH;

      rawAccruedDays += rate;
      if (m === monthsInCurrentYear - 1) {
        isCurrentlyMinor = minorInMonth;
        latestRate = rate;
      }
    }

    // Round to 2 decimal places
    rawAccruedDays = Math.round(rawAccruedDays * 100) / 100;

    // Apply statutory cap: maximum yearly balance = 30 days
    const cap = MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.MAX_YEARLY_BALANCE_CAP;
    const cappedAccruedDays = Math.min(rawAccruedDays, cap);
    const isYearlyCapReached = rawAccruedDays >= cap;

    return {
      serviceMonths,
      isEntitlementUnlocked,
      monthlyRateApplied: latestRate,
      isMinorRate: isCurrentlyMinor,
      rawAccruedDays,
      cappedAccruedDays,
      isYearlyCapReached,
    };
  }
}
