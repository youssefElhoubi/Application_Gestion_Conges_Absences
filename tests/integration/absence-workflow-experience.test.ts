import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { createMockSession } from '@/tests/helpers/auth-mock';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { AuthSession } from '@/src/modules/auth/auth.guard';
import type { Site, Employee, User } from '@/src/generated/prisma';

describe('Integration: Employee Absence Request List, Detail & Next Actions Lifecycle', () => {
  let site: Site;
  let employeeA: Employee;
  let employeeB: Employee;
  let userA: User;
  let userB: User;
  let sessionA: AuthSession;
  let sessionB: AuthSession;
  let types: Awaited<ReturnType<typeof seedCoreTypesAndRules>>;

  beforeEach(async () => {
    await cleanDatabase();
    types = await seedCoreTypesAndRules();

    site = await prisma.site.create({
      data: { code: 'SITE-EXPERIENCE', name: 'Experience HQ', weeklyRestDays: [0] }, // Sunday rest
    });

    employeeA = await prisma.employee.create({
      data: {
        employeeId: 'EMP-EXP-A',
        cin: 'EXPA001',
        fullName: 'Youssef Applicant',
        email: 'youssef@company.ma',
        siteId: site.id,
        hireDate: new Date('2022-01-01'), // > 2 years seniority
      },
    });

    employeeB = await prisma.employee.create({
      data: {
        employeeId: 'EMP-EXP-B',
        cin: 'EXPB002',
        fullName: 'Samira Other',
        email: 'samira@company.ma',
        siteId: site.id,
        hireDate: new Date('2022-01-01'),
      },
    });

    userA = await prisma.user.create({
      data: {
        id: 'usr-exp-a',
        email: 'youssef@company.ma',
        passwordHash: 'hash',
        role: 'EMPLOYEE',
        employeeId: employeeA.employeeId,
      },
    });

    userB = await prisma.user.create({
      data: {
        id: 'usr-exp-b',
        email: 'samira@company.ma',
        passwordHash: 'hash',
        role: 'EMPLOYEE',
        employeeId: employeeB.employeeId,
      },
    });

    sessionA = createMockSession('EMPLOYEE', {
      userId: userA.id,
      email: userA.email,
      employeeId: employeeA.employeeId,
      siteId: site.id,
    });

    sessionB = createMockSession('EMPLOYEE', {
      userId: userB.id,
      email: userB.email,
      employeeId: employeeB.employeeId,
      siteId: site.id,
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it('1. Employee submits absence request: returns backend status, calculated working days, and audit trail', async () => {
    const created = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeA.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-02'), // Monday
        endDate: new Date('2026-11-06'),   // Friday
        fraction: 'FULL_DAY',
        supportingDocumentProvided: true,
        comment: 'Congé annuel pour repos familial.',
      },
      sessionA
    );

    expect(created).toBeDefined();
    expect(created.employeeId).toBe(employeeA.employeeId);
    expect(created.status).toBe('PENDING'); // Exact backend-returned status
    expect(Number(created.calculatedWorkingDays)).toBe(5);
    expect(Number(created.retainedDays)).toBe(5);
    expect(Number(created.enteredDays)).toBe(5);
    expect(created.supportingDocumentProvided).toBe(true);

    // Initial audit log
    const history = await prisma.approvalHistory.findMany({
      where: { absenceId: created.id },
    });
    expect(history.length).toBe(1);
    expect(history[0].action).toBe('SUBMITTED');
    expect(history[0].performedByEmployeeId).toBe(employeeA.employeeId);
  });

  it('2. Request List: enforces strict employee scoping so Employee A cannot see Employee B requests', async () => {
    // Create one request for Employee A
    await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeA.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-02'),
        endDate: new Date('2026-11-04'),
        fraction: 'FULL_DAY',
        supportingDocumentProvided: false,
      },
      sessionA
    );

    // Create one request for Employee B
    await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeB.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-09'),
        endDate: new Date('2026-11-11'),
        fraction: 'FULL_DAY',
        supportingDocumentProvided: true,
      },
      sessionB
    );

    // Employee A lists absences
    const listA = await AbsenceService.listAbsences(
      { page: 1, pageSize: 10, status: 'ALL', sortOrder: 'desc' },
      sessionA
    );

    expect(listA.data.length).toBe(1);
    expect(listA.data[0].employeeId).toBe(employeeA.employeeId);

    // Employee B lists absences
    const listB = await AbsenceService.listAbsences(
      { page: 1, pageSize: 10, status: 'ALL', sortOrder: 'desc' },
      sessionB
    );

    expect(listB.data.length).toBe(1);
    expect(listB.data[0].employeeId).toBe(employeeB.employeeId);
  });

  it('3. Request Detail: authorized employee retrieves full record and history; unauthorized employee is blocked', async () => {
    const created = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeA.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-02'),
        endDate: new Date('2026-11-03'),
        fraction: 'FULL_DAY',
        supportingDocumentProvided: true,
        comment: 'Consultation dossier',
      },
      sessionA
    );

    // Employee A reads own request -> Success
    const detail = await AbsenceService.getAbsenceById(created.id, sessionA);
    expect(detail).toBeDefined();
    expect(detail.id).toBe(created.id);
    expect(detail.supportingDocumentProvided).toBe(true);
    expect(detail.approvalHistory.length).toBeGreaterThanOrEqual(1);

    // Employee B attempts to read Employee A request -> ForbiddenError (Access denied)
    await expect(
      AbsenceService.getAbsenceById(created.id, sessionB)
    ).rejects.toThrow(/Access denied/);
  });

  it('4. Cancellation: employee can cancel their own PENDING request with audit logging', async () => {
    const created = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeA.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-02'),
        endDate: new Date('2026-11-04'),
        fraction: 'FULL_DAY',
      },
      sessionA
    );

    const cancelled = await AbsenceService.cancelAbsence(
      created.id,
      { reason: 'Annulation personnelle suite à imprévu' },
      sessionA
    );

    expect(cancelled.status).toBe('CANCELLED');

    const history = await prisma.approvalHistory.findMany({
      where: { absenceId: created.id },
      orderBy: { createdAt: 'desc' },
    });

    expect(history[0].action).toBe('CANCELLED');
    expect(history[0].comment).toBe('Annulation personnelle suite à imprévu');
  });

  it('5. Cancellation: employee can cancel future APPROVED leave, but cannot cancel already-started leave', async () => {
    const futureLeave = await prisma.absence.create({
      data: {
        employeeId: employeeA.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-12-01'), // Future date
        endDate: new Date('2026-12-05'),
        calculatedWorkingDays: 5,
        enteredDays: 5,
        retainedDays: 5,
        status: 'APPROVED',
      },
    });

    // Future approved leave can be cancelled
    const cancelledFuture = await AbsenceService.cancelAbsence(
      futureLeave.id,
      { reason: 'Changement de dates' },
      sessionA
    );
    expect(cancelledFuture.status).toBe('CANCELLED');

    // Started approved leave (startDate in past)
    const startedLeave = await prisma.absence.create({
      data: {
        employeeId: employeeA.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-01-01'), // Past/started date
        endDate: new Date('2026-01-05'),
        calculatedWorkingDays: 5,
        enteredDays: 5,
        retainedDays: 5,
        status: 'APPROVED',
      },
    });

    // Attempting to cancel started leave by employee must fail
    await expect(
      AbsenceService.cancelAbsence(startedLeave.id, { reason: 'Tentative tardive' }, sessionA)
    ).rejects.toThrow(/Approved leaves that have already started require HR intervention to cancel/);
  });

  it('6. Cancellation: cannot cancel an already closed (CANCELLED or REJECTED) request', async () => {
    const rejectedLeave = await prisma.absence.create({
      data: {
        employeeId: employeeA.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-15'),
        endDate: new Date('2026-11-18'),
        calculatedWorkingDays: 4,
        enteredDays: 4,
        retainedDays: 4,
        status: 'REJECTED',
        rejectionReason: 'Effectif minimal non assuré',
      },
    });

    await expect(
      AbsenceService.cancelAbsence(rejectedLeave.id, {}, sessionA)
    ).rejects.toThrow(/Absence is already closed with status "REJECTED"/);
  });
});
