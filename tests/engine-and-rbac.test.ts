import test from 'node:test';
import assert from 'node:assert/strict';

import { LeaveCalculationEngine } from '../src/domain/engine/leave-calculation.engine';
import { LeaveValidationRules } from '../src/domain/validation/leave-validation.rules';
import { AuthGuard, AuthSession, ForbiddenError, UnauthorizedError } from '../src/modules/auth/auth.guard';
import { MoroccanLeaveEdgeCases } from '../src/domain/validation/edge-cases';
import {
  SeniorityThresholdNotMetError,
  ExceptionalPermissionQuotaExceededError,
  OverlappingAbsenceError,
  ZeroWorkingDaysError,
  RecoveryCreditDepletedError,
} from '../src/domain/errors/domain-errors';

test('1. Age Calculation Engine', () => {
  const refDate = new Date('2026-10-13');
  
  // Adult (born 1995)
  const adult = LeaveCalculationEngine.calculateAge(new Date('1995-05-20'), refDate);
  assert.equal(adult.ageYears, 31);
  assert.equal(adult.isMinor, false);
  assert.equal(adult.statutoryAccrualRate, 1.5);

  // Minor (born 2009)
  const minor = LeaveCalculationEngine.calculateAge(new Date('2009-02-10'), refDate);
  assert.equal(minor.ageYears, 17);
  assert.equal(minor.isMinor, true);
  assert.equal(minor.statutoryAccrualRate, 2.0);
});

test('2. Seniority Calculation Engine', () => {
  const refDate = new Date('2026-10-13');

  // Hired exactly 5 months ago (May 13, 2026)
  const fiveMonths = LeaveCalculationEngine.calculateSeniority(new Date('2026-05-13'), refDate);
  assert.equal(fiveMonths.completedMonths, 5);
  assert.equal(fiveMonths.isEligibleForAnnualLeave, false); // < 6 months

  // Hired 6 months ago (April 13, 2026)
  const sixMonths = LeaveCalculationEngine.calculateSeniority(new Date('2026-04-13'), refDate);
  assert.equal(sixMonths.completedMonths, 6);
  assert.equal(sixMonths.isEligibleForAnnualLeave, true); // >= 6 months (Art. 231)
});

test('3. Annual Leave Accrual & 30-Day Cap (Art. 231 & 232)', () => {
  const refDate = new Date('2026-12-31');
  const hireDate = new Date('2020-01-01'); // 6 full years
  const birthDate = new Date('1990-01-01'); // Adult

  const accrual = LeaveCalculationEngine.calculateAnnualLeaveAcquisition(hireDate, birthDate, refDate);
  // Base: 12 months * 1.5 = 18 days
  assert.equal(accrual.baseAccruedDays, 18.0);
  // Seniority bonus: 6 years -> 1 block of 5 years * 1.5 = 1.5 days
  assert.equal(accrual.seniorityBonusDays, 1.5);
  assert.equal(accrual.cappedAccruedDays, 19.5);
  assert.equal(accrual.isEntitlementUnlocked, true);
  assert.equal(accrual.usableAccruedDays, 19.5);

  // Test Cap of 30 days
  const extremeHireDate = new Date('1980-01-01'); // 46 years
  const cappedAccrual = LeaveCalculationEngine.calculateAnnualLeaveAcquisition(extremeHireDate, birthDate, refDate);
  assert.equal(cappedAccrual.cappedAccruedDays, 30.0);
  assert.equal(cappedAccrual.isYearlyCapReached, true);
});

test('4. Working Days Calculation & Public Holiday Exclusion', () => {
  // Date range: Friday Oct 2 to Tuesday Oct 6, 2026 (5 calendar days)
  // Public holiday on Monday Oct 5
  // Sunday Oct 4 is weekly rest (0)
  const startDate = new Date('2026-10-02');
  const endDate = new Date('2026-10-06');
  const holiday = new Date('2026-10-05');

  const result = LeaveCalculationEngine.calculateWorkingDays({
    startDate,
    endDate,
    fraction: 'FULL_DAY',
    weeklyRestDays: [0], // Sunday
    publicHolidays: [holiday],
  });

  // Calendar: Fri (work), Sat (work), Sun (rest), Mon (holiday), Tue (work)
  assert.equal(result.totalCalendarDays, 5);
  assert.equal(result.calculatedWorkingDays, 3);
  assert.equal(result.excludedHolidaysCount, 1);
  assert.equal(result.excludedWeeklyRestDaysCount, 1);
});

test('5. Recovery Balance & Non-Expiring FIFO Consumption Plan', () => {
  const credits = [
    {
      id: BigInt(1),
      creditedDays: 1.0,
      consumedDays: 0.0,
      isFullyConsumed: false,
      createdAt: new Date('2024-05-01'), // Old credit (never expires)
    },
    {
      id: BigInt(2),
      creditedDays: 1.0,
      consumedDays: 0.0,
      isFullyConsumed: false,
      createdAt: new Date('2025-05-01'),
    },
  ];

  const balance = LeaveCalculationEngine.calculateRecoveryBalance(credits);
  assert.equal(balance.activeAvailableCredits, 2.0);
  assert.equal(balance.neverExpires, true);

  // Plan FIFO consumption of 1.5 days
  const plan = LeaveCalculationEngine.planRecoveryConsumption(credits, 1.5);
  assert.equal(plan.isFeasible, true);
  assert.equal(plan.debitSteps.length, 2);
  assert.equal(plan.debitSteps[0].newlyConsumed, 1.0);
  assert.equal(plan.debitSteps[0].becomesFullyConsumed, true);
  assert.equal(plan.debitSteps[1].newlyConsumed, 0.5);
  assert.equal(plan.debitSteps[1].becomesFullyConsumed, false);
});

test('6. Leave Validation Rules: Invariants & Quotas', () => {
  const employeeProfile = {
    employeeId: 'EMP-001',
    fullName: 'Youssef Elhoubi',
    birthDate: new Date('1992-04-10'),
    hireDate: new Date('2026-08-01'), // only 2 months ago!
    active: true,
    siteId: 1,
    weeklyRestDays: [0],
  };

  const currentBalance = {
    employeeId: 'EMP-001',
    referenceDate: new Date('2026-10-13'),
    serviceMonths: 2,
    serviceYears: 0,
    isEligibleForAnnualLeave: false,
    statutoryAccruedDays: 3.0,
    activeRecoveryCreditDays: 0.0,
    totalApprovedDeductions: 0.0,
    netAvailableBalance: 0.0,
    calculationBreakdown: {
      monthlyRateApplied: 1.5,
      isMinorRate: false,
      seniorityMonths: 2,
      maxYearlyCapEnforced: false,
      unconsumedHolidayCreditsCount: 0,
    },
  };

  // 1. Annual leave with < 6 months seniority must fail
  assert.throws(
    () => {
      LeaveValidationRules.validate({
        employee: employeeProfile,
        typeCode: 'CONGE_PAYE',
        isDeductible: true,
        startDate: new Date('2026-10-15'),
        endDate: new Date('2026-10-16'),
        fraction: 'FULL_DAY',
        calculatedWorkingDays: 2,
        currentBalance,
        hasOverlappingAbsence: false,
      });
    },
    (err: any) => err instanceof SeniorityThresholdNotMetError
  );

  // 2. Exceptional permission exceeding statutory quota (Marriage of child allowed: 2 days, requested: 3 days)
  assert.throws(
    () => {
      LeaveValidationRules.validate({
        employee: employeeProfile,
        typeCode: 'EVENEMENT_FAMILIAL',
        isDeductible: false,
        reasonCode: 'MARIAGE_ENFANT',
        startDate: new Date('2026-10-15'),
        endDate: new Date('2026-10-17'),
        fraction: 'FULL_DAY',
        calculatedWorkingDays: 3,
        currentBalance,
        hasOverlappingAbsence: false,
      });
    },
    (err: any) => err instanceof ExceptionalPermissionQuotaExceededError
  );
});

test('7. RBAC & Self-Approval Prohibition Guards', () => {
  const employeeSession: AuthSession = {
    userId: 'user-emp-1',
    email: 'employee@company.ma',
    role: 'EMPLOYEE',
    employeeId: 'EMP-001',
    siteId: 1,
    managedEmployeeIds: [],
  };

  const hrSession: AuthSession = {
    userId: 'user-hr-1',
    email: 'hr@company.ma',
    role: 'HR_MANAGER',
    employeeId: 'EMP-HR',
    siteId: 1,
    managedEmployeeIds: [],
  };

  // Employee accessing another employee must fail
  assert.equal(AuthGuard.canAccessEmployee(employeeSession, 'EMP-999'), false);
  assert.throws(() => AuthGuard.requireAccessEmployee(employeeSession, 'EMP-999'), ForbiddenError);

  // Employee accessing self must succeed
  assert.equal(AuthGuard.canAccessEmployee(employeeSession, 'EMP-001'), true);

  // HR accessing any employee must succeed
  assert.equal(AuthGuard.canAccessEmployee(hrSession, 'EMP-001'), true);

  // Self-approval prohibition: HR approving their own request must fail!
  assert.equal(AuthGuard.canReviewAbsence(hrSession, 'EMP-HR'), false);
  assert.throws(() => AuthGuard.requireCanReviewAbsence(hrSession, 'EMP-HR'), ForbiddenError);

  // HR approving another employee's request must succeed
  assert.equal(AuthGuard.canReviewAbsence(hrSession, 'EMP-001'), true);
});

test('8. Edge Cases Verification', () => {
  // Minor transition
  const edgeMinor = MoroccanLeaveEdgeCases.evaluateMinorTransition(
    new Date('2008-06-01'), // turns 18 on 2026-06-01
    new Date('2026-01-01'),
    new Date('2026-12-31')
  );
  assert.equal(edgeMinor.isCompliantWithMoroccanLaw, true);

  // Seniority 6-month boundary
  const boundaryUnder = MoroccanLeaveEdgeCases.evaluateSeniorityBoundary(
    new Date('2026-05-01'),
    new Date('2026-10-15') // 5 full months
  );
  assert.equal(boundaryUnder.evaluationResult.isEligibleForAnnualLeave, false);

  const boundaryOver = MoroccanLeaveEdgeCases.evaluateSeniorityBoundary(
    new Date('2026-04-01'),
    new Date('2026-10-15') // 6 full months
  );
  assert.equal(boundaryOver.evaluationResult.isEligibleForAnnualLeave, true);
});
