import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { LeaveBalanceService } from '@/src/application/services/leave-balance.service';
import { revalidateAbsencePaths } from '@/src/modules/absences/absence-revalidation';
import { AuthSession } from '@/src/modules/auth/auth.guard';

describe('Workflow Consistency & Cross-View Audit Integration Tests', () => {
  const hrSession: AuthSession = {
    userId: 'usr-hr-audit',
    email: 'hr@example.com',
    employeeId: 'EMP-HR-AUDIT',
    siteId: 1,
    role: 'HR_MANAGER',
    managedEmployeeIds: [],
  };

  const employeeSession: AuthSession = {
    userId: 'usr-emp-audit',
    email: 'emp@example.com',
    employeeId: 'EMP-AUDIT-001',
    siteId: 1,
    role: 'EMPLOYEE',
    managedEmployeeIds: [],
  };

  const supervisorSession: AuthSession = {
    userId: 'usr-sup-audit',
    email: 'sup@example.com',
    employeeId: 'EMP-SUP-AUDIT',
    siteId: 1,
    role: 'SUPERVISOR',
    managedEmployeeIds: ['EMP-AUDIT-001'],
  };

  let employeeRecordId: string;
  let annualLeaveTypeId: number;

  beforeEach(async () => {
    await cleanDatabase();
    const types = await seedCoreTypesAndRules();
    annualLeaveTypeId = types.congePaye.id;

    // Seed test site
    const site = await prisma.site.upsert({
      where: { code: 'CAS-AUDIT' },
      update: {},
      create: {
        code: 'CAS-AUDIT',
        name: 'Casablanca Audit Site',
        timezone: 'Africa/Casablanca',
        weeklyRestDays: [0],
      },
    });

    // Seed test employees (seniority > 2 years for full statutory accrual)
    const hireDate = new Date();
    hireDate.setFullYear(hireDate.getFullYear() - 2);

    const emp = await prisma.employee.create({
      data: {
        employeeId: 'EMP-AUDIT-001',
        cin: 'AUDIT001',
        fullName: 'Salma Auditor',
        email: 'salma.audit@company.ma',
        siteId: site.id,
        hireDate,
        active: true,
      },
    });
    employeeRecordId = emp.employeeId;

    await prisma.employee.create({
      data: {
        employeeId: 'EMP-HR-AUDIT',
        cin: 'AUDITHR',
        fullName: 'Karim AuditorHR',
        email: 'karim.audit@company.ma',
        siteId: site.id,
        hireDate,
        active: true,
      },
    });

    await prisma.employee.create({
      data: {
        employeeId: 'EMP-SUP-AUDIT',
        cin: 'AUDITSUP',
        fullName: 'Rachid SupervisorAudit',
        email: 'sup.audit@company.ma',
        siteId: site.id,
        hireDate,
        active: true,
      },
    });

    // Seed test users
    await prisma.user.createMany({
      data: [
        { id: 'usr-hr-audit', email: 'hr.audit@company.ma', role: 'HR_MANAGER', passwordHash: 'hash', employeeId: 'EMP-HR-AUDIT' },
        { id: 'usr-emp-audit', email: 'emp.audit@company.ma', role: 'EMPLOYEE', passwordHash: 'hash', employeeId: 'EMP-AUDIT-001' },
        { id: 'usr-sup-audit', email: 'sup.audit@company.ma', role: 'SUPERVISOR', passwordHash: 'hash', employeeId: 'EMP-SUP-AUDIT' },
      ],
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it('Scenario 1: Submitting a request creates PENDING status, audit record, and triggers revalidation', async () => {
    const initialBalance = await LeaveBalanceService.getDynamicBalance(employeeRecordId);

    const created = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeRecordId,
        typeId: annualLeaveTypeId,
        startDate: '2026-11-09',
        endDate: '2026-11-13',
        fraction: 'FULL_DAY',
        supportingDocumentProvided: false,
        comment: 'Congé annuel de test',
      },
      employeeSession
    );

    expect(created.status).toBe('PENDING');
    expect(Number(created.calculatedWorkingDays)).toBe(5);

    // Verify approval history audit record was logged
    const history = await prisma.approvalHistory.findMany({
      where: { absenceId: created.id },
    });
    expect(history.length).toBe(1);
    expect(history[0].action).toBe('SUBMITTED');
    expect(history[0].toStatus).toBe('PENDING');

    // Balance verification: Pending requests do not deduct taken balance
    const postBalance = await LeaveBalanceService.getDynamicBalance(employeeRecordId);
    expect(postBalance.totalApprovedDeductions).toBe(initialBalance.totalApprovedDeductions);

    // Verify revalidation runs cleanly
    expect(() => revalidateAbsencePaths(created.id, created.employeeId)).not.toThrow();
  });

  it('Scenario 2: Approving a request updates status to APPROVED, logs decision, debits balance, and refreshes views', async () => {
    const created = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeRecordId,
        typeId: annualLeaveTypeId,
        startDate: '2026-11-16',
        endDate: '2026-11-18',
        fraction: 'FULL_DAY',
        supportingDocumentProvided: false,
      },
      employeeSession
    );

    const preApprovalBalance = await LeaveBalanceService.getDynamicBalance(employeeRecordId);

    const approved = await AbsenceService.approveAbsence(
      created.id,
      { comment: 'Validé par RH' },
      hrSession
    );

    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedById).toBe('usr-hr-audit');
    expect(approved.approvedAt).toBeDefined();

    // Verify audit trail contains APPROVED transition
    const history = await prisma.approvalHistory.findMany({
      where: { absenceId: created.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(history.length).toBe(2);
    expect(history[1].action).toBe('APPROVED');
    expect(history[1].fromStatus).toBe('PENDING');
    expect(history[1].toStatus).toBe('APPROVED');
    expect(history[1].comment).toBe('Validé par RH');

    // Verify balance was debited
    const postApprovalBalance = await LeaveBalanceService.getDynamicBalance(employeeRecordId);
    expect(postApprovalBalance.totalApprovedDeductions).toBe(
      preApprovalBalance.totalApprovedDeductions + Number(approved.retainedDays)
    );
    expect(postApprovalBalance.netAvailableBalance).toBe(
      preApprovalBalance.netAvailableBalance - Number(approved.retainedDays)
    );

    // Verify revalidation
    expect(() => revalidateAbsencePaths(approved.id, approved.employeeId)).not.toThrow();
  });

  it('Scenario 3: Rejecting a request updates status to REJECTED, preserves balance, and records reason', async () => {
    const created = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeRecordId,
        typeId: annualLeaveTypeId,
        startDate: '2026-11-23',
        endDate: '2026-11-25',
        fraction: 'FULL_DAY',
        supportingDocumentProvided: false,
      },
      employeeSession
    );

    const preRejectBalance = await LeaveBalanceService.getDynamicBalance(employeeRecordId);

    const rejected = await AbsenceService.rejectAbsence(
      created.id,
      { reason: 'Période de pic d\'activité opérationnelle' },
      supervisorSession
    );

    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Période de pic d\'activité opérationnelle');

    // Verify audit history
    const history = await prisma.approvalHistory.findMany({
      where: { absenceId: created.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(history[1].action).toBe('REJECTED');
    expect(history[1].fromStatus).toBe('PENDING');
    expect(history[1].toStatus).toBe('REJECTED');

    // Balance remains intact
    const postRejectBalance = await LeaveBalanceService.getDynamicBalance(employeeRecordId);
    expect(postRejectBalance.totalApprovedDeductions).toBe(preRejectBalance.totalApprovedDeductions);
    expect(postRejectBalance.netAvailableBalance).toBe(preRejectBalance.netAvailableBalance);

    // Verify revalidation
    expect(() => revalidateAbsencePaths(rejected.id, rejected.employeeId)).not.toThrow();
  });

  it('Scenario 4: Editing a PENDING request updates dates and working days while remaining in PENDING', async () => {
    const created = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeRecordId,
        typeId: annualLeaveTypeId,
        startDate: '2026-11-23',
        endDate: '2026-11-24', // 2 working days
        fraction: 'FULL_DAY',
        supportingDocumentProvided: false,
      },
      employeeSession
    );

    expect(Number(created.calculatedWorkingDays)).toBe(2);

    const updated = await AbsenceService.updateAbsenceRequest(
      created.id,
      {
        employeeId: employeeRecordId,
        typeId: annualLeaveTypeId,
        startDate: '2026-11-23',
        endDate: '2026-11-26', // Extended to 4 working days
        fraction: 'FULL_DAY',
        supportingDocumentProvided: true,
        comment: 'Période prolongée avec justificatif',
      },
      employeeSession
    );

    expect(updated.status).toBe('PENDING');
    expect(Number(updated.calculatedWorkingDays)).toBe(4);
    expect(updated.supportingDocumentProvided).toBe(true);

    // Audit trail has CORRECTED
    const history = await prisma.approvalHistory.findMany({
      where: { absenceId: created.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(history.length).toBe(2);
    expect(history[1].action).toBe('CORRECTED');
    expect(history[1].fromStatus).toBe('PENDING');
    expect(history[1].toStatus).toBe('PENDING');

    // Verify revalidation
    expect(() => revalidateAbsencePaths(updated.id, updated.employeeId)).not.toThrow();
  });

  it('Scenario 5: Cancelling an approved leave restores the deducted balance and updates status to CANCELLED', async () => {
    const created = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeRecordId,
        typeId: annualLeaveTypeId,
        startDate: '2026-12-07',
        endDate: '2026-12-11', // 5 working days
        fraction: 'FULL_DAY',
        supportingDocumentProvided: false,
      },
      employeeSession
    );

    const initialBalance = await LeaveBalanceService.getDynamicBalance(employeeRecordId);

    const approved = await AbsenceService.approveAbsence(created.id, {}, hrSession);
    const balanceAfterApproval = await LeaveBalanceService.getDynamicBalance(employeeRecordId);
    expect(balanceAfterApproval.netAvailableBalance).toBe(initialBalance.netAvailableBalance - 5);

    // Employee cancels future approved absence
    const cancelled = await AbsenceService.cancelAbsence(
      approved.id,
      { reason: 'Annulation demandée par le collaborateur' },
      employeeSession
    );

    expect(cancelled.status).toBe('CANCELLED');

    // Balance is fully restored
    const balanceAfterCancellation = await LeaveBalanceService.getDynamicBalance(employeeRecordId);
    expect(balanceAfterCancellation.netAvailableBalance).toBe(initialBalance.netAvailableBalance);
    expect(balanceAfterCancellation.totalApprovedDeductions).toBe(initialBalance.totalApprovedDeductions);

    // Verify revalidation
    expect(() => revalidateAbsencePaths(cancelled.id, cancelled.employeeId)).not.toThrow();
  });

  it('Scenario 6: Failed mutations reject cleanly without mutating state or falsely updating', async () => {
    const created = await AbsenceService.createAbsenceRequest(
      {
        employeeId: employeeRecordId,
        typeId: annualLeaveTypeId,
        startDate: '2026-12-14',
        endDate: '2026-12-15',
        fraction: 'FULL_DAY',
        supportingDocumentProvided: false,
      },
      employeeSession
    );

    // 1. Self-approval is rejected (403) and state remains PENDING
    await expect(
      AbsenceService.approveAbsence(created.id, {}, employeeSession)
    ).rejects.toThrow();

    const postSelfApprovalAbsence = await AbsenceService.getAbsenceById(created.id, hrSession);
    expect(postSelfApprovalAbsence.status).toBe('PENDING');

    // 2. Rejecting without required justification (< 3 chars) is rejected and state remains PENDING
    await expect(
      AbsenceService.rejectAbsence(created.id, { reason: 'No' }, hrSession)
    ).rejects.toThrow();

    const postBadRejectAbsence = await AbsenceService.getAbsenceById(created.id, hrSession);
    expect(postBadRejectAbsence.status).toBe('PENDING');

    // Approve the absence legitimately
    await AbsenceService.approveAbsence(created.id, {}, hrSession);

    // 3. Attempting to approve already APPROVED absence is rejected
    await expect(
      AbsenceService.approveAbsence(created.id, {}, hrSession)
    ).rejects.toThrow();

    // 4. Attempting to edit an APPROVED absence is rejected and original dates remain intact
    await expect(
      AbsenceService.updateAbsenceRequest(
        created.id,
        {
          employeeId: employeeRecordId,
          typeId: annualLeaveTypeId,
          startDate: '2026-12-14',
          endDate: '2026-12-25', // Attempted alteration
          fraction: 'FULL_DAY',
        },
        employeeSession
      )
    ).rejects.toThrow();

    const verifiedRecord = await AbsenceService.getAbsenceById(created.id, hrSession);
    expect(verifiedRecord.status).toBe('APPROVED');
    expect(Number(verifiedRecord.calculatedWorkingDays)).toBe(2);
  });
});
