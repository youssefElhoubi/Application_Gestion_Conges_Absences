import { AgeSeniorityCalculator } from '../calculations/age-seniority.calculator';
import {
  AnnualLeaveAccrualCalculator,
  AccrualCalculationResult,
} from '../calculations/annual-leave-accrual.calculator';
import {
  WorkingDaysCalculator,
} from '../calculations/working-days.calculator';
import {
  BalanceCalculator,
  RawBalanceComponents,
} from '../calculations/balance.calculator';
import {
  RecoveryBalanceCalculator,
  RawCreditRecord,
  RecoveryBalanceSummary,
  FifoConsumptionPlan,
} from '../calculations/recovery-balance.calculator';
import {
  MonthlyCalendarCalculator,
  MonthlyCalendarInput,
  MonthlyCalendarOutput,
} from '../calculations/monthly-calendar.calculator';
import {
  WorkingDaysCalculationContext,
  WorkingDaysResult,
  DynamicBalanceResult,
} from '../types/business-logic.types';
import { Fraction } from '@/src/generated/prisma';

export interface SeniorityResult {
  completedMonths: number;
  completedYears: number;
  isEligibleForAnnualLeave: boolean; // >= 6 months
}

export interface AgeResult {
  ageYears: number | null;
  isMinor: boolean; // < 18
  statutoryAccrualRate: number; // 2.0 if minor, 1.5 if adult
}

/**
 * Unified Leave Calculation Engine Facade
 * Provides static access to all 8 core business calculation algorithms.
 */
export class LeaveCalculationEngine {
  /**
   * 1. Annual Leave Acquisition Algorithm (Moroccan Labor Code Art. 231 & 232)
   */
  public static calculateAnnualLeaveAcquisition(
    hireDate: Date,
    birthDate: Date | null,
    referenceDate: Date = new Date()
  ): AccrualCalculationResult {
    return AnnualLeaveAccrualCalculator.calculateAccrual(hireDate, birthDate, referenceDate);
  }

  /**
   * 2. Seniority Calculation Algorithm
   */
  public static calculateSeniority(
    hireDate: Date,
    referenceDate: Date = new Date()
  ): SeniorityResult {
    const completedMonths = AgeSeniorityCalculator.calculateSeniorityMonths(hireDate, referenceDate);
    const completedYears = AgeSeniorityCalculator.calculateSeniorityYears(hireDate, referenceDate);
    return {
      completedMonths,
      completedYears,
      isEligibleForAnnualLeave: completedMonths >= 6,
    };
  }

  /**
   * 3. Age Calculation Algorithm
   */
  public static calculateAge(
    birthDate: Date | null,
    referenceDate: Date = new Date()
  ): AgeResult {
    const ageYears = AgeSeniorityCalculator.calculateAge(birthDate, referenceDate);
    const isMinor = AgeSeniorityCalculator.isMinor(birthDate, referenceDate);
    const statutoryAccrualRate = isMinor ? 2.0 : 1.5;
    return {
      ageYears,
      isMinor,
      statutoryAccrualRate,
    };
  }

  /**
   * 4. Working Days Calculation Algorithm
   */
  public static calculateWorkingDays(
    context: WorkingDaysCalculationContext
  ): WorkingDaysResult {
    return WorkingDaysCalculator.calculate(context);
  }

  /**
   * 5. Public Holiday Exclusion Algorithm
   * Isolates dates falling on statutory paid public holidays within an absence interval
   * and verifies they do not consume leave balance.
   */
  public static excludePublicHolidays(
    startDate: Date,
    endDate: Date,
    publicHolidays: Date[],
    weeklyRestDays: number[] = [0]
  ): {
    holidayDatesExcluded: Date[];
    deductibleWorkingDays: number;
    totalCalendarDays: number;
  } {
    const result = WorkingDaysCalculator.calculate({
      startDate,
      endDate,
      fraction: 'FULL_DAY',
      weeklyRestDays,
      publicHolidays,
    });

    return {
      holidayDatesExcluded: result.excludedDates,
      deductibleWorkingDays: result.calculatedWorkingDays,
      totalCalendarDays: result.totalCalendarDays,
    };
  }

  /**
   * 6. Leave Balance Calculation Algorithm (Dynamic aggregation without stale counters)
   */
  public static calculateLeaveBalance(
    components: RawBalanceComponents
  ): DynamicBalanceResult {
    return BalanceCalculator.calculate(components);
  }

  /**
   * 7. Recovery Balance Calculation & FIFO Consumption Algorithm
   */
  public static calculateRecoveryBalance(
    credits: RawCreditRecord[]
  ): RecoveryBalanceSummary {
    return RecoveryBalanceCalculator.calculateBalance(credits);
  }

  public static planRecoveryConsumption(
    credits: RawCreditRecord[],
    daysToConsume: number
  ): FifoConsumptionPlan {
    return RecoveryBalanceCalculator.planFifoConsumption(credits, daysToConsume);
  }

  /**
   * 8. Monthly Calendar Generation Algorithm
   */
  public static generateMonthlyCalendar(
    input: MonthlyCalendarInput
  ): MonthlyCalendarOutput {
    return MonthlyCalendarCalculator.generate(input);
  }
}
