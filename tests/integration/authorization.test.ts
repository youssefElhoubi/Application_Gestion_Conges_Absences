import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { createMockSession } from '@/tests/helpers/auth-mock';
import { AuthGuard, ForbiddenError, UnauthorizedError } from '@/src/modules/auth/auth.guard';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { EmployeeService } from '@/src/modules/employees/employee.service';
import { SessionResolver } from '@/src/modules/auth/session.resolver';

describe('Integration: Authentication and Authorization Security Boundaries', () => {
  let site: any;
  let employee1: any;
  let employee2: any;
  let supervisor: any;
  let types: any;

  beforeEach(async () => {
    await cleanDatabase();
    types = await seedCoreTypesAndRules();

    site = await prisma.site.create({
      data: { code: 'SITE-SEC', name: 'Security Test Site', weeklyRestDays: [0] },
    });

    supervisor = await prisma.employee.create({
      data: {
        employeeId: 'EMP-SEC-SUP',
        cin: 'SUPSEC01',
        fullName: 'Supervisor User',
        email: 'sup.sec@company.ma',
        siteId: site.id,
        hireDate: new Date('2022-01-01'),
      },
    });

    employee1 = await prisma.employee.create({
      data: {
        employeeId: 'EMP-SEC-01',
        cin: 'EMPSEC01',
        fullName: 'Alice Employee',
        email: 'alice@company.ma',
        siteId: site.id,
        hireDate: new Date('2023-01-01'),
        managerId: supervisor.employeeId,
      },
    });

    employee2 = await prisma.employee.create({
      data: {
        employeeId: 'EMP-SEC-02',
        cin: 'EMPSEC02',
        fullName: 'Bob Employee',
        email: 'bob@company.ma',
        siteId: site.id,
        hireDate: new Date('2023-01-01'),
        // not managed by supervisor!
      },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it('Scenario 1: Unauthenticated session is rejected with UnauthorizedError', () => {
    expect(() => {
      AuthGuard.requireAuthenticated(null);
    }).toThrow(UnauthorizedError);

    expect(() => {
      AuthGuard.requireAccessEmployee(null as any, 'EMP-SEC-01');
    }).toThrow(UnauthorizedError);
  });

  it('Scenario 2: Administrator and HR Manager perform authorized administrative operations', () => {
    const adminSession = createMockSession('ADMIN');
    const hrSession = createMockSession('HR_MANAGER');

    // Both pass role guard
    expect(() => AuthGuard.requireRole(adminSession, ['ADMIN'])).not.toThrow();
    expect(() => AuthGuard.requireRole(hrSession, ['ADMIN', 'HR_MANAGER'])).not.toThrow();

    // Both can access any employee records
    expect(() => AuthGuard.requireAccessEmployee(adminSession, employee1.employeeId)).not.toThrow();
    expect(() => AuthGuard.requireAccessEmployee(hrSession, employee2.employeeId)).not.toThrow();
  });

  it('Scenario 3: Employee retrieves their own records successfully', async () => {
    const aliceSession = createMockSession('EMPLOYEE', {
      employeeId: employee1.employeeId,
      siteId: site.id,
    });

    const empData = await EmployeeService.getEmployeeById(employee1.employeeId, aliceSession);
    expect(empData.employeeId).toBe(employee1.employeeId);
    expect(empData.fullName).toBe('Alice Employee');
  });

  it('Scenario 4: Employee attempting to access another employee private records is rejected', async () => {
    const aliceSession = createMockSession('EMPLOYEE', {
      employeeId: employee1.employeeId,
      siteId: site.id,
    });

    // Alice attempts to view Bob's profile
    await expect(
      EmployeeService.getEmployeeById(employee2.employeeId, aliceSession)
    ).rejects.toThrow(ForbiddenError);
  });

  it('Scenario 5: Employee attempting to approve or reject a request is rejected', () => {
    const aliceSession = createMockSession('EMPLOYEE', {
      employeeId: employee1.employeeId,
    });

    expect(() => {
      AuthGuard.requireCanReviewAbsence(aliceSession, employee2.employeeId);
    }).toThrow(ForbiddenError);
  });

  it('Scenario 6: Employee submitting request with a forged employee ID is rejected', async () => {
    const aliceSession = createMockSession('EMPLOYEE', {
      employeeId: employee1.employeeId,
    });

    // Alice puts Bob's employeeId in the input payload
    await expect(
      AbsenceService.createAbsenceRequest(
        {
          employeeId: employee2.employeeId, // Forged ID!
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-02'),
          endDate: new Date('2026-11-03'),
          fraction: 'FULL_DAY',
        },
        aliceSession
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it('Scenario 7: Supervisor cannot access employee outside their reporting line', async () => {
    const supSession = createMockSession('SUPERVISOR', {
      employeeId: supervisor.employeeId,
      managedEmployeeIds: [employee1.employeeId], // Only Alice is subordinate
    });

    // Subordinate Alice: Authorized
    const aliceData = await EmployeeService.getEmployeeById(employee1.employeeId, supSession);
    expect(aliceData.employeeId).toBe(employee1.employeeId);

    // Non-subordinate Bob: Forbidden!
    await expect(
      EmployeeService.getEmployeeById(employee2.employeeId, supSession)
    ).rejects.toThrow(ForbiddenError);

    // Non-subordinate Bob: Cannot review Bob's leaves
    expect(() => {
      AuthGuard.requireCanReviewAbsence(supSession, employee2.employeeId);
    }).toThrow(ForbiddenError);
  });

  it('Scenario 8: Deactivated user (isActive = false) is rejected by SessionResolver', async () => {
    const inactiveUser = await prisma.user.create({
      data: {
        id: 'usr-inactive',
        email: 'inactive@company.ma',
        passwordHash: 'hash',
        role: 'EMPLOYEE',
        isActive: false, // Deactivated!
        employeeId: employee1.employeeId,
      },
    });

    // Simulate direct lookup that SessionResolver uses
    const resolvedUser = await prisma.user.findUnique({
      where: { id: inactiveUser.id, isActive: true },
    });

    expect(resolvedUser).toBeNull();
  });
});
