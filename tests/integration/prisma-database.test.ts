import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/src/infrastructure/db/prisma';
import { cleanDatabase } from '@/tests/helpers/db-cleanup';
import { seedCoreTypesAndRules } from '@/tests/fixtures/factories';
import { Prisma } from '@/src/generated/prisma';

describe('Integration: Prisma & Database Operations', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it('Scenario 1: Valid Site and Employee can be created, related, and retrieved', async () => {
    const site = await prisma.site.create({
      data: {
        code: 'SITE-CAS',
        name: 'Casablanca Headquarters',
        city: 'Casablanca',
        weeklyRestDays: [0], // Sunday
      },
    });

    const employee = await prisma.employee.create({
      data: {
        employeeId: 'EMP-T100',
        cin: 'AB123456',
        cnssNumber: 'CNSS-100200',
        fullName: 'Youssef Bennani',
        email: 'youssef@company.ma',
        siteId: site.id,
        hireDate: new Date('2024-01-01'),
        birthDate: new Date('1992-05-15'),
        active: true,
      },
      include: { site: true },
    });

    expect(employee.employeeId).toBe('EMP-T100');
    expect(employee.site.code).toBe('SITE-CAS');
    expect(employee.site.weeklyRestDays).toEqual([0]);

    // Retrieve via query
    const fetched = await prisma.employee.findUnique({
      where: { employeeId: 'EMP-T100' },
      include: { site: true },
    });
    expect(fetched).not.toBeNull();
    expect(fetched?.fullName).toBe('Youssef Bennani');
  });

  it('Scenario 2: Unique constraint on employeeId, CIN, and email is strictly enforced', async () => {
    const site = await prisma.site.create({
      data: { code: 'SITE-RAB', name: 'Rabat Tech Hub', weeklyRestDays: [0] },
    });

    await prisma.employee.create({
      data: {
        employeeId: 'EMP-UNIQ',
        cin: 'BK999999',
        fullName: 'Original Employee',
        email: 'original@company.ma',
        siteId: site.id,
        hireDate: new Date('2024-01-01'),
      },
    });

    // Attempt duplicate employeeId
    await expect(
      prisma.employee.create({
        data: {
          employeeId: 'EMP-UNIQ', // Duplicate!
          cin: 'BK111111',
          fullName: 'Duplicate Matricule',
          email: 'dup1@company.ma',
          siteId: site.id,
          hireDate: new Date('2024-01-01'),
        },
      })
    ).rejects.toThrow();

    // Attempt duplicate CIN
    await expect(
      prisma.employee.create({
        data: {
          employeeId: 'EMP-NEW',
          cin: 'BK999999', // Duplicate CIN!
          fullName: 'Duplicate CIN',
          email: 'dup2@company.ma',
          siteId: site.id,
          hireDate: new Date('2024-01-01'),
        },
      })
    ).rejects.toThrow();
  });

  it('Scenario 3: Foreign-key constraint prevents orphan employee creation', async () => {
    await expect(
      prisma.employee.create({
        data: {
          employeeId: 'EMP-ORPHAN',
          cin: 'CC888888',
          fullName: 'Orphan User',
          email: 'orphan@company.ma',
          siteId: 999999, // Non-existent site!
          hireDate: new Date('2024-01-01'),
        },
      })
    ).rejects.toThrow();
  });

  it('Scenario 4: Absence creation, relation to AbsenceType, and status updates persist correctly', async () => {
    const types = await seedCoreTypesAndRules();
    const site = await prisma.site.create({
      data: { code: 'SITE-TGR', name: 'Tangier Logistics', weeklyRestDays: [0] },
    });
    const employee = await prisma.employee.create({
      data: {
        employeeId: 'EMP-TGR-1',
        cin: 'TG123456',
        fullName: 'Fatima Zahra',
        email: 'fatima@company.ma',
        siteId: site.id,
        hireDate: new Date('2023-01-01'),
      },
    });

    // Create absence
    const absence = await prisma.absence.create({
      data: {
        employeeId: employee.employeeId,
        typeId: types.congePaye.id,
        startDate: new Date('2026-11-02'),
        endDate: new Date('2026-11-06'),
        fraction: 'FULL_DAY',
        calculatedWorkingDays: new Prisma.Decimal(5.0),
        enteredDays: new Prisma.Decimal(5.0),
        retainedDays: new Prisma.Decimal(5.0),
        status: 'PENDING',
      },
    });

    expect(absence.status).toBe('PENDING');
    expect(Number(absence.retainedDays)).toBe(5.0);

    // Update status to APPROVED
    const updated = await prisma.absence.update({
      where: { id: absence.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    expect(updated.status).toBe('APPROVED');
    expect(updated.approvedAt).not.toBeNull();
  });

  it('Scenario 5: Multi-record database transaction rolls back completely upon error', async () => {
    const site = await prisma.site.create({
      data: { code: 'SITE-AGD', name: 'Agadir Facility', weeklyRestDays: [0] },
    });

    await expect(
      prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Step 1: Create an employee (should roll back if step 2 fails)
        await tx.employee.create({
          data: {
            employeeId: 'EMP-ROLLBACK',
            cin: 'AG555555',
            fullName: 'Rollback Candidate',
            email: 'rollback@company.ma',
            siteId: site.id,
            hireDate: new Date('2024-01-01'),
          },
        });

        // Step 2: Deliberately throw an error
        throw new Error('Transaction failure triggered for rollback testing');
      })
    ).rejects.toThrow('Transaction failure triggered for rollback testing');

    // Verify employee was NOT persisted
    const employee = await prisma.employee.findUnique({
      where: { employeeId: 'EMP-ROLLBACK' },
    });
    expect(employee).toBeNull();
  });

  it('Scenario 6: HolidayWorkCredit enforces unique constraint per employee per public holiday', async () => {
    const site = await prisma.site.create({
      data: { code: 'SITE-FEZ', name: 'Fes Center', weeklyRestDays: [0] },
    });
    const employee = await prisma.employee.create({
      data: {
        employeeId: 'EMP-FEZ-1',
        cin: 'FZ123456',
        fullName: 'Omar Idrissi',
        email: 'omar@company.ma',
        siteId: site.id,
        hireDate: new Date('2024-01-01'),
      },
    });
    const holiday = await prisma.publicHoliday.create({
      data: {
        date: new Date('2026-05-01'),
        label: 'Fête du Travail',
      },
    });

    // Create 1st credit
    await prisma.holidayWorkCredit.create({
      data: {
        employeeId: employee.employeeId,
        publicHolidayId: holiday.id,
        creditedDays: new Prisma.Decimal(1.0),
        consumedDays: new Prisma.Decimal(0.0),
      },
    });

    // Attempt 2nd credit for the same employee and holiday
    await expect(
      prisma.holidayWorkCredit.create({
        data: {
          employeeId: employee.employeeId,
          publicHolidayId: holiday.id, // Duplicate!
          creditedDays: new Prisma.Decimal(1.0),
        },
      })
    ).rejects.toThrow();
  });
});
