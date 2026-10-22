import { prisma } from '@/src/infrastructure/db/prisma';
import { Prisma } from '@/src/generated/prisma';
import { AuthSession, AuthGuard } from '../auth/auth.guard';
import {
  CreatePublicHolidayInput,
  UpdatePublicHolidayInput,
  PublicHolidayQuerySchema,
  PublicHolidayQuery,
} from './public-holiday.schema';
import { getPrismaPagination, buildPaginationMeta, PaginatedResult } from '@/src/lib/pagination/pagination';

export type PublicHolidayWithCount = Prisma.PublicHolidayGetPayload<{
  include: {
    _count: { select: { holidayWorkCredits: true } };
  };
}>;

export class PublicHolidayService {
  public static async createHoliday(input: CreatePublicHolidayInput, session: AuthSession) {
    AuthGuard.requireRole(session, ['ADMIN', 'HR_MANAGER']);

    const holidayDate = new Date(input.date);
    const existing = await prisma.publicHoliday.findUnique({
      where: { date: holidayDate },
    });

    if (existing) {
      throw new Error(`A public holiday is already registered on ${holidayDate.toISOString().split('T')[0]} (${existing.label}).`);
    }

    return await prisma.publicHoliday.create({
      data: {
        date: holidayDate,
        label: input.label,
        isReligious: input.isReligious,
        comment: input.comment ?? null,
      },
    });
  }

  public static async getHolidayById(id: bigint, session: AuthSession) {
    AuthGuard.requireAuthenticated(session);
    return await prisma.publicHoliday.findUniqueOrThrow({
      where: { id },
      include: {
        _count: { select: { holidayWorkCredits: true } },
        holidayWorkCredits: {
          include: {
            employee: {
              select: {
                employeeId: true,
                fullName: true,
                jobTitle: true,
                site: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  public static async listHolidays(
    rawQuery: PublicHolidayQuery,
    session: AuthSession
  ): Promise<PaginatedResult<PublicHolidayWithCount>> {
    AuthGuard.requireAuthenticated(session);
    const query = PublicHolidayQuerySchema.parse(rawQuery);
    const { skip, take, page, pageSize } = getPrismaPagination(query);
    const where: Prisma.PublicHolidayWhereInput = {};

    if (query.year) {
      const start = new Date(query.year, 0, 1);
      const end = new Date(query.year, 11, 31, 23, 59, 59);
      where.date = { gte: start, lte: end };
    } else if (query.startDate || query.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.startDate) dateFilter.gte = query.startDate;
      if (query.endDate) dateFilter.lte = query.endDate;
      where.date = dateFilter;
    }

    if (query.search) {
      where.label = { contains: query.search, mode: 'insensitive' };
    }

    const [totalItems, holidays] = await Promise.all([
      prisma.publicHoliday.count({ where }),
      prisma.publicHoliday.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'asc' },
        include: {
          _count: { select: { holidayWorkCredits: true } },
        },
      }),
    ]);

    return {
      data: holidays,
      meta: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  public static async updateHoliday(
    id: bigint,
    input: UpdatePublicHolidayInput,
    session: AuthSession
  ) {
    AuthGuard.requireRole(session, ['ADMIN', 'HR_MANAGER']);

    return await prisma.publicHoliday.update({
      where: { id },
      data: {
        ...input,
        date: input.date ? new Date(input.date) : undefined,
      },
    });
  }

  public static async deleteHoliday(id: bigint, session: AuthSession) {
    AuthGuard.requireRole(session, ['ADMIN']);

    const creditCount = await prisma.holidayWorkCredit.count({
      where: { publicHolidayId: id },
    });

    if (creditCount > 0) {
      throw new Error(`Cannot delete holiday: ${creditCount} employee recovery credit(s) are linked to this holiday.`);
    }

    return await prisma.publicHoliday.delete({
      where: { id },
    });
  }
}
