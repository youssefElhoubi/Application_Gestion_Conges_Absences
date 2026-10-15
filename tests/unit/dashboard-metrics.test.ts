import { describe, it, expect } from 'vitest';
import {
  DashboardMetricsFilterSchema,
} from '@/src/modules/dashboard/dashboard-metrics.schema';
import { AuthSession, AuthGuard } from '@/src/modules/auth/auth.guard';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

describe('Unit: Dashboard Metrics Calculation & Filtering Logic', () => {
  it('Scenario 1: DashboardMetricsFilterSchema validation & date boundaries', () => {
    // Valid defaults
    const parsedDefault = DashboardMetricsFilterSchema.parse({});
    expect(parsedDefault.periodMode).toBe('current_year');

    // Valid date range
    const validRange = DashboardMetricsFilterSchema.parse({
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      siteId: 1,
    });
    expect(validRange.startDate).toBeInstanceOf(Date);
    expect(validRange.endDate).toBeInstanceOf(Date);
    expect(validRange.siteId).toBe(1);

    // Invalid: endDate earlier than startDate
    expect(() => {
      DashboardMetricsFilterSchema.parse({
        startDate: '2026-06-30',
        endDate: '2026-01-01',
      });
    }).toThrow();
  });

  it('Scenario 2: Active vs Inactive employee filtering logic', () => {
    const employees = [
      { employeeId: 'EMP-1', siteId: 1, active: true },
      { employeeId: 'EMP-2', siteId: 1, active: false }, // inactive
      { employeeId: 'EMP-3', siteId: 2, active: true },
      { employeeId: 'EMP-4', siteId: 2, active: false }, // inactive
    ];

    const globalActive = employees.filter((e) => e.active).length;
    expect(globalActive).toBe(2);

    const site1Active = employees.filter((e) => e.active && e.siteId === 1).length;
    expect(site1Active).toBe(1);
  });

  it('Scenario 3: Validated leave days (Annual paid leave only & half-days)', () => {
    const absences = [
      { id: 1, typeCode: 'CONGE_PAYE', status: 'APPROVED', retainedDays: 4.0 },
      { id: 2, typeCode: 'CONGE_PAYE', status: 'APPROVED', retainedDays: 0.5 },
      { id: 3, typeCode: 'CONGE_PAYE', status: 'PENDING', retainedDays: 2.0 }, // pending excluded
      { id: 4, typeCode: 'CONGE_PAYE', status: 'REJECTED', retainedDays: 3.0 }, // rejected excluded
      { id: 5, typeCode: 'CONGE_PAYE', status: 'CANCELLED', retainedDays: 1.0 }, // cancelled excluded
      { id: 6, typeCode: 'EVENEMENT_FAMILIAL', status: 'APPROVED', retainedDays: 4.0 }, // different type
      { id: 7, typeCode: 'RECUPERATION', status: 'APPROVED', retainedDays: 1.0 }, // recovery
      { id: 8, typeCode: 'ABSENCE_INJUSTIFIEE', status: 'APPROVED', retainedDays: 2.0 },
    ];

    const validatedLeaveDays = absences
      .filter((a) => a.status === 'APPROVED' && a.typeCode === 'CONGE_PAYE')
      .reduce((sum, a) => sum + a.retainedDays, 0);

    expect(validatedLeaveDays).toBe(4.5);
  });

  it('Scenario 4: Recovery days available formula & pending reservation', () => {
    const credits = [
      { id: 1, creditedDays: 2.0, consumedDays: 0.5, isFullyConsumed: false },
      { id: 2, creditedDays: 1.0, consumedDays: 1.0, isFullyConsumed: true },
      { id: 3, creditedDays: 1.0, consumedDays: 0.0, isFullyConsumed: false },
    ];

    const availableRecoveryDays = credits
      .filter((c) => !c.isFullyConsumed)
      .reduce((sum, c) => sum + (c.creditedDays - c.consumedDays), 0);

    expect(availableRecoveryDays).toBe(2.5);

    const pendingRecoveryAbsences = [
      { typeCode: 'RECUPERATION', status: 'PENDING', retainedDays: 1.0 },
    ];
    const reservedRecoveryDays = pendingRecoveryAbsences.reduce((sum, a) => sum + a.retainedDays, 0);
    expect(reservedRecoveryDays).toBe(1.0);

    const unreservedAvailable = availableRecoveryDays - reservedRecoveryDays;
    expect(unreservedAvailable).toBe(1.5);
  });

  it('Scenario 5: Unjustified absence days vs count', () => {
    const absences = [
      { typeCode: 'ABSENCE_INJUSTIFIEE', status: 'APPROVED', retainedDays: 3.0 },
      { typeCode: 'ABSENCE_INJUSTIFIEE', status: 'APPROVED', retainedDays: 1.5 },
      { typeCode: 'ABSENCE_INJUSTIFIEE', status: 'PENDING', retainedDays: 1.0 },
      { typeCode: 'CONGE_PAYE', status: 'APPROVED', retainedDays: 5.0 },
    ];

    const approvedUnjustified = absences.filter(
      (a) => a.typeCode === 'ABSENCE_INJUSTIFIEE' && a.status === 'APPROVED'
    );

    const nonJustifiedAbsenceDays = approvedUnjustified.reduce((sum, a) => sum + a.retainedDays, 0);
    const nonJustifiedAbsenceCount = approvedUnjustified.length;

    expect(nonJustifiedAbsenceDays).toBe(4.5);
    expect(nonJustifiedAbsenceCount).toBe(2);
  });

  it('Scenario 6: Pending requests count & supervisor scope (excluding self-approval)', () => {
    const supervisorManagedIds = ['EMP-10', 'EMP-11'];
    const supervisorOwnId = 'EMP-SUP';

    const pendingRequests = [
      { id: 1, employeeId: 'EMP-10', status: 'PENDING' },
      { id: 2, employeeId: 'EMP-11', status: 'PENDING' },
      { id: 3, employeeId: 'EMP-99', status: 'PENDING' },
      { id: 4, employeeId: supervisorOwnId, status: 'PENDING' },
      { id: 5, employeeId: 'EMP-10', status: 'APPROVED' },
    ];

    const globalPending = pendingRequests.filter((r) => r.status === 'PENDING').length;
    expect(globalPending).toBe(4);

    const supervisorActionable = pendingRequests.filter(
      (r) => r.status === 'PENDING' && supervisorManagedIds.includes(r.employeeId)
    ).length;
    expect(supervisorActionable).toBe(2);
  });

  it('Scenario 7: RBAC scoping & access control check', () => {
    const employeeSession: AuthSession = {
      userId: 'u-1',
      email: 'emp@test.ma',
      role: 'EMPLOYEE',
      employeeId: 'EMP-01',
      siteId: 1,
      managedEmployeeIds: [],
    };

    const supervisorSession: AuthSession = {
      userId: 'u-2',
      email: 'sup@test.ma',
      role: 'SUPERVISOR',
      employeeId: 'EMP-SUP',
      siteId: 1,
      managedEmployeeIds: ['EMP-01', 'EMP-02'],
    };

    expect(AuthGuard.canAccessEmployee(employeeSession, 'EMP-99')).toBe(false);
    expect(AuthGuard.canAccessEmployee(supervisorSession, 'EMP-99')).toBe(false);
    expect(AuthGuard.canAccessEmployee(supervisorSession, 'EMP-01')).toBe(true);
  });

  it('Scenario 8: Decimal and BigInt serialization safety', () => {
    const mockPayload = {
      id: BigInt(999999999),
      validatedLeaveDays: 14.5,
      decimalMock: { isDecimal: true, toString: () => '14.50' },
    };

    const serialized = serializeForClient(mockPayload);
    expect(typeof serialized.id).toBe('string');
    expect(serialized.id).toBe('999999999');
    expect(typeof serialized.decimalMock).toBe('number');
    expect(serialized.decimalMock).toBe(14.5);
  });
});
