import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { createMockSession } from '@/tests/helpers/auth-mock';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { RejectAbsenceSchema } from '@/src/modules/absences/absence.schema';
import { AuthSession, ForbiddenError } from '@/src/modules/auth/auth.guard';
import type { Site, Employee, User } from '@/src/generated/prisma';

describe('Integration: HR Absence Review Workflow & Invariants', () => {
  let site: Site;
  let employeeA: Employee;
  let employeeHr: Employee;
  let userHr: User;
  let userEmployeeA: User;
  let hrSession: AuthSession;
  let employeeASession: AuthSession;
  let hrSelfSession: AuthSession;
  let supervisorUser: User;
  let supervisorSession: AuthSession;
  let types: Awaited<ReturnType<typeof seedCoreTypesAndRules>>;

  beforeEach(async () => {
    await cleanDatabase();
    types = await seedCoreTypesAndRules();

    site = await prisma.site.create({
      data: { code: 'SITE-HR-REVIEW', name: 'Review Headquarters', weeklyRestDays: [0] },
    });

    // Subordinate employee
    employeeA = await prisma.employee.create({
      data: {
        employeeId: 'EMP-REV-01',
        cin: 'REV001',
        fullName: 'Mehdi Employee',
        email: 'mehdi.rev@company.ma',
        siteId: site.id,
        hireDate: new Date('2022-01-01'), // > 2 years seniority (entitlement unlocked)
      },
    });

    // HR manager who also has an employee profile (for self-approval testing)
    employeeHr = await prisma.employee.create({
      data: {
        employeeId: 'EMP-HR-01',
        cin: 'HR001',
        fullName: 'Salma HR Manager',
        email: 'salma.hr@company.ma',
        siteId: site.id,
        hireDate: new Date('2021-01-01'),
      },
    });

    // Unrelated supervisor
    const supervisorEmp = await prisma.employee.create({
      data: {
        employeeId: 'EMP-SUP-01',
        cin: 'SUP001',
        fullName: 'Omar Supervisor',
        email: 'omar.sup@company.ma',
        siteId: site.id,
        hireDate: new Date('2020-01-01'),
      },
    });

    // Users
    userHr = await prisma.user.create({
      data: {
        id: 'usr-hr-reviewer',
        email: 'salma.hr@company.ma',
        passwordHash: 'hash',
        role: 'HR_MANAGER',
        employeeId: employeeHr.employeeId,
      },
    });

    userEmployeeA = await prisma.user.create({
      data: {
        id: 'usr-emp-applicant',
        email: 'mehdi.rev@company.ma',
        passwordHash: 'hash',
        role: 'EMPLOYEE',
        employeeId: employeeA.employeeId,
      },
    });

    supervisorUser = await prisma.user.create({
      data: {
        id: 'usr-sup-reviewer',
        email: 'omar.sup@company.ma',
        passwordHash: 'hash',
        role: 'SUPERVISOR',
        employeeId: supervisorEmp.employeeId,
      },
    });

    // Sessions
    hrSession = createMockSession('HR_MANAGER', {
      userId: userHr.id,
      email: userHr.email,
      employeeId: employeeHr.employeeId,
      siteId: site.id,
    });

    employeeASession = createMockSession('EMPLOYEE', {
      userId: userEmployeeA.id,
      email: userEmployeeA.email,
      employeeId: employeeA.employeeId,
      siteId: site.id,
    });

    hrSelfSession = createMockSession('HR_MANAGER', {
      userId: userHr.id,
      email: userHr.email,
      employeeId: employeeHr.employeeId,
      siteId: site.id,
    });

    supervisorSession = createMockSession('SUPERVISOR', {
      userId: supervisorUser.id,
      email: supervisorUser.email,
      employeeId: supervisorEmp.employeeId,
      siteId: site.id,
      managedEmployeeIds: [], // Does NOT manage employeeA
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it('1. Authorized HR approves PENDING absence: confirms status, creates audit trail, and deducts dynamic balance', async () => {
    // 1. Submit PENDING absence for employeeA (3 working days)
    const request = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeA.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-02'), // Monday
        endDate: new Date('2026-11-04'),   // Wednesday
        fraction: 'FULL_DAY',
        supportingDocumentProvided: true,
        comment: 'Congé annuel légal.',
      },
      employeeASession
    );

    expect(request.status).toBe('PENDING');

    // 2. HR approves with decision note
    const approved = await AbsenceService.approveAbsence(
      request.id,
      { comment: 'Validé après vérification du planning d’équipe.' },
      hrSession
    );

    // 3. Confirm backend return
    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedById).toBe(userHr.id);
    expect(approved.approvedAt).toBeDefined();

    // 4. Verify ApprovalHistory audit log
    const auditEntries = await prisma.approvalHistory.findMany({
      where: { absenceId: request.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(auditEntries).toHaveLength(2); // SUBMITTED and APPROVED
    const approvalAudit = auditEntries[1];
    expect(approvalAudit.action).toBe('APPROVED');
    expect(approvalAudit.fromStatus).toBe('PENDING');
    expect(approvalAudit.toStatus).toBe('APPROVED');
    expect(approvalAudit.performedByUserId).toBe(userHr.id);
    expect(approvalAudit.comment).toBe('Validé après vérification du planning d’équipe.');
  });

  it('2. Authorized HR rejects PENDING absence: enforces mandatory reason (>= 3 chars) and stores audit trail', async () => {
    // 1. Submit PENDING absence
    const request = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeA.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-09'),
        endDate: new Date('2026-11-10'),
        fraction: 'FULL_DAY',
        supportingDocumentProvided: false,
      },
      employeeASession
    );

    // 2. Schema boundary: Rejection without valid reason (< 3 chars) is rejected
    expect(() => RejectAbsenceSchema.parse({ reason: '  ' })).toThrow();
    expect(() => RejectAbsenceSchema.parse({ reason: 'No' })).toThrow();

    // 3. Reject with valid reason
    const validReason = 'Charge opérationnelle critique sur le site.';
    const rejected = await AbsenceService.rejectAbsence(
      request.id,
      { reason: validReason },
      hrSession
    );

    // 4. Confirm backend return
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe(validReason);

    // 5. Verify ApprovalHistory audit entry
    const auditEntries = await prisma.approvalHistory.findMany({
      where: { absenceId: request.id },
      orderBy: { createdAt: 'desc' },
    });

    expect(auditEntries[0].action).toBe('REJECTED');
    expect(auditEntries[0].toStatus).toBe('REJECTED');
    expect(auditEntries[0].comment).toBe(validReason);
    expect(auditEntries[0].performedByUserId).toBe(userHr.id);
  });

  it('3. Security Invariant: HR reviewer cannot approve or reject their own absence (self-approval violation)', async () => {
    // 1. HR user submits their own absence request
    const ownRequest = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeHr.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-16'),
        endDate: new Date('2026-11-17'),
        fraction: 'FULL_DAY',
        supportingDocumentProvided: true,
      },
      hrSelfSession
    );

    // 2. HR reviewer attempts to approve their own request
    await expect(
      AbsenceService.approveAbsence(ownRequest.id, { comment: 'Self approval attempt' }, hrSelfSession)
    ).rejects.toThrow(/Self-approval violation/i);

    // 3. HR reviewer attempts to reject their own request
    await expect(
      AbsenceService.rejectAbsence(ownRequest.id, { reason: 'Self rejection attempt' }, hrSelfSession)
    ).rejects.toThrow(/Self-approval violation/i);

    // 4. Verify request status is completely unchanged in the database
    const fresh = await prisma.absence.findUniqueOrThrow({ where: { id: ownRequest.id } });
    expect(fresh.status).toBe('PENDING');
  });

  it('4. State Machine Integrity: Attempting decision on stale request throws state machine conflict', async () => {
    // 1. Submit and approve request
    const request = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeA.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-23'),
        endDate: new Date('2026-11-24'),
        fraction: 'FULL_DAY',
      },
      employeeASession
    );

    await AbsenceService.approveAbsence(request.id, {}, hrSession);

    // 2. Attempting to approve an already APPROVED request
    await expect(
      AbsenceService.approveAbsence(request.id, {}, hrSession)
    ).rejects.toThrow('Cannot approve absence with status "APPROVED".');

    // 3. Attempting to reject an already APPROVED request
    await expect(
      AbsenceService.rejectAbsence(request.id, { reason: 'Late rejection attempt' }, hrSession)
    ).rejects.toThrow('Cannot reject absence with status "APPROVED".');
  });

  it('5. Concurrency Conflict: Approving fails if dynamic balance was exhausted concurrently', async () => {
    // Create an employee with 7 months seniority (eligible, accrued 10.5 days)
    const newHireEmp = await prisma.employee.create({
      data: {
        employeeId: 'EMP-NEW-HIRE',
        cin: 'NEW001',
        fullName: 'New Hire Employee',
        email: 'newhire@company.ma',
        siteId: site.id,
        hireDate: new Date('2026-03-01'), // ~7 months seniority -> accrued 10.5 days
      },
    });

    const newHireUser = await prisma.user.create({
      data: {
        id: 'usr-newhire',
        email: 'newhire@company.ma',
        passwordHash: 'hash',
        role: 'EMPLOYEE',
        employeeId: newHireEmp.employeeId,
      },
    });

    const newHireSession = createMockSession('EMPLOYEE', {
      userId: newHireUser.id,
      email: newHireUser.email,
      employeeId: newHireEmp.employeeId,
      siteId: site.id,
    });

    // Request 1: 8 working days (Mon Nov 2 to Tue Nov 10, skipping Sun = 8 days)
    const req1 = await AbsenceService.createAbsenceRequest(
      {
        employeeId: newHireEmp.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-02'),
        endDate: new Date('2026-11-10'),
        fraction: 'FULL_DAY',
      },
      newHireSession
    );

    // Request 2: 6 working days (Mon to Sat = 6 days) (concurrently requested when balance was ~12 days)
    const req2 = await AbsenceService.createAbsenceRequest(
      {
        employeeId: newHireEmp.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-16'),
        endDate: new Date('2026-11-21'),
        fraction: 'FULL_DAY',
      },
      newHireSession
    );

    // Approve Request 1 -> exhausts 8 days, leaving ~4.75 days available
    await AbsenceService.approveAbsence(req1.id, { comment: 'First request approved' }, hrSession);

    // Attempting to approve Request 2 (requires 6 days) -> should fail with Concurrency conflict!
    await expect(
      AbsenceService.approveAbsence(req2.id, { comment: 'Second request attempt' }, hrSession)
    ).rejects.toThrow(/Concurrency conflict: Remaining balance/i);

    // Confirm req2 is still PENDING
    const freshReq2 = await prisma.absence.findUniqueOrThrow({ where: { id: req2.id } });
    expect(freshReq2.status).toBe('PENDING');
  });

  it('6. Authorization Security: EMPLOYEE or unauthorized SUPERVISOR cannot review absences', async () => {
    const request = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeA.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-25'),
        endDate: new Date('2026-11-26'),
        fraction: 'FULL_DAY',
      },
      employeeASession
    );

    // 1. Employee role cannot approve
    await expect(
      AbsenceService.approveAbsence(request.id, {}, employeeASession)
    ).rejects.toThrow(ForbiddenError);

    // 2. Supervisor who does NOT manage employeeA cannot approve
    await expect(
      AbsenceService.approveAbsence(request.id, {}, supervisorSession)
    ).rejects.toThrow(ForbiddenError);

    // 3. Supervisor who does NOT manage employeeA cannot reject
    await expect(
      AbsenceService.rejectAbsence(request.id, { reason: 'Unauthorized rejection' }, supervisorSession)
    ).rejects.toThrow(ForbiddenError);
  });
});
