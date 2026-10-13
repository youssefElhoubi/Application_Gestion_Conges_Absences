import { AbsenceValidationContext } from '../types/business-logic.types';
import { MOROCCAN_LABOR_RULES } from '../constants/moroccan-labor-rules';
import {
  InactiveEmployeeError,
  SeniorityThresholdNotMetError,
  InsufficientLeaveBalanceError,
  ExceptionalPermissionQuotaExceededError,
  OverlappingAbsenceError,
  ZeroWorkingDaysError,
  RecoveryCreditDepletedError,
} from '../errors/domain-errors';

export class LeaveValidationRules {
  /**
   * Enforces all Moroccan statutory and organizational leave invariants.
   */
  public static validate(context: AbsenceValidationContext): void {
    const {
      employee,
      typeCode,
      isDeductible,
      reasonCode,
      startDate,
      endDate,
      fraction,
      calculatedWorkingDays,
      currentBalance,
      hasOverlappingAbsence,
    } = context;

    // 1. Employee Active Status
    if (!employee.active) {
      throw new InactiveEmployeeError(employee.employeeId);
    }

    // 2. Date Sequence
    if (endDate < startDate) {
      throw new Error('Absence end date cannot precede start date.');
    }

    // 3. Fraction Alignment
    if (fraction !== 'FULL_DAY') {
      const s = new Date(startDate).setHours(0, 0, 0, 0);
      const e = new Date(endDate).setHours(0, 0, 0, 0);
      if (s !== e) {
        throw new Error('Half-day absences must begin and conclude on the same calendar day.');
      }
    }

    // 4. Overlap Check
    if (hasOverlappingAbsence) {
      throw new OverlappingAbsenceError(startDate, endDate);
    }

    // 5. Zero Working Days Check (e.g. falling entirely on public holidays or weekly rest)
    if (calculatedWorkingDays <= 0) {
      throw new ZeroWorkingDaysError();
    }

    // 6. Annual Leave Rule: 6 Months Seniority Entitlement Threshold (Art. 231)
    if (typeCode === 'CONGE_PAYE' || typeCode === 'ANNUAL_LEAVE') {
      if (!currentBalance.isEligibleForAnnualLeave) {
        throw new SeniorityThresholdNotMetError(
          currentBalance.serviceMonths,
          MOROCCAN_LABOR_RULES.ANNUAL_LEAVE.MINIMUM_SENIORITY_MONTHS_ENTITLEMENT
        );
      }
    }

    // 7. Exceptional Permissions Statutory Quota Validation (Art. 274 & 269)
    if (reasonCode && this.isExceptionalPermissionReason(reasonCode)) {
      const quota = this.getExceptionalPermissionAllowedDays(reasonCode);
      if (quota !== null && calculatedWorkingDays > quota) {
        throw new ExceptionalPermissionQuotaExceededError(reasonCode, quota, calculatedWorkingDays);
      }
    }

    // 8. Recovery Leave Credit Validation (Must have unconsumed credits from worked holidays)
    if (typeCode === 'RECUPERATION' || typeCode === 'RECOVERY') {
      if (currentBalance.activeRecoveryCreditDays < calculatedWorkingDays) {
        throw new RecoveryCreditDepletedError(
          currentBalance.activeRecoveryCreditDays,
          calculatedWorkingDays
        );
      }
    }

    // 9. Paid Deductible Leave Balance Sufficiency
    if (isDeductible) {
      if (currentBalance.netAvailableBalance < calculatedWorkingDays) {
        throw new InsufficientLeaveBalanceError(
          currentBalance.netAvailableBalance,
          calculatedWorkingDays
        );
      }
    }
  }

  public static isExceptionalPermissionReason(reasonCode: string): boolean {
    const permissions = MOROCCAN_LABOR_RULES.EXCEPTIONAL_PERMISSIONS;
    return Object.values(permissions).some((p) => p.code === reasonCode);
  }

  public static getExceptionalPermissionAllowedDays(reasonCode: string): number | null {
    const permissions = MOROCCAN_LABOR_RULES.EXCEPTIONAL_PERMISSIONS;
    const match = Object.values(permissions).find((p) => p.code === reasonCode);
    return match ? match.allowedDays : null;
  }
}
