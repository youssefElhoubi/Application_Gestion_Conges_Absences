import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { createMockSession } from '@/tests/helpers/auth-mock';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { AbsenceQuerySchema } from '@/src/modules/absences/absence.schema';
import { LeaveBalanceService } from '@/src/application/services/leave-balance.service';
import { Prisma } from '@/src/generated/prisma';
import type { Site, Employee, User } from '@/src/generated/prisma';

describe('Integration: Complete Absence Request Approval Workflow Lifecycle', () => {
  let site: Site;
  let employee: Employee;
  let supervisor: Employee;
  let hrUser: User;
  let employeeUser: User;
  let supervisorUser: User;
  let types: Awaited<ReturnType<typeof seedCoreTypesAndRules>>;

  beforeEach(async () => {
    await cleanDatabase();
    types = await seedCoreTypesAndRules();

    site = await prisma.site.create({
      data: { code: 'SITE-MAIN', name: 'Main Headquarters', weeklyRestDays: [0] },
    });

    // Supervisor employee
    supervisor = await prisma.employee.create({
      data: {
        employeeId: 'EMP-SUP-1',
        cin: 'SUP001',
        fullName: 'Karim Supervisor',
        email: 'karim@company.ma',
        siteId: site.id,
        hireDate: new Date('2020-01-01'),
      },
    });

    // Subordinate employee
    employee = await prisma.employee.create({
      data: {
        employeeId: 'EMP-SUB-1',
        cin: 'SUB001',
        fullName: 'Mehdi Employee',
        email: 'mehdi@company.ma',
        siteId: site.id,
        hireDate: new Date('2024-01-01'), // > 2 years seniority (entitlement unlocked)
        managerId: supervisor.employeeId,
      },
    });

    // Create user accounts
    hrUser = await prisma.user.create({
      data: {
        id: 'usr-hr',
        email: 'hr@company.ma',
        passwordHash: 'hashed_pwd',
        role: 'HR_MANAGER',
      },
    });

    supervisorUser = await prisma.user.create({
      data: {
        id: 'usr-sup',
        email: 'karim@company.ma',
        passwordHash: 'hashed_pwd',
        role: 'SUPERVISOR',
        employeeId: supervisor.employeeId,
      },
    });

    employeeUser = await prisma.user.create({
      data: {
        id: 'usr-emp',
        email: 'mehdi@company.ma',
        passwordHash: 'hashed_pwd',
        role: 'EMPLOYEE',
        employeeId: employee.employeeId,
      },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it('Step 1-6: Full Happy Path: Submit PENDING -> Query -> Approve -> Status & Audit & Balance Deduction', async () => {
    const empSession = createMockSession('EMPLOYEE', {
      userId: employeeUser.id,
      employeeId: employee.employeeId,
      siteId: site.id,
    });

    const hrSession = createMockSession('HR_MANAGER', {
      userId: hrUser.id,
    });

    // 1. Submit Absence Request (Mon Nov 2 to Wed Nov 4, 2026 = 3 working days)
    const absence = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employee.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-02'),
        endDate: new Date('2026-11-04'),
        fraction: 'FULL_DAY',
        comment: 'Family autumn holiday',
      },
      empSession
    );

    expect(absence.id).toBeDefined();
    expect(absence.status).toBe('PENDING');
    expect(Number(absence.retainedDays)).toBe(3.0);

    // 2. Query Pending Absences
    const pendingList = await AbsenceService.listAbsences(
      AbsenceQuerySchema.parse({ status: 'PENDING' }),
      hrSession
    );
    expect(pendingList.data.some((a) => a.id === absence.id)).toBe(true);

    // Initial Audit Trail recorded
    const history1 = await prisma.approvalHistory.findMany({
      where: { absenceId: absence.id },
    });
    expect(history1).toHaveLength(1);
    expect(history1[0].action).toBe('SUBMITTED');
    expect(history1[0].toStatus).toBe('PENDING');

    // Initial Balance Check
    const balanceBefore = await LeaveBalanceService.getDynamicBalance(
      employee.employeeId,
      new Date('2026-12-31')
    );
    const initialAvailable = balanceBefore.netAvailableBalance;

    // 3. Authorized Approval by HR
    const approved = await AbsenceService.approveAbsence(
      absence.id,
      { comment: 'Approved by HR manager' },
      hrSession
    );

    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedById).toBe(hrSession.userId);
    expect(approved.approvedAt).not.toBeNull();

    // 4. Audit Trail records approval decision
    const history2 = await prisma.approvalHistory.findMany({
      where: { absenceId: absence.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(history2).toHaveLength(2);
    expect(history2[1].action).toBe('APPROVED');
    expect(history2[1].fromStatus).toBe('PENDING');
    expect(history2[1].toStatus).toBe('APPROVED');
    expect(history2[1].comment).toBe('Approved by HR manager');

    // 5. Leave balance reflects the 3 approved days deducted
    const balanceAfter = await LeaveBalanceService.getDynamicBalance(
      employee.employeeId,
      new Date('2026-12-31')
    );
    expect(balanceAfter.netAvailableBalance).toBe(initialAvailable - 3.0);
  });

  it('Step 7: Double-Approval Prevention (Cannot approve twice)', async () => {
    const empSession = createMockSession('EMPLOYEE', {
      userId: employeeUser.id,
      employeeId: employee.employeeId,
    });
    const hrSession = createMockSession('HR_MANAGER', { userId: hrUser.id });

    const absence = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employee.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-09'),
        endDate: new Date('2026-11-10'),
        fraction: 'FULL_DAY',
      },
      empSession
    );

    // 1st approval succeeds
    await AbsenceService.approveAbsence(absence.id, {}, hrSession);

    // 2nd approval must fail
    await expect(
      AbsenceService.approveAbsence(absence.id, {}, hrSession)
    ).rejects.toThrow(/Cannot approve absence with status "APPROVED"/);
  });

  it('Step 8: Rejection Workflow (Rejection sets REJECTED and records justification)', async () => {
    const empSession = createMockSession('EMPLOYEE', {
      userId: employeeUser.id,
      employeeId: employee.employeeId,
    });
    const supSession = createMockSession('SUPERVISOR', {
      userId: supervisorUser.id,
      employeeId: supervisor.employeeId,
      managedEmployeeIds: [employee.employeeId],
    });

    const absence = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employee.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-16'),
        endDate: new Date('2026-11-17'),
        fraction: 'FULL_DAY',
      },
      empSession
    );

    const rejected = await AbsenceService.rejectAbsence(
      absence.id,
      { reason: 'High operational demand on these dates' },
      supSession
    );

    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('High operational demand on these dates');

    // Verify rejection audit trail
    const audit = await prisma.approvalHistory.findFirst({
      where: { absenceId: absence.id, action: 'REJECTED' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.toStatus).toBe('REJECTED');
  });

  it('Step 9: Cancellation Workflow', async () => {
    const empSession = createMockSession('EMPLOYEE', {
      userId: employeeUser.id,
      employeeId: employee.employeeId,
    });

    const absence = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employee.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-23'),
        endDate: new Date('2026-11-24'),
        fraction: 'FULL_DAY',
      },
      empSession
    );

    const cancelled = await AbsenceService.cancelAbsence(
      absence.id,
      { reason: 'Employee changed travel plans' },
      empSession
    );

    expect(cancelled.status).toBe('CANCELLED');
  });

  it('Step 10: Strict Self-Approval Prohibition (Supervisor/HR cannot approve their own request)', async () => {
    // Supervisor submits their OWN leave request
    const supSession = createMockSession('SUPERVISOR', {
      userId: supervisorUser.id,
      employeeId: supervisor.employeeId,
      managedEmployeeIds: [employee.employeeId],
    });

    const absence = await AbsenceService.createAbsenceRequest(
      {
        employeeId: supervisor.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-02'),
        endDate: new Date('2026-11-03'),
        fraction: 'FULL_DAY',
      },
      supSession
    );

    // Supervisor attempts to approve their OWN request -> FORBIDDEN!
    await expect(
      AbsenceService.approveAbsence(absence.id, {}, supSession)
    ).rejects.toThrow(/Self-approval violation/);
  });

  it('Step 11: Collision / Overlapping Request Prevention', async () => {
    const empSession = createMockSession('EMPLOYEE', {
      userId: employeeUser.id,
      employeeId: employee.employeeId,
    });

    // Request 1: Nov 2 to Nov 5
    await AbsenceService.createAbsenceRequest(
      {
        employeeId: employee.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-02'),
        endDate: new Date('2026-11-05'),
        fraction: 'FULL_DAY',
      },
      empSession
    );

    // Request 2 overlaps: Nov 4 to Nov 6 -> Must be rejected!
    await expect(
      AbsenceService.createAbsenceRequest(
        {
          employeeId: employee.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-04'),
          endDate: new Date('2026-11-06'),
          fraction: 'FULL_DAY',
        },
        empSession
      )
    ).rejects.toThrow(/overlaps with the requested range/);
  });

  it('Step 12: Recovery Leave Approval consumes Recovery Credits in FIFO order', async () => {
    const empSession = createMockSession('EMPLOYEE', {
      userId: employeeUser.id,
      employeeId: employee.employeeId,
    });
    const hrSession = createMockSession('HR_MANAGER', { userId: hrUser.id });

    // Seed 2 holiday work credits for this employee
    const h1 = await prisma.publicHoliday.create({
      data: { date: new Date('2026-01-11'), label: 'Manifeste Indépendance' },
    });
    const h2 = await prisma.publicHoliday.create({
      data: { date: new Date('2026-05-01'), label: 'Fête du Travail' },
    });

    const credit1 = await prisma.holidayWorkCredit.create({
      data: {
        employeeId: employee.employeeId,
        publicHolidayId: h1.id,
        creditedDays: new Prisma.Decimal(1.0),
        consumedDays: new Prisma.Decimal(0.0),
        isFullyConsumed: false,
        createdAt: new Date('2026-01-12'),
      },
    });

    const credit2 = await prisma.holidayWorkCredit.create({
      data: {
        employeeId: employee.employeeId,
        publicHolidayId: h2.id,
        creditedDays: new Prisma.Decimal(1.0),
        consumedDays: new Prisma.Decimal(0.0),
        isFullyConsumed: false,
        createdAt: new Date('2026-05-02'),
      },
    });

    // Employee requests 1.0 day of RECUPERATION leave
    const recoveryAbsence = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employee.employeeId,
        typeId: types.recuperation.id,
        startDate: new Date('2026-11-02'),
        endDate: new Date('2026-11-02'), // 1 working day
        fraction: 'FULL_DAY',
      },
      empSession
    );

    // HR Approves the recovery leave
    await AbsenceService.approveAbsence(recoveryAbsence.id, {}, hrSession);

    // Check FIFO credit consumption: credit1 (older) was debited 1.0 and is now fully consumed
    const updatedCredit1 = await prisma.holidayWorkCredit.findUniqueOrThrow({
      where: { id: credit1.id },
    });
    expect(Number(updatedCredit1.consumedDays)).toBe(1.0);
    expect(updatedCredit1.isFullyConsumed).toBe(true);

    // Credit2 remains unconsumed
    const updatedCredit2 = await prisma.holidayWorkCredit.findUniqueOrThrow({
      where: { id: credit2.id },
    });
    expect(Number(updatedCredit2.consumedDays)).toBe(0.0);
    expect(updatedCredit2.isFullyConsumed).toBe(false);
  });
});
