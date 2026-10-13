import { MOROCCAN_LABOR_RULES } from '../constants/moroccan-labor-rules';
import { AgeSeniorityCalculator } from './age-seniority.calculator';

export interface AccrualCalculationResult {
  serviceMonths: number;
  serviceYears: number;
  isEntitlementUnlocked: boolean; // True only if serviceMonths >= 6 (Art. 231)
  monthlyRateApplied: number;     // 1.5 (adult) or 2.0 (minor)
  isMinorRate: boolean;
  baseAccruedDays: number;        // Base monthly accrual
  seniorityBonusDays: number;     // Art. 232: +1.5 days per 5 years of service
  rawTotalAccruedDays: number;    // base + bonus before cap
  cappedAccruedDays: number;       // Capped at 30 days/year
  isYearlyCapReached: boolean;
  usableAccruedDays: number;      // 0 if entitlement locked, cappedAccruedDays if unlocked
}

export class AnnualLeaveAccrualCalculator {
  /**
   * Computes statutory annual leave acquisition under Moroccan Labor Law:
   * - Adult (>= 18): 1.5 working days / month of service (Art. 231)
   * - Minor (< 18): 2.0 working days / month of service (Art. 231)
   * - Seniority Increment: +1.5 working days per 5 completed years of service (Art. 232)
   * - Entitlement gate: Acquisition opens for consumption only after 6 months of continuous service (Art. 231)
   * - Statutory ceiling: Maximum 30 working days per year (Art. 232)
   */
  public static calculateAccrual(
    hireDate: Date,
    birthDate: Date | null,
    referenceDate: Date = new Date(),
    referenceYearStart?: Date
  ): AccrualCalculationResult {
    const serviceMonths = AgeSeniorityCalculator.calculateSeniorityMonths(hireDate, referenceDate);
    const serviceYears = AgeSeniorityCalculator.calculateSeniorityYears(hireDate, referenceDate);
    const isEntitlementUnlocked =
      serviceMonths >= MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.MINIMUM_SENIORITY_MONTHS_ENTITLEMENT;

    // Determine months worked in current reference annual cycle (up to 12 months)
    const yearStart = referenceYearStart ?? new Date(referenceDate.getFullYear(), 0, 1);
    const effectiveStartForYear = hireDate > yearStart ? hireDate : yearStart;
    const monthsInCurrentYear = Math.min(
      12,
      AgeSeniorityCalculator.calculateSeniorityMonths(effectiveStartForYear, referenceDate)
    );

    // Calculate month-by-month to accurately handle minor-to-adult transition
    let baseAccruedDays = 0;
    let isCurrentlyMinor = false;
    let latestRate: number = MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.ADULT_RATE_PER_MONTH;

    for (let m = 0; m < monthsInCurrentYear; m++) {
      const monthCheckDate = new Date(effectiveStartForYear);
      monthCheckDate.setMonth(effectiveStartForYear.getMonth() + m);

      const minorInMonth = AgeSeniorityCalculator.isMinor(birthDate, monthCheckDate);
      const rate = minorInMonth
        ? MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.MINOR_RATE_PER_MONTH
        : MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.ADULT_RATE_PER_MONTH;

      baseAccruedDays += rate;
      if (m === monthsInCurrentYear - 1) {
        isCurrentlyMinor = minorInMonth;
        latestRate = rate;
      }
    }

    baseAccruedDays = Math.round(baseAccruedDays * 100) / 100;

    // Seniority Bonus (Article 232): +1.5 days for each 5-year tier
    const seniorityFiveYearBlocks = Math.floor(serviceYears / 5);
    const seniorityBonusDays = seniorityFiveYearBlocks * 1.5;

    // Total before cap
    const rawTotalAccruedDays = baseAccruedDays + seniorityBonusDays;

    // Statutory Cap: 30 days max
    const cap = MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.MAX_YEARLY_BALANCE_CAP;
    const cappedAccruedDays = Math.min(rawTotalAccruedDays, cap);
    const isYearlyCapReached = rawTotalAccruedDays >= cap;

    // Usable balance: 0 if < 6 months seniority, else cappedAccruedDays
    const usableAccruedDays = isEntitlementUnlocked ? cappedAccruedDays : 0.0;

    return {
      serviceMonths,
      serviceYears,
      isEntitlementUnlocked,
      monthlyRateApplied: latestRate,
      isMinorRate: isCurrentlyMinor,
      baseAccruedDays,
      seniorityBonusDays,
      rawTotalAccruedDays: Math.round(rawTotalAccruedDays * 100) / 100,
      cappedAccruedDays: Math.round(cappedAccruedDays * 100) / 100,
      isYearlyCapReached,
      usableAccruedDays: Math.round(usableAccruedDays * 100) / 100,
    };
  }
}
