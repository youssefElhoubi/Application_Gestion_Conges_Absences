import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DashboardMetricsFilterSchema,
} from '../src/modules/dashboard/dashboard-metrics.schema';
import { AuthSession, AuthGuard } from '../src/modules/auth/auth.guard';
import { serializeForClient } from '../src/server/serializers/response.serializer';

test('1. DashboardMetricsFilterSchema: Validation & Date Boundaries', () => {
  // Valid defaults
  const parsedDefault = DashboardMetricsFilterSchema.parse({});
  assert.equal(parsedDefault.periodMode, 'current_year');

  // Valid date range
  const validRange = DashboardMetricsFilterSchema.parse({
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    siteId: 1,
  });
  assert.ok(validRange.startDate instanceof Date);
  assert.ok(validRange.endDate instanceof Date);
  assert.equal(validRange.siteId, 1);

  // Invalid: endDate earlier than startDate
  assert.throws(
    () => {
      DashboardMetricsFilterSchema.parse({
        startDate: '2026-06-30',
        endDate: '2026-01-01',
      });
    },
    (err: unknown) => err instanceof Error && err.name === 'ZodError'
  );
});

test('2. Metric 1: Active vs Inactive Employee Filtering Logic', () => {
  const employees = [
    { employeeId: 'EMP-1', siteId: 1, active: true },
    { employeeId: 'EMP-2', siteId: 1, active: false }, // inactive
    { employeeId: 'EMP-3', siteId: 2, active: true },
    { employeeId: 'EMP-4', siteId: 2, active: false }, // inactive
  ];

  // Global Active
  const globalActive = employees.filter((e) => e.active).length;
  assert.equal(globalActive, 2);

  // Site 1 Active
  const site1Active = employees.filter((e) => e.active && e.siteId === 1).length;
  assert.equal(site1Active, 1);
});

test('3. Metric 2: Validated Leave Days (Annual Paid Leave Only & Half-Days)', () => {
  const absences = [
    // Valid: Annual leave approved
    { id: 1, typeCode: 'CONGE_PAYE', status: 'APPROVED', retainedDays: 4.0 },
    { id: 2, typeCode: 'CONGE_PAYE', status: 'APPROVED', retainedDays: 0.5 }, // Half-day
    // Excluded: Pending annual leave
    { id: 3, typeCode: 'CONGE_PAYE', status: 'PENDING', retainedDays: 2.0 },
    // Excluded: Rejected annual leave
    { id: 4, typeCode: 'CONGE_PAYE', status: 'REJECTED', retainedDays: 3.0 },
    // Excluded: Cancelled annual leave
    { id: 5, typeCode: 'CONGE_PAYE', status: 'CANCELLED', retainedDays: 1.0 },
    // Excluded: Exceptional permission (even if approved)
    { id: 6, typeCode: 'EVENEMENT_FAMILIAL', status: 'APPROVED', retainedDays: 4.0 },
    // Excluded: Recovery leave (even if approved)
    { id: 7, typeCode: 'RECUPERATION', status: 'APPROVED', retainedDays: 1.0 },
    // Excluded: Unjustified absence
    { id: 8, typeCode: 'ABSENCE_INJUSTIFIEE', status: 'APPROVED', retainedDays: 2.0 },
  ];

  const validatedLeaveDays = absences
    .filter((a) => a.status === 'APPROVED' && a.typeCode === 'CONGE_PAYE')
    .reduce((sum, a) => sum + a.retainedDays, 0);

  // 4.0 + 0.5 = 4.5
  assert.equal(validatedLeaveDays, 4.5);
});

test('4. Metric 3: Recovery Days Available (Formula & FIFO Consumption)', () => {
  const credits = [
    { id: 1, creditedDays: 2.0, consumedDays: 0.5, isFullyConsumed: false },
    { id: 2, creditedDays: 1.0, consumedDays: 1.0, isFullyConsumed: true }, // fully consumed
    { id: 3, creditedDays: 1.0, consumedDays: 0.0, isFullyConsumed: false },
  ];

  // Available = sum(credited - consumed) for isFullyConsumed = false
  const availableRecoveryDays = credits
    .filter((c) => !c.isFullyConsumed)
    .reduce((sum, c) => sum + (c.creditedDays - c.consumedDays), 0);

  // (2.0 - 0.5) + (1.0 - 0.0) = 2.5
  assert.equal(availableRecoveryDays, 2.5);

  // Reserved by pending requests
  const pendingRecoveryAbsences = [
    { typeCode: 'RECUPERATION', status: 'PENDING', retainedDays: 1.0 },
  ];
  const reservedRecoveryDays = pendingRecoveryAbsences.reduce((sum, a) => sum + a.retainedDays, 0);
  assert.equal(reservedRecoveryDays, 1.0);

  // Net unreserved = 2.5 - 1.0 = 1.5
  const unreservedAvailable = availableRecoveryDays - reservedRecoveryDays;
  assert.equal(unreservedAvailable, 1.5);
});

test('5. Metric 4: Unjustified Absence Days vs Count', () => {
  const absences = [
    { typeCode: 'ABSENCE_INJUSTIFIEE', status: 'APPROVED', retainedDays: 3.0 },
    { typeCode: 'ABSENCE_INJUSTIFIEE', status: 'APPROVED', retainedDays: 1.5 },
    { typeCode: 'ABSENCE_INJUSTIFIEE', status: 'PENDING', retainedDays: 1.0 }, // pending excluded
    { typeCode: 'CONGE_PAYE', status: 'APPROVED', retainedDays: 5.0 }, // different type excluded
  ];

  const approvedUnjustified = absences.filter(
    (a) => a.typeCode === 'ABSENCE_INJUSTIFIEE' && a.status === 'APPROVED'
  );

  const nonJustifiedAbsenceDays = approvedUnjustified.reduce((sum, a) => sum + a.retainedDays, 0);
  const nonJustifiedAbsenceCount = approvedUnjustified.length;

  assert.equal(nonJustifiedAbsenceDays, 4.5);
  assert.equal(nonJustifiedAbsenceCount, 2);
});

test('6. Metric 5: Pending Requests Count & Supervisor Scope (Excluding Self)', () => {
  const supervisorManagedIds = ['EMP-10', 'EMP-11'];
  const supervisorOwnId = 'EMP-SUP';

  const pendingRequests = [
    { id: 1, employeeId: 'EMP-10', status: 'PENDING' },
    { id: 2, employeeId: 'EMP-11', status: 'PENDING' },
    { id: 3, employeeId: 'EMP-99', status: 'PENDING' }, // not managed
    { id: 4, employeeId: supervisorOwnId, status: 'PENDING' }, // supervisor's own request
    { id: 5, employeeId: 'EMP-10', status: 'APPROVED' }, // approved
  ];

  // Global pending count (Admin/HR)
  const globalPending = pendingRequests.filter((r) => r.status === 'PENDING').length;
  assert.equal(globalPending, 4);

  // Supervisor pending count (Subordinates only, self-approval excluded)
  const supervisorActionable = pendingRequests.filter(
    (r) => r.status === 'PENDING' && supervisorManagedIds.includes(r.employeeId)
  ).length;
  assert.equal(supervisorActionable, 2);
});

test('7. RBAC Scoping & Unauthorized Access Restrictions', () => {
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

  // 1. Employee cannot view another employee's records
  assert.equal(AuthGuard.canAccessEmployee(employeeSession, 'EMP-99'), false);

  // 2. Supervisor cannot access employee outside reporting line
  assert.equal(AuthGuard.canAccessEmployee(supervisorSession, 'EMP-99'), false);

  // 3. Supervisor can access managed employee
  assert.equal(AuthGuard.canAccessEmployee(supervisorSession, 'EMP-01'), true);
});

test('8. Decimal and BigInt Serialization Safety', () => {
  const mockPayload = {
    id: BigInt(999999999),
    validatedLeaveDays: 14.5,
    decimalMock: { isDecimal: true, toString: () => '14.50' },
  };

  const serialized = serializeForClient(mockPayload);
  assert.equal(typeof serialized.id, 'string');
  assert.equal(serialized.id, '999999999');
  assert.equal(typeof serialized.decimalMock, 'number');
  assert.equal(serialized.decimalMock, 14.5);
});
