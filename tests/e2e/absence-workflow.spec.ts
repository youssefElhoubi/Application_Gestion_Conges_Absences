import { test, expect } from '@playwright/test';
import { prisma } from '@/src/infrastructure/db/prisma';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import type { Site, Employee, User } from '@/src/generated/prisma';

test.describe('E2E Backend API: Absence Management & HR Workflow', () => {
  let site: Site;
  let types: Awaited<ReturnType<typeof seedCoreTypesAndRules>>;
  let aliceEmp: Employee;
  let bobEmp: Employee;
  let hrEmp: Employee;
  let aliceUser: User;
  let bobUser: User;
  let hrUser: User;

  test.beforeAll(async () => {
    await cleanDatabase();
    types = await seedCoreTypesAndRules();

    site = await prisma.site.create({
      data: { code: 'SITE-E2E', name: 'E2E Test Site', weeklyRestDays: [0] },
    });

    // Public Holiday on Nov 6, 2026 (Marche Verte)
    await prisma.publicHoliday.create({
      data: { date: new Date('2026-11-06'), label: 'Marche Verte' },
    });

    // Employee 1: Alice
    aliceEmp = await prisma.employee.create({
      data: {
        employeeId: 'EMP-E2E-ALICE',
        cin: 'E2E001',
        fullName: 'Alice Test',
        email: 'alice.e2e@company.ma',
        siteId: site.id,
        hireDate: new Date('2023-01-01'), // > 3 years seniority
      },
    });

    aliceUser = await prisma.user.create({
      data: {
        id: 'usr-e2e-alice',
        email: 'alice.e2e@company.ma',
        passwordHash: 'hash',
        role: 'EMPLOYEE',
        employeeId: aliceEmp.employeeId,
      },
    });

    // Employee 2: Bob
    bobEmp = await prisma.employee.create({
      data: {
        employeeId: 'EMP-E2E-BOB',
        cin: 'E2E002',
        fullName: 'Bob Test',
        email: 'bob.e2e@company.ma',
        siteId: site.id,
        hireDate: new Date('2023-01-01'),
      },
    });

    bobUser = await prisma.user.create({
      data: {
        id: 'usr-e2e-bob',
        email: 'bob.e2e@company.ma',
        passwordHash: 'hash',
        role: 'EMPLOYEE',
        employeeId: bobEmp.employeeId,
      },
    });

    // HR Manager User
    hrEmp = await prisma.employee.create({
      data: {
        employeeId: 'EMP-E2E-HR',
        cin: 'E2E003',
        fullName: 'HR Officer',
        email: 'hr.e2e@company.ma',
        siteId: site.id,
        hireDate: new Date('2020-01-01'),
      },
    });

    hrUser = await prisma.user.create({
      data: {
        id: 'usr-e2e-hr',
        email: 'hr.e2e@company.ma',
        passwordHash: 'hash',
        role: 'HR_MANAGER',
        employeeId: hrEmp.employeeId,
      },
    });
  });

  test.afterAll(async () => {
    await cleanDatabase();
  });

  test('1. Unauthenticated requests to protected endpoints return 401 Unauthorized', async ({ request }) => {
    const response = await request.get('/api/absences');
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toMatch(/Authentication required/);
  });

  test('2-5. Complete Lifecycle: Create request -> Query -> Unauthorized check -> Authorized Approval', async ({ request }) => {
    // Step 1: Alice creates an annual leave request (Mon Nov 2 to Wed Nov 4, 2026 = 3 working days)
    const createRes = await request.post('/api/absences', {
      headers: { 'x-user-id': aliceUser.id },
      data: {
        employeeId: aliceEmp.employeeId,
        typeId: types.congePaye.id,
        startDate: '2026-11-02',
        endDate: '2026-11-04',
        fraction: 'FULL_DAY',
        comment: 'Autumn holiday trip',
      },
    });

    expect(createRes.status()).toBe(201);
    const createdAbsence = await createRes.json();
    expect(createdAbsence.id).toBeDefined();
    expect(createdAbsence.status).toBe('PENDING');
    expect(Number(createdAbsence.retainedDays)).toBe(3.0);
    const absenceId = createdAbsence.id;

    // Step 2: Fetch created request
    const getRes = await request.get(`/api/absences/${absenceId}`, {
      headers: { 'x-user-id': aliceUser.id },
    });
    expect(getRes.status()).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.id).toBe(absenceId);
    expect(fetched.status).toBe('PENDING');

    // Step 3: Unauthorized employee Bob attempts to approve Alice's request -> 403 Forbidden!
    const unauthApproveRes = await request.post(`/api/absences/${absenceId}/approve`, {
      headers: { 'x-user-id': bobUser.id },
      data: {},
    });
    expect(unauthApproveRes.status()).toBe(403);

    // Step 4: Self-approval attempt by Alice -> 403 Forbidden!
    const selfApproveRes = await request.post(`/api/absences/${absenceId}/approve`, {
      headers: { 'x-user-id': aliceUser.id },
      data: {},
    });
    expect(selfApproveRes.status()).toBe(403);

    // Step 5: Authorized HR Manager approves the request
    const hrApproveRes = await request.post(`/api/absences/${absenceId}/approve`, {
      headers: { 'x-user-id': hrUser.id },
      data: { comment: 'Approved by HR officer' },
    });
    expect(hrApproveRes.status()).toBe(200);
    const approvedBody = await hrApproveRes.json();
    expect(approvedBody.status).toBe('APPROVED');
    expect(approvedBody.approvedById).toBe(hrUser.id);

    // Step 6: Verify audit trail
    const auditRes = await request.get(`/api/absences/${absenceId}`, {
      headers: { 'x-user-id': aliceUser.id },
    });
    const updated = await auditRes.json();
    expect(updated.status).toBe('APPROVED');
    expect(updated.approvalHistory).toHaveLength(2);
    expect(updated.approvalHistory[0].action).toBe('APPROVED');

    // Step 7: Cannot approve twice
    const doubleApproveRes = await request.post(`/api/absences/${absenceId}/approve`, {
      headers: { 'x-user-id': hrUser.id },
      data: {},
    });
    expect(doubleApproveRes.status()).toBe(400);
  });

  test('6. Public holiday is automatically excluded from working-day duration', async ({ request }) => {
    // Period: Thu Nov 5 to Mon Nov 9, 2026 (5 calendar days)
    // Friday Nov 6 is Public Holiday (Marche Verte), Sunday Nov 8 is weekly rest
    // Expected retainedDays: 3.0 days
    const res = await request.post('/api/absences', {
      headers: { 'x-user-id': bobUser.id },
      data: {
        employeeId: bobEmp.employeeId,
        typeId: types.congePaye.id,
        startDate: '2026-11-05',
        endDate: '2026-11-09',
        fraction: 'FULL_DAY',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(Number(body.retainedDays)).toBe(3.0);
    expect(Number(body.enteredDays)).toBe(5.0);
  });

  test('7. Input validation: Invalid dates and missing fields return 400 Bad Request', async ({ request }) => {
    // Start date after end date
    const res1 = await request.post('/api/absences', {
      headers: { 'x-user-id': aliceUser.id },
      data: {
        employeeId: aliceEmp.employeeId,
        typeId: types.congePaye.id,
        startDate: '2026-11-10',
        endDate: '2026-11-05',
      },
    });
    expect(res1.status()).toBe(400);

    // Missing required fields
    const res2 = await request.post('/api/absences', {
      headers: { 'x-user-id': aliceUser.id },
      data: {
        employeeId: aliceEmp.employeeId,
      },
    });
    expect(res2.status()).toBe(400);
  });

  test('8. Dashboard Metrics: Access control and aggregate verification', async ({ request }) => {
    // HR Manager can retrieve global dashboard
    const hrMetricsRes = await request.get('/api/dashboard/metrics', {
      headers: { 'x-user-id': hrUser.id },
    });
    expect(hrMetricsRes.status()).toBe(200);
    const metrics = await hrMetricsRes.json();
    expect(metrics.activeEmployees).toBe(3); // Alice, Bob, HR

    // Employee Alice attempting to query Bob's dashboard is rejected with 403 Forbidden
    const unauthMetricsRes = await request.get(`/api/dashboard/metrics?employeeId=${bobEmp.employeeId}`, {
      headers: { 'x-user-id': aliceUser.id },
    });
    expect(unauthMetricsRes.status()).toBe(403);
  });
});
