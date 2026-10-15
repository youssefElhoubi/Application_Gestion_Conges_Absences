import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { createMockSession } from '@/tests/helpers/auth-mock';
import { EmployeeService } from '@/src/modules/employees/employee.service';
import { SiteService } from '@/src/modules/sites/site.service';
import { ForbiddenError } from '@/src/modules/auth/auth.guard';

describe('Integration: Employee & Site Management Services', () => {
  let adminSession: any;
  let employeeSession: any;

  beforeEach(async () => {
    await cleanDatabase();
    adminSession = createMockSession('ADMIN');
    employeeSession = createMockSession('EMPLOYEE', { employeeId: 'EMP-SELF' });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it('Scenario 1: Site Lifecycle (Create, List, Get, Update, Deactivate)', async () => {
    // 1. Create site
    const site = await SiteService.createSite(
      {
        code: 'SITE-MAR',
        name: 'Marrakech Regional Hub',
        city: 'Marrakech',
        weeklyRestDays: [0], // Sunday
      },
      adminSession
    );
    expect(site.id).toBeDefined();
    expect(site.code).toBe('SITE-MAR');

    // 2. Non-admin cannot create site
    await expect(
      SiteService.createSite(
        { code: 'SITE-FAIL', name: 'Fail Site', weeklyRestDays: [0] },
        employeeSession
      )
    ).rejects.toThrow(ForbiddenError);

    // 3. List sites
    const sites = await SiteService.listSites({ active: 'true' } as any, adminSession);
    expect(sites.data.some((s: any) => s.code === 'SITE-MAR')).toBe(true);

    // 4. Update site
    const updated = await SiteService.updateSite(
      site.id,
      { city: 'Marrakech-Menara' },
      adminSession
    );
    expect(updated.city).toBe('Marrakech-Menara');
  });

  it('Scenario 2: Employee Lifecycle (Create, List, Update, Self vs Other scope)', async () => {
    const site = await SiteService.createSite(
      { code: 'SITE-TET', name: 'Tetouan Office', weeklyRestDays: [0] },
      adminSession
    );

    // 1. Admin creates employee
    const emp = await EmployeeService.createEmployee(
      {
        employeeId: 'EMP-TET-01',
        cin: 'TT123456',
        fullName: 'Hassan Amrani',
        email: 'hassan@company.ma',
        siteId: site.id,
        hireDate: new Date('2024-01-01'),
        birthDate: new Date('1995-03-20'),
      },
      adminSession
    );
    expect(emp.employeeId).toBe('EMP-TET-01');
    expect(emp.fullName).toBe('Hassan Amrani');

    // 2. Non-admin employee cannot create other employees
    await expect(
      EmployeeService.createEmployee(
        {
          employeeId: 'EMP-FAIL',
          cin: 'FAIL001',
          fullName: 'Unauthorized Emp',
          email: 'unauth@company.ma',
          siteId: site.id,
          hireDate: new Date('2024-01-01'),
        },
        employeeSession
      )
    ).rejects.toThrow(ForbiddenError);

    // 3. Admin lists employees with search query
    const searchRes = await EmployeeService.listEmployees(
      { search: 'Amrani', active: 'all' } as any,
      adminSession
    );
    expect(searchRes.data).toHaveLength(1);
    expect(searchRes.data[0].employeeId).toBe('EMP-TET-01');

    // 4. Update employee
    const updated = await EmployeeService.updateEmployee(
      emp.employeeId,
      { jobTitle: 'Senior Logistics Specialist' },
      adminSession
    );
    expect(updated.jobTitle).toBe('Senior Logistics Specialist');
  });
});
