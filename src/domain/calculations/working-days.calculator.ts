import { Fraction } from '@/src/generated/prisma';
import { WorkingDaysCalculationContext, WorkingDaysResult } from '../types/business-logic.types';

export class WorkingDaysCalculator {
  /**
   * Calculates deductible working days between startDate and endDate.
   * Business Rules:
   * 1. Public holidays NEVER consume annual leave (always excluded).
   * 2. Site weekly rest days (e.g. Sunday or Sat+Sun) NEVER consume annual leave.
   * 3. Fraction: FULL_DAY = 1.0 day/working date; HALF_DAY = 0.5 day (must be on a single valid working day).
   */
  public static calculate(context: WorkingDaysCalculationContext): WorkingDaysResult {
    const { startDate, endDate, fraction, weeklyRestDays, publicHolidays } = context;

    // Normalize holiday dates to YYYY-MM-DD strings for O(1) membership check
    const holidaySet = new Set(
      publicHolidays.map((h) => this.toISODateString(h))
    );

    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    let totalCalendarDays = 0;
    let excludedHolidaysCount = 0;
    let excludedWeeklyRestDaysCount = 0;
    let validWorkingDaysCount = 0;
    const excludedDates: Date[] = [];

    const current = new Date(start);

    while (current <= end) {
      totalCalendarDays++;
      const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const dateString = this.toISODateString(current);

      const isWeeklyRest = weeklyRestDays.includes(dayOfWeek);
      const isPublicHoliday = holidaySet.has(dateString);

      if (isPublicHoliday) {
        // Public holiday takes precedence or counts as holiday exclusion
        excludedHolidaysCount++;
        excludedDates.push(new Date(current));
      } else if (isWeeklyRest) {
        excludedWeeklyRestDaysCount++;
        excludedDates.push(new Date(current));
      } else {
        validWorkingDaysCount++;
      }

      current.setDate(current.getDate() + 1);
    }

    let calculatedWorkingDays = 0;

    if (fraction === 'FULL_DAY') {
      calculatedWorkingDays = validWorkingDaysCount;
    } else {
      // Fraction is HALF_DAY_MORNING or HALF_DAY_AFTERNOON
      if (validWorkingDaysCount > 0) {
        calculatedWorkingDays = 0.5;
      } else {
        calculatedWorkingDays = 0.0;
      }
    }

    return {
      totalCalendarDays,
      calculatedWorkingDays,
      excludedHolidaysCount,
      excludedWeeklyRestDaysCount,
      excludedDates,
    };
  }

  private static toISODateString(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
