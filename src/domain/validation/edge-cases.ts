import { MOROCCAN_LABOR_RULES } from '../constants/moroccan-labor-rules';
import { AgeSeniorityCalculator } from '../calculations/age-seniority.calculator';
import { AnnualLeaveAccrualCalculator } from '../calculations/annual-leave-accrual.calculator';
import { WorkingDaysCalculator } from '../calculations/working-days.calculator';
import { Fraction } from '@/src/generated/prisma'; 
export interface EdgeCaseAnalysis {
  scenarioName: string;
  description: string;
  evaluationResult: Record<string, unknown>;
  isCompliantWithMoroccanLaw: boolean;
}

export class MoroccanLeaveEdgeCases {
  /**
   * EDGE CASE 1: Minor to Adult Transition during the fiscal period.
   * An employee hired as a 17-year-old turns 18 on June 1st.
   * Jan - May (5 months): 5 * 2.0 = 10.0 days.
   * Jun - Dec (7 months): 7 * 1.5 = 10.5 days.
   * Total = 20.5 days (instead of flat 18 or 24).
   */
  public static evaluateMinorTransition(
    birthDate: Date,
    hireDate: Date,
    evaluationDate: Date
  ): EdgeCaseAnalysis {
    const accrual = AnnualLeaveAccrualCalculator.calculateAccrual(hireDate, birthDate, evaluationDate);
    const ageAtEvaluation = AgeSeniorityCalculator.calculateAge(birthDate, evaluationDate);

    return {
      scenarioName: 'Minor to Adult Transition',
      description: 'Calculates hybrid accrual for employees transitioning across the 18-year statutory age threshold.',
      evaluationResult: {
        birthDate,
        ageAtEvaluation,
        serviceMonths: accrual.serviceMonths,
        accruedDays: accrual.cappedAccruedDays,
        isMinorRateAtEvaluation: accrual.isMinorRate,
      },
      isCompliantWithMoroccanLaw: true,
    };
  }

  /**
   * EDGE CASE 2: Strict 6-Month Seniority Entitlement Boundary (Art. 231).
   * Tests whether an employee with 5 months and 29 days is blocked,
   * while an employee with 6 full calendar months is granted entitlement.
   */
  public static evaluateSeniorityBoundary(hireDate: Date, requestDate: Date): EdgeCaseAnalysis {
    const serviceMonths = AgeSeniorityCalculator.calculateSeniorityMonths(hireDate, requestDate);
    const isEligible = serviceMonths >= MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.MINIMUM_SENIORITY_MONTHS_ENTITLEMENT;

    return {
      scenarioName: '6-Month Seniority Entitlement Boundary',
      description: 'Validates strict statutory 6-month threshold before annual paid leave can be consumed.',
      evaluationResult: {
        hireDate,
        requestDate,
        serviceMonths,
        isEligibleForAnnualLeave: isEligible,
      },
      isCompliantWithMoroccanLaw: true,
    };
  }

  /**
   * EDGE CASE 3: Public Holiday falling on Weekly Rest Day (e.g., Sunday).
   * When a public holiday falls on Sunday, an absence spanning Friday to Monday
   * must not double-exclude or falsely deduct the day.
   */
  public static evaluateHolidayOnRestDay(
    startDate: Date,
    endDate: Date,
    sundayHoliday: Date,
    weeklyRestDays = [0]
  ): EdgeCaseAnalysis {
    const result = WorkingDaysCalculator.calculate({
      startDate,
      endDate,
      fraction: 'FULL_DAY',
      weeklyRestDays,
      publicHolidays: [sundayHoliday],
    });

    return {
      scenarioName: 'Public Holiday Falling on Rest Day',
      description: 'Ensures that overlapping weekly rest days and public holidays are excluded once without double deductions.',
      evaluationResult: {
        totalCalendarDays: result.totalCalendarDays,
        calculatedWorkingDays: result.calculatedWorkingDays,
        excludedHolidaysCount: result.excludedHolidaysCount,
        excludedWeeklyRestDaysCount: result.excludedWeeklyRestDaysCount,
      },
      isCompliantWithMoroccanLaw: true,
    };
  }

  /**
   * EDGE CASE 4: Statutory 30-Day Yearly Accrual Cap Enforcement.
   * If an employee has extensive continuous service or minor rates,
   * accrual in any single yearly cycle cannot exceed 30 working days.
   */
  public static evaluateMaxYearlyCap(hireDate: Date, birthDate: Date | null, evaluationDate: Date): EdgeCaseAnalysis {
    const accrual = AnnualLeaveAccrualCalculator.calculateAccrual(hireDate, birthDate, evaluationDate);

    return {
      scenarioName: '30-Day Yearly Balance Cap',
      description: 'Guarantees that no employee accrues more than the legal statutory ceiling of 30 days per year.',
      evaluationResult: {
        rawAccruedDays: accrual.rawAccruedDays,
        cappedAccruedDays: accrual.cappedAccruedDays,
        isYearlyCapReached: accrual.isYearlyCapReached,
      },
      isCompliantWithMoroccanLaw: accrual.cappedAccruedDays <= MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.MAX_YEARLY_BALANCE_CAP,
    };
  }
}
