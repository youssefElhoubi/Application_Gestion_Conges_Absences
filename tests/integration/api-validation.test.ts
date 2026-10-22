import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { createMockSession } from '@/tests/helpers/auth-mock';
import {
  CreateAbsenceSchema,
  RejectAbsenceSchema,
  AbsenceQuerySchema,
} from '@/src/modules/absences/absence.schema';
import { CreateEmployeeSchema } from '@/src/modules/employees/employee.schema';
import { DashboardMetricsFilterSchema } from '@/src/modules/dashboard/dashboard-metrics.schema';
import { AbsenceService } from '@/src/modules/absences/absence.service';
import type { Site, Employee } from '@/src/generated/prisma';

describe('Integration: API Validation & Schema Boundary Enforcement', () => {
  let site: Site;
  let employee: Employee;
  let types: Awaited<ReturnType<typeof seedCoreTypesAndRules>>;

  beforeEach(async () => {
    await cleanDatabase();
    types = await seedCoreTypesAndRules();

    site = await prisma.site.create({
      data: { code: 'SITE-VAL', name: 'Validation Site', weeklyRestDays: [0] },
    });

    employee = await prisma.employee.create({
      data: {
        employeeId: 'EMP-VAL-01',
        cin: 'VAL001',
        fullName: 'Validation Tester',
        email: 'val@company.ma',
        siteId: site.id,
        hireDate: new Date('2023-01-01'),
      },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it('Scenario 1: Missing required fields in absence creation payload are rejected by Zod schema', () => {
    const invalidInputs: unknown[] = [
      {}, // empty
      { employeeId: 'EMP-1' }, // missing dates, typeId
      { employeeId: 'EMP-1', typeId: 1 }, // missing dates
      { employeeId: '', typeId: 1, startDate: '2026-11-01', endDate: '2026-11-02' }, // empty employeeId
    ];

    for (const input of invalidInputs) {
      expect(() => CreateAbsenceSchema.parse(input)).toThrow();
    }
  });

  it('Scenario 2: End date earlier than start date is rejected with specific message', () => {
    expect(() => {
      CreateAbsenceSchema.parse({
        employeeId: employee.employeeId,
        typeId: types.congePaye.id,
        startDate: '2026-11-10',
        endDate: '2026-11-05', // Earlier!
        fraction: 'FULL_DAY',
      });
    }).toThrow(/Absence end date cannot be earlier than start date/);
  });

  it('Scenario 3: Half-day request spanning multiple calendar days is rejected', () => {
    expect(() => {
      CreateAbsenceSchema.parse({
        employeeId: employee.employeeId,
        typeId: types.congePaye.id,
        startDate: '2026-11-05',
        endDate: '2026-11-06', // Spans 2 days!
        fraction: 'HALF_DAY_MORNING',
      });
    }).toThrow(/Half-day absences must begin and end on the exact same date/);
  });

  it('Scenario 4: Rejection without a reason is rejected (mandatory justification)', () => {
    expect(() => {
      RejectAbsenceSchema.parse({ reason: '' });
    }).toThrow(/Rejection justification is mandatory/);

    expect(() => {
      RejectAbsenceSchema.parse({ reason: 'ab' }); // < 3 characters
    }).toThrow(/Rejection justification is mandatory/);
  });

  it('Scenario 5: Pagination query parameters enforce positive integers', () => {
    const invalidQueries: unknown[] = [
      { page: 0 }, // must be >= 1
      { page: -5 },
      { pageSize: 0 },
      { pageSize: -10 },
      { pageSize: 500 }, // exceeds maximum 100
    ];

    for (const q of invalidQueries) {
      expect(() => AbsenceQuerySchema.parse(q)).toThrow();
    }

    // Valid query
    const valid = AbsenceQuerySchema.parse({ page: 2, pageSize: 20 });
    expect(valid.page).toBe(2);
    expect(valid.pageSize).toBe(20);
  });

  it('Scenario 6: Dashboard date filter validation rejects start > end', () => {
    expect(() => {
      DashboardMetricsFilterSchema.parse({
        startDate: '2026-12-31',
        endDate: '2026-01-01',
      });
    }).toThrow();
  });

  it('Scenario 7: Employee creation schema enforces CIN, email format, and name requirements', () => {
    expect(() => {
      CreateEmployeeSchema.parse({
        employeeId: 'EMP-X',
        cin: '', // missing
        fullName: 'Short',
        email: 'invalid-email', // invalid email
        siteId: 1,
        hireDate: '2024-01-01',
      });
    }).toThrow();
  });

  it('Scenario 8: Non-existent absence type throws informative error instead of database corruption', async () => {
    const session = createMockSession('EMPLOYEE', {
      employeeId: employee.employeeId,
      siteId: site.id,
    });

    await expect(
      AbsenceService.createAbsenceRequest(
        {
          employeeId: employee.employeeId,
          typeId: 999999, // non-existent
          startDate: new Date('2026-11-02'),
          endDate: new Date('2026-11-03'),
          fraction: 'FULL_DAY',
        },
        session
      )
    ).rejects.toThrow();
  });
});
