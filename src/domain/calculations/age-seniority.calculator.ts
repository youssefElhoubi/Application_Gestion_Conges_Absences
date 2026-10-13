import { MOROCCAN_LABOR_RULES } from '../constants/moroccan-labor-rules';

export class AgeSeniorityCalculator {
  /**
   * Calculates completed calendar months of service between hireDate and referenceDate.
   */
  public static calculateSeniorityMonths(hireDate: Date, referenceDate: Date = new Date()): number {
    if (referenceDate < hireDate) {
      return 0;
    }

    let months = (referenceDate.getFullYear() - hireDate.getFullYear()) * 12 +
                 (referenceDate.getMonth() - hireDate.getMonth());

    // If reference day is before hire day in the month, completed full month has not been reached
    if (referenceDate.getDate() < hireDate.getDate()) {
      months -= 1;
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
