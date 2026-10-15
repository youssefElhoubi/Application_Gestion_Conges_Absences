import { prisma } from '@/src/infrastructure/db/prisma';
import { AuthSession, AuthGuard } from '../auth/auth.guard';
import {
  GrantHolidayCreditInput,
  CorrectHolidayCreditInput,
  HolidayCreditQuery,
} from './holiday-work-credit.schema';
import { getPrismaPagination, buildPaginationMeta, PaginatedResult } from '@/src/lib/pagination/pagination';
import { Prisma } from '@/src/generated/prisma';

export class HolidayWorkCreditService {
  /**
   * Record that an employee worked on a public holiday (ADMIN or HR_MANAGER)
   */
  public static async grantCredit(input: GrantHolidayCreditInput, session: AuthSession) {
    AuthGuard.requireRole(session, ['ADMIN', 'HR_MANAGER']);

    const holidayIdBigInt = BigInt(input.publicHolidayId);

    // 1. Validate employee and holiday existence
    const [employee, holiday] = await Promise.all([
      prisma.employee.findUniqueOrThrow({ where: { employeeId: input.employeeId } }),
      prisma.publicHoliday.findUniqueOrThrow({ where: { id: holidayIdBigInt } }),
    ]);

    if (!employee.active) {
      throw new Error(`Cannot grant recovery credit to inactive employee ${input.employeeId}.`);
    }

    // 2. Prevent duplicate credit
    const existing = await prisma.holidayWorkCredit.findUnique({
      where: {
        employeeId_publicHolidayId: {
          employeeId: input.employeeId,
          publicHolidayId: holidayIdBigInt,
        },
      },
    });

    if (existing) {
      throw new Error(
        `Employee ${input.employeeId} has already been credited for holiday "${holiday.label}" on ${holiday.date.toISOString().split('T')[0]}.`
      );
    }

    return await prisma.holidayWorkCredit.create({
      data: {
        employeeId: input.employeeId,
        publicHolidayId: holidayIdBigInt,
        creditedDays: new Prisma.Decimal(input.creditedDays),
        consumedDays: new Prisma.Decimal(0.0),
        isFullyConsumed: false,
        recordedByUserId: session.userId,
        comment: input.comment ?? `Credit granted for working on ${holiday.label}`,
      },
      include: {
        employee: { select: { employeeId: true, fullName: true } },
        publicHoliday: true,
      },
    });
  }

  /**
   * Correct or adjust an existing recovery credit with mandatory audit explanation
   */
  public static async correctCredit(
    creditId: bigint,
    input: CorrectHolidayCreditInput,
    session: AuthSession
  ) {
    AuthGuard.requireRole(session, ['ADMIN']);

    const existing = await prisma.holidayWorkCredit.findUniqueOrThrow({
      where: { id: creditId },
    });

    const newCredited = input.creditedDays !== undefined ? new Prisma.Decimal(input.creditedDays) : existing.creditedDays;
    const consumed = Number(existing.consumedDays);

    if (Number(newCredited) < consumed) {
      throw new Error(
        `Cannot reduce credit to ${newCredited} days: ${consumed} days have already been consumed by approved recovery leave.`
      );
    }

    const isFully = consumed >= Number(newCredited);

    return await prisma.holidayWorkCredit.update({
      where: { id: creditId },
      data: {
        creditedDays: newCredited,
        isFullyConsumed: isFully,
        comment: `[CORRECTION by ${session.email}]: ${input.comment} | (Previous: ${existing.creditedDays})`,
      },
    });
  }

  /**
   * List holiday work credits with pagination and filters
   */
  public static async listCredits(
    query: HolidayCreditQuery,
    session: AuthSession
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = getPrismaPagination(query);
    const where: any = {};

    if (session.role === 'EMPLOYEE') {
      where.employeeId = session.employeeId;
    } else if (session.role === 'SUPERVISOR') {
      where.OR = [
        { employeeId: session.employeeId },
        { employeeId: { in: session.managedEmployeeIds } },
      ];
    } else if (query.employeeId) {
      where.employeeId = query.employeeId;
    }

    if (query.publicHolidayId) {
      where.publicHolidayId = BigInt(query.publicHolidayId);
    }

    if (query.isFullyConsumed === 'true') where.isFullyConsumed = true;
    else if (query.isFullyConsumed === 'false') where.isFullyConsumed = false;

    const [totalItems, credits] = await Promise.all([
      prisma.holidayWorkCredit.count({ where }),
      prisma.holidayWorkCredit.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              employeeId: true,
              fullName: true,
              jobTitle: true,
              site: { select: { name: true } },
            },
          },
          publicHoliday: true,
        },
      }),
    ]);

    return {
      data: credits,
      meta: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  /**
   * Retrieve a credit by ID with full employee and public holiday context
   */
  public static async getCreditById(creditId: bigint, _session: AuthSession) {
    return await prisma.holidayWorkCredit.findUniqueOrThrow({
      where: { id: creditId },
      include: {
        employee: {
          select: {
            employeeId: true,
            fullName: true,
            jobTitle: true,
            site: { select: { name: true } },
          },
        },
        publicHoliday: true,
      },
    });
  }

  /**
   * Revoke or delete an unconsumed credit (ADMIN or HR_MANAGER)
   */
  public static async deleteCredit(creditId: bigint, session: AuthSession) {
    AuthGuard.requireRole(session, ['ADMIN', 'HR_MANAGER']);

    const existing = await prisma.holidayWorkCredit.findUniqueOrThrow({
      where: { id: creditId },
    });

    if (Number(existing.consumedDays) > 0) {
      throw new Error(
        `Impossible de révoquer ce crédit : ${existing.consumedDays} jour(s) ont déjà été consommés par des congés de récupération.`
      );
    }

    return await prisma.holidayWorkCredit.delete({
      where: { id: creditId },
    });
  }
}
