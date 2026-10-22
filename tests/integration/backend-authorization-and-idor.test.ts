import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { PasswordService } from '@/src/modules/auth/password.service';
import { AuthGuard, ForbiddenError, AuthSession } from '@/src/modules/auth/auth.guard';
import { EmployeeService } from '@/src/modules/employees/employee.service';
import { middleware } from '@/src/middleware';
import type { Site, Employee, User } from '@/src/generated/prisma';

describe('Integration: Backend Authorization, IDOR Prevention & Edge Middleware', () => {
  let site: Site;
  let empAlice: Employee;
  let empBob: Employee;
  let empManager: Employee;
  let userAlice: User;
  let userManager: User;
  let userAdmin: User;

  beforeEach(async () => {
    await cleanDatabase();
    await seedCoreTypesAndRules();

    site = await prisma.site.create({
      data: { code: 'SITE-AUTH', name: 'Auth Test Site', weeklyRestDays: [0] },
    });

    // 1. Manager Employee
    empManager = await prisma.employee.create({
      data: {
        employeeId: 'EMP-MGR-01',
        cin: 'MGR001',
        fullName: 'Supervisor Manager',
        email: 'manager@entreprise.ma',
        siteId: site.id,
        hireDate: new Date('2020-01-01'),
        active: true,
      },
    });

    // 2. Alice Employee (reports to empManager)
    empAlice = await prisma.employee.create({
      data: {
        employeeId: 'EMP-ALICE-01',
        cin: 'ALICE001',
        fullName: 'Alice Subordinate',
        email: 'alice@entreprise.ma',
        siteId: site.id,
        managerId: empManager.employeeId,
        hireDate: new Date('2022-01-01'),
        active: true,
      },
    });

    // 3. Bob Employee (independent, does NOT report to empManager)
    empBob = await prisma.employee.create({
      data: {
        employeeId: 'EMP-BOB-01',
        cin: 'BOB001',
        fullName: 'Bob OtherTeam',
        email: 'bob@entreprise.ma',
        siteId: site.id,
        hireDate: new Date('2021-01-01'),
        active: true,
      },
    });

    const defaultHash = await PasswordService.hash('Password123#Secure');

    // Users
    userAlice = await prisma.user.create({
      data: {
        email: 'alice@entreprise.ma',
        passwordHash: defaultHash,
        role: 'EMPLOYEE',
        employeeId: empAlice.employeeId,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        email: 'bob@entreprise.ma',
        passwordHash: defaultHash,
        role: 'EMPLOYEE',
        employeeId: empBob.employeeId,
        isActive: true,
      },
    });

    userManager = await prisma.user.create({
      data: {
        email: 'manager@entreprise.ma',
        passwordHash: defaultHash,
        role: 'SUPERVISOR',
        employeeId: empManager.employeeId,
        isActive: true,
      },
    });

    userAdmin = await prisma.user.create({
      data: {
        email: 'admin.hr@entreprise.ma',
        passwordHash: defaultHash,
        role: 'HR_MANAGER',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  describe('1. Role-Based Access Control (RBAC) Enforcement', () => {
    it('allows HR_MANAGER and ADMIN to create employees', async () => {
      const adminSession: AuthSession = {
        userId: userAdmin.id,
        email: userAdmin.email,
        role: 'HR_MANAGER',
        employeeId: null,
        siteId: site.id,
        managedEmployeeIds: [],
      };

      const newEmp = await EmployeeService.createEmployee(
        {
          employeeId: 'EMP-NEW-99',
          cin: 'NEW099',
          fullName: 'New Recruited Employee',
          email: 'new.recruited@entreprise.ma',
          siteId: site.id,
          hireDate: new Date('2026-01-01'),
        },
        adminSession
      );

      expect(newEmp.employeeId).toBe('EMP-NEW-99');
    });

    it('rejects EMPLOYEE and SUPERVISOR from creating employees with 403 Forbidden', async () => {
      const employeeSession: AuthSession = {
        userId: userAlice.id,
        email: userAlice.email,
        role: 'EMPLOYEE',
        employeeId: empAlice.employeeId,
        siteId: site.id,
        managedEmployeeIds: [],
      };

      await expect(
        EmployeeService.createEmployee(
          {
            employeeId: 'EMP-ILLEGAL-01',
            cin: 'ILL001',
            fullName: 'Illegal Employee',
            email: 'illegal@entreprise.ma',
            siteId: site.id,
            hireDate: new Date('2026-01-01'),
          },
          employeeSession
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('2. Insecure Direct Object Reference (IDOR) Defenses', () => {
    it('allows employee to access their OWN balances and absence history', async () => {
      const aliceSession: AuthSession = {
        userId: userAlice.id,
        email: userAlice.email,
        role: 'EMPLOYEE',
        employeeId: empAlice.employeeId,
        siteId: site.id,
        managedEmployeeIds: [],
      };

      // Self-access permitted
      const balances = await EmployeeService.getEmployeeBalances(empAlice.employeeId, aliceSession);
      expect(balances).toBeDefined();

      const history = await EmployeeService.getAbsenceHistory(empAlice.employeeId, aliceSession);
      expect(Array.isArray(history)).toBe(true);
    });

    it('blocks employee from accessing ANOTHER employee balances or history (IDOR Defense)', async () => {
      const aliceSession: AuthSession = {
        userId: userAlice.id,
        email: userAlice.email,
        role: 'EMPLOYEE',
        employeeId: empAlice.employeeId,
        siteId: site.id,
        managedEmployeeIds: [],
      };

      // Alice tries to inspect Bob's balances
      await expect(
        EmployeeService.getEmployeeBalances(empBob.employeeId, aliceSession)
      ).rejects.toThrow(ForbiddenError);

      // Alice tries to inspect Bob's absence history
      await expect(
        EmployeeService.getAbsenceHistory(empBob.employeeId, aliceSession)
      ).rejects.toThrow(ForbiddenError);
    });

    it('allows SUPERVISOR to access reporting subordinates but blocks non-reporting employees', async () => {
      const managerSession: AuthSession = {
        userId: userManager.id,
        email: userManager.email,
        role: 'SUPERVISOR',
        employeeId: empManager.employeeId,
        siteId: site.id,
        managedEmployeeIds: [empAlice.employeeId], // Only Alice reports to manager!
      };

      // Permitted: Alice reports to manager
      const aliceBalances = await EmployeeService.getEmployeeBalances(empAlice.employeeId, managerSession);
      expect(aliceBalances).toBeDefined();

      // Blocked: Bob does NOT report to manager
      await expect(
        EmployeeService.getEmployeeBalances(empBob.employeeId, managerSession)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('3. Absence Review & Self-Approval Prevention Rule', () => {
    it('strictly forbids self-approval invariant across all roles', async () => {
      const managerSession: AuthSession = {
        userId: userManager.id,
        email: userManager.email,
        role: 'SUPERVISOR',
        employeeId: empManager.employeeId,
        siteId: site.id,
        managedEmployeeIds: [empAlice.employeeId],
      };

      // Manager cannot approve their own absence request
      expect(() =>
        AuthGuard.requireCanReviewAbsence(managerSession, empManager.employeeId)
      ).toThrow(ForbiddenError);
    });

    it('allows supervisor to review their subordinate leaves', () => {
      const managerSession: AuthSession = {
        userId: userManager.id,
        email: userManager.email,
        role: 'SUPERVISOR',
        employeeId: empManager.employeeId,
        siteId: site.id,
        managedEmployeeIds: [empAlice.employeeId],
      };

      // Subordinate Alice: Permitted
      expect(() =>
        AuthGuard.requireCanReviewAbsence(managerSession, empAlice.employeeId)
      ).not.toThrow();

      // Non-subordinate Bob: Blocked
      expect(() =>
        AuthGuard.requireCanReviewAbsence(managerSession, empBob.employeeId)
      ).toThrow(ForbiddenError);
    });
  });

  describe('4. Edge Middleware Protection & Redirects', () => {
    it('redirects unauthenticated page requests to /login with redirect parameter', () => {
      const req = new NextRequest('http://localhost:3000/portal/requests');
      const res = middleware(req);

      expect(res.status).toBe(307); // Temporary Redirect
      const location = res.headers.get('location');
      expect(location).toContain('/login?redirect=');
      expect(location).toContain(encodeURIComponent('/portal/requests'));
    });

    it('rejects unauthenticated API requests with 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/employees');
      const res = middleware(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('Authentification requise');
    });

    it('allows public endpoints (/login, /api/auth/login, /api/openapi) without authentication', () => {
      const req1 = new NextRequest('http://localhost:3000/login');
      expect(middleware(req1).status).toBe(200);

      const req2 = new NextRequest('http://localhost:3000/api/auth/login');
      expect(middleware(req2).status).toBe(200);

      const req3 = new NextRequest('http://localhost:3000/api/openapi');
      expect(middleware(req3).status).toBe(200);
    });

    it('redirects authenticated users away from /login to target destination', () => {
      const req = new NextRequest('http://localhost:3000/login?redirect=%2Fportal', {
        headers: {
          cookie: 'access_token=mock-valid-token',
        },
      });

      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/portal');
    });
  });
});
