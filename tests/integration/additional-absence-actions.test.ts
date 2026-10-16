import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { createMockSession } from '@/tests/helpers/auth-mock';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import { ForbiddenError } from '@/src/modules/auth/auth.guard';

describe('Integration: Additional Absence-Request Actions (HR Creation, Editing, Cancellation, Document Handling)', () => {
  let site: any;
  let employeeA: any;
  let employeeB: any;
  let supervisor: any;
  let hrUser: any;
  let supervisorUser: any;
  let userA: any;
  let userB: any;
  let hrSession: any;
  let supervisorSession: any;
  let sessionA: any;
  let sessionB: any;
  let types: any;

  beforeEach(async () => {
    await cleanDatabase();
    types = await seedCoreTypesAndRules();

    site = await prisma.site.create({
      data: { code: 'SITE-ADDITIONAL', name: 'Additional HQ', weeklyRestDays: [0] },
    });

    supervisor = await prisma.employee.create({
      data: {
        employeeId: 'EMP-SUP-MGR',
        cin: 'SUPM01',
        fullName: 'Rachid Manager',
        email: 'rachid.mgr@company.ma',
        siteId: site.id,
        hireDate: new Date('2020-01-01'),
      },
    });

    employeeA = await prisma.employee.create({
      data: {
        employeeId: 'EMP-SUB-A',
        cin: 'SUBA01',
        fullName: 'Amine Subordinate',
        email: 'amine@company.ma',
        siteId: site.id,
        hireDate: new Date('2022-01-01'), // > 2 years seniority
        managerId: supervisor.employeeId, // Supervised by supervisor
      },
    });

    employeeB = await prisma.employee.create({
      data: {
        employeeId: 'EMP-OTHER-B',
        cin: 'SUBB02',
        fullName: 'Bouchra Independent',
        email: 'bouchra@company.ma',
        siteId: site.id,
        hireDate: new Date('2022-01-01'),
        managerId: null, // NOT supervised by supervisor
      },
    });

    hrUser = await prisma.user.create({
      data: {
        id: 'usr-hr-admin',
        email: 'hr.admin@company.ma',
        passwordHash: 'hash',
        role: 'HR_MANAGER',
      },
    });

    supervisorUser = await prisma.user.create({
      data: {
        id: 'usr-supervisor-mgr',
        email: 'rachid.mgr@company.ma',
        passwordHash: 'hash',
        role: 'SUPERVISOR',
        employeeId: supervisor.employeeId,
      },
    });

    userA = await prisma.user.create({
      data: {
        id: 'usr-employee-a',
        email: 'amine@company.ma',
        passwordHash: 'hash',
        role: 'EMPLOYEE',
        employeeId: employeeA.employeeId,
      },
    });

    userB = await prisma.user.create({
      data: {
        id: 'usr-employee-b',
        email: 'bouchra@company.ma',
        passwordHash: 'hash',
        role: 'EMPLOYEE',
        employeeId: employeeB.employeeId,
      },
    });

    hrSession = createMockSession('HR_MANAGER', {
      userId: hrUser.id,
      email: hrUser.email,
      siteId: site.id,
    });

    supervisorSession = createMockSession('SUPERVISOR', {
      userId: supervisorUser.id,
      email: supervisorUser.email,
      employeeId: supervisor.employeeId,
      siteId: site.id,
      managedEmployeeIds: [employeeA.employeeId], // Only manages employeeA
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

  describe('1. HR & Supervisor Creating an Absence for an Employee', () => {
    it('HR Manager can create an absence for any employee', async () => {
      const created = await AbsenceService.createAbsenceRequest(
        {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-02'),
          endDate: new Date('2026-11-04'),
          fraction: 'FULL_DAY',
          supportingDocumentProvided: false,
          comment: 'Demande saisie par les RH suite à demande écrite.',
        },
        hrSession
      );

      expect(created.status).toBe('PENDING');
      expect(created.employeeId).toBe(employeeA.employeeId);

      const history = await prisma.approvalHistory.findMany({ where: { absenceId: created.id } });
      expect(history).toHaveLength(1);
      expect(history[0].performedByUserId).toBe(hrUser.id);
      expect(history[0].action).toBe('SUBMITTED');
    });

    it('Supervisor can create an absence for their supervised subordinate', async () => {
      const created = await AbsenceService.createAbsenceRequest(
        {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-09'),
          endDate: new Date('2026-11-10'),
          fraction: 'FULL_DAY',
        },
        supervisorSession
      );

      expect(created.status).toBe('PENDING');
      expect(created.employeeId).toBe(employeeA.employeeId);
    });

    it('Supervisor CANNOT create an absence for an employee not in their managed reporting line', async () => {
      await expect(
        AbsenceService.createAbsenceRequest(
          {
            employeeId: employeeB.employeeId, // Not in supervisorSession.managedEmployeeIds
            typeId: types.congePaye.id,
            startDate: new Date('2026-11-16'),
            endDate: new Date('2026-11-17'),
            fraction: 'FULL_DAY',
          },
          supervisorSession
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('Employee CANNOT create an absence for another employee', async () => {
      await expect(
        AbsenceService.createAbsenceRequest(
          {
            employeeId: employeeB.employeeId,
            typeId: types.congePaye.id,
            startDate: new Date('2026-11-23'),
            endDate: new Date('2026-11-24'),
            fraction: 'FULL_DAY',
          },
          sessionA
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('2. Editing an Existing Request', () => {
    it('Employee can edit their own PENDING request', async () => {
      const initial = await AbsenceService.createAbsenceRequest(
        {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-02'),
          endDate: new Date('2026-11-03'),
          fraction: 'FULL_DAY',
          comment: 'Initial comment',
        },
        sessionA
      );

      // Edit dates and comment
      const updated = await AbsenceService.updateAbsenceRequest(
        initial.id,
        {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-02'),
          endDate: new Date('2026-11-05'), // Extended to 4 days
          fraction: 'FULL_DAY',
          supportingDocumentProvided: true,
          comment: 'Extended holiday with family',
        },
        sessionA
      );

      expect(updated.status).toBe('PENDING');
      expect(Number(updated.calculatedWorkingDays)).toBe(4);
      expect(updated.supportingDocumentProvided).toBe(true);
      expect(updated.comment).toBe('Extended holiday with family');

      // Verify audit trail recorded CORRECTED action
      const history = await prisma.approvalHistory.findMany({
        where: { absenceId: initial.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(history[0].action).toBe('CORRECTED');
      expect(history[0].performedByUserId).toBe(userA.id);
    });

    it('Disallowed: Cannot edit an APPROVED or REJECTED request', async () => {
      const req = await AbsenceService.createAbsenceRequest(
        {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-09'),
          endDate: new Date('2026-11-10'),
          fraction: 'FULL_DAY',
        },
        sessionA
      );

      // Approve it
      await AbsenceService.approveAbsence(req.id, {}, hrSession);

      // Attempt edit
      await expect(
        AbsenceService.updateAbsenceRequest(
          req.id,
          {
            employeeId: employeeA.employeeId,
            typeId: types.congePaye.id,
            startDate: new Date('2026-11-11'),
            endDate: new Date('2026-11-12'),
            fraction: 'FULL_DAY',
          },
          sessionA
        )
      ).rejects.toThrow(/Seules les demandes en attente \(PENDING\) peuvent être modifiées/);
    });

    it('Disallowed: Employee cannot edit another employee\'s pending request', async () => {
      const reqB = await AbsenceService.createAbsenceRequest(
        {
          employeeId: employeeB.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-16'),
          endDate: new Date('2026-11-17'),
          fraction: 'FULL_DAY',
        },
        sessionB
      );

      // Employee A tries to edit employee B's request
      await expect(
        AbsenceService.updateAbsenceRequest(
          reqB.id,
          {
            employeeId: employeeB.employeeId,
            typeId: types.congePaye.id,
            startDate: new Date('2026-11-18'),
            endDate: new Date('2026-11-19'),
            fraction: 'FULL_DAY',
          },
          sessionA
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('Collision Handling: Editing dates to overlap with another absence throws error', async () => {
      // First request: Nov 2 to Nov 4
      await AbsenceService.createAbsenceRequest(
        {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-02'),
          endDate: new Date('2026-11-04'),
          fraction: 'FULL_DAY',
        },
        sessionA
      );

      // Second request: Nov 16 to Nov 18
      const secondReq = await AbsenceService.createAbsenceRequest(
        {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-16'),
          endDate: new Date('2026-11-18'),
          fraction: 'FULL_DAY',
        },
        sessionA
      );

      // Try editing second request to overlap with Nov 3
      await expect(
        AbsenceService.updateAbsenceRequest(
          secondReq.id,
          {
            employeeId: employeeA.employeeId,
            typeId: types.congePaye.id,
            startDate: new Date('2026-11-03'),
            endDate: new Date('2026-11-05'),
            fraction: 'FULL_DAY',
          },
          sessionA
        )
      ).rejects.toThrow(/An existing approved or pending absence overlaps with the requested range/i);
    });
  });

  describe('3. Cancelling / Withdrawing a Request', () => {
    it('Employee can cancel their own PENDING request', async () => {
      const req = await AbsenceService.createAbsenceRequest(
        {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-23'),
          endDate: new Date('2026-11-24'),
          fraction: 'FULL_DAY',
        },
        sessionA
      );

      const cancelled = await AbsenceService.cancelAbsence(
        req.id,
        { reason: 'Annulation volontaire par le collaborateur' },
        sessionA
      );

      expect(cancelled.status).toBe('CANCELLED');

      const history = await prisma.approvalHistory.findMany({
        where: { absenceId: req.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(history[0].action).toBe('CANCELLED');
      expect(history[0].comment).toBe('Annulation volontaire par le collaborateur');
    });

    it('Employee can cancel their own future APPROVED request', async () => {
      const req = await AbsenceService.createAbsenceRequest(
        {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-12-01'), // Future date relative to today (Oct 2026)
          endDate: new Date('2026-12-03'),
          fraction: 'FULL_DAY',
        },
        sessionA
      );

      await AbsenceService.approveAbsence(req.id, {}, hrSession);

      const cancelled = await AbsenceService.cancelAbsence(
        req.id,
        { reason: 'Changement de projets personnels' },
        sessionA
      );

      expect(cancelled.status).toBe('CANCELLED');
    });

    it('Disallowed: Employee cannot cancel an already started or past APPROVED request', async () => {
      // Create past/started approved absence
      const startedReq = await prisma.absence.create({
        data: {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-10-01'), // Started before today (2026-10-16)
          endDate: new Date('2026-10-05'),
          fraction: 'FULL_DAY',
          calculatedWorkingDays: 4,
          enteredDays: 5,
          retainedDays: 4,
          status: 'APPROVED',
        },
      });

      // Employee tries to cancel started leave
      await expect(
        AbsenceService.cancelAbsence(startedReq.id, { reason: 'Late cancel' }, sessionA)
      ).rejects.toThrow(/Approved leaves that have already started require HR intervention to cancel/);
    });

    it('HR Manager CAN cancel an already started or past APPROVED request', async () => {
      const startedReq = await prisma.absence.create({
        data: {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-10-01'),
          endDate: new Date('2026-10-05'),
          fraction: 'FULL_DAY',
          calculatedWorkingDays: 4,
          enteredDays: 5,
          retainedDays: 4,
          status: 'APPROVED',
        },
      });

      const cancelled = await AbsenceService.cancelAbsence(
        startedReq.id,
        { reason: 'Annulation administrative rétroactive' },
        hrSession
      );

      expect(cancelled.status).toBe('CANCELLED');
    });

    it('Disallowed: Cannot cancel an already CANCELLED or REJECTED request', async () => {
      const req = await AbsenceService.createAbsenceRequest(
        {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-25'),
          endDate: new Date('2026-11-26'),
          fraction: 'FULL_DAY',
        },
        sessionA
      );

      await AbsenceService.rejectAbsence(req.id, { reason: 'Refus initial' }, hrSession);

      // Attempt cancel on rejected
      await expect(
        AbsenceService.cancelAbsence(req.id, {}, hrSession)
      ).rejects.toThrow(/Absence is already closed with status "REJECTED"/);
    });
  });

  describe('4. Supporting Document Handling', () => {
    it('Persists supportingDocumentProvided flag on creation and allows updating on edit', async () => {
      // Created with false
      const req = await AbsenceService.createAbsenceRequest(
        {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-25'),
          endDate: new Date('2026-11-26'),
          fraction: 'FULL_DAY',
          supportingDocumentProvided: false,
        },
        sessionA
      );
      expect(req.supportingDocumentProvided).toBe(false);

      // Update to true
      const updated = await AbsenceService.updateAbsenceRequest(
        req.id,
        {
          employeeId: employeeA.employeeId,
          typeId: types.congePaye.id,
          startDate: new Date('2026-11-25'),
          endDate: new Date('2026-11-26'),
          fraction: 'FULL_DAY',
          supportingDocumentProvided: true,
        },
        sessionA
      );
      expect(updated.supportingDocumentProvided).toBe(true);

      // Confirm in DB
      const fresh = await prisma.absence.findUniqueOrThrow({ where: { id: req.id } });
      expect(fresh.supportingDocumentProvided).toBe(true);
    });
  });
});
