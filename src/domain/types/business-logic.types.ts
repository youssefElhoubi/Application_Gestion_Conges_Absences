import { Fraction } from "@/src/generated/prisma"; 

export interface EmployeeProfileContext {
  employeeId: string;
  fullName: string;
  birthDate: Date | null;
  hireDate: Date;
  active: boolean;
  siteId: number;
  weeklyRestDays: number[];
}

export interface DynamicBalanceResult {
  employeeId: string;
  referenceDate: Date;
  serviceMonths: number;
  serviceYears: number;
  isEligibleForAnnualLeave: boolean; // false if seniority < 6 months
  statutoryAccruedDays: number;     // calculated based on age (<18 => 2d/mo, >=18 => 1.5d/mo), capped at 30/yr
  activeRecoveryCreditDays: number; // sum of unconsumed credits from worked public holidays
  totalApprovedDeductions: number;  // sum of approved deductible absences
  netAvailableBalance: number;      // (statutory + recovery) - consumed
  calculationBreakdown: {
    monthlyRateApplied: number;
    isMinorRate: boolean;
    seniorityMonths: number;
    maxYearlyCapEnforced: boolean;
    unconsumedHolidayCreditsCount: number;
  };
}

export interface WorkingDaysCalculationContext {
  startDate: Date;
  endDate: Date;
  fraction: Fraction;
  weeklyRestDays: number[];
  publicHolidays: Date[];
}

export interface WorkingDaysResult {
  totalCalendarDays: number;
  calculatedWorkingDays: number; // working days excluding weekly rest and public holidays
  excludedHolidaysCount: number;
  excludedWeeklyRestDaysCount: number;
  excludedDates: Date[];
}

export interface AbsenceValidationContext {
  employee: EmployeeProfileContext;
  typeCode: string;
  isDeductible: boolean;
  reasonCode?: string | null;
  startDate: Date;
  endDate: Date;
  fraction: Fraction;
  calculatedWorkingDays: number;
  currentBalance: DynamicBalanceResult;
  hasOverlappingAbsence: boolean;
}
