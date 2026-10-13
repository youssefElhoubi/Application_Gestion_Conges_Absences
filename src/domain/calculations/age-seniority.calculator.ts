import { MOROCCAN_LABOR_RULES } from '../constants/moroccan-labor-rules';

export class AgeSeniorityCalculator {
  /**
   * Calculates completed calendar months of service between hireDate and referenceDate.
   * Accurately accounts for:
   * - Employees hired on the 1st of a month who work through the last day of a month (completes that full month).
   * - Exact day-of-month boundaries.
   */
  public static calculateSeniorityMonths(hireDate: Date, referenceDate: Date = new Date()): number {
    if (referenceDate < hireDate) {
      return 0;
    }

    let months = (referenceDate.getFullYear() - hireDate.getFullYear()) * 12 +
                 (referenceDate.getMonth() - hireDate.getMonth());

    const isRefEndOfMonth =
      new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate() ===
      referenceDate.getDate();

    if (referenceDate.getDate() < hireDate.getDate()) {
      // If reference date is the last day of month (e.g. Feb 28 when hired on the 31st), month counts as completed
      if (!isRefEndOfMonth) {
        months -= 1;
      }
    } else if (hireDate.getDate() === 1 && isRefEndOfMonth) {
      // Hired on the 1st and reference date is the last day of the month -> full month is completed
      months += 1;
    }

    return Math.max(0, months);
  }

  /**
   * Calculates completed years of service.
   */
  public static calculateSeniorityYears(hireDate: Date, referenceDate: Date = new Date()): number {
    const months = this.calculateSeniorityMonths(hireDate, referenceDate);
    return Math.floor(months / 12);
  }

  /**
   * Calculates employee age in completed years.
   */
  public static calculateAge(birthDate: Date | null, referenceDate: Date = new Date()): number | null {
    if (!birthDate) {
      return null;
    }

    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return Math.max(0, age);
  }

  /**
   * Determines if employee is considered a minor under Moroccan labor code (< 18 years old).
   * Defaults to adult (false) if birthDate is omitted.
   */
  public static isMinor(birthDate: Date | null, referenceDate: Date = new Date()): boolean {
    const age = this.calculateAge(birthDate, referenceDate);
    if (age === null) {
      return false;
    }
    return age < MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.MINOR_AGE_THRESHOLD_YEARS;
  }
}
