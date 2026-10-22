import { prisma } from '@/src/infrastructure/db/prisma';
import { Prisma } from '@/src/generated/prisma';
import { AuthSession, AuthGuard } from '../auth/auth.guard';
import { CreateSiteSchema, SiteQuerySchema, CreateSiteInput, UpdateSiteInput, SiteQuery } from './site.schema';
import { getPrismaPagination, buildPaginationMeta, PaginatedResult } from '@/src/lib/pagination/pagination';

export type SiteWithCount = Prisma.SiteGetPayload<{
  include: {
    _count: { select: { employees: true } };
  };
}>;

export class SiteService {
  public static async createSite(rawInput: CreateSiteInput, session: AuthSession) {
    AuthGuard.requireRole(session, ['ADMIN']);
    const input = CreateSiteSchema.parse(rawInput);

    const existingCode = await prisma.site.findUnique({ where: { code: input.code } });
    if (existingCode) throw new Error(`Site code "${input.code}" already exists.`);

    const existingName = await prisma.site.findUnique({ where: { name: input.name } });
    if (existingName) throw new Error(`Site name "${input.name}" already exists.`);

    return await prisma.site.create({
      data: {
        code: input.code,
        name: input.name,
        city: input.city ?? null,
        timezone: input.timezone,
        weeklyRestDays: input.weeklyRestDays,
        active: true,
      },
    });
  }

  public static async getSiteById(siteId: number, session: AuthSession) {
    AuthGuard.requireAuthenticated(session);
    return await prisma.site.findUniqueOrThrow({
      where: { id: siteId },
      include: {
        _count: { select: { employees: true } },
      },
    });
  }

  public static async listSites(rawQuery: SiteQuery, session: AuthSession): Promise<PaginatedResult<SiteWithCount>> {
    AuthGuard.requireAuthenticated(session);
    const query = SiteQuerySchema.parse(rawQuery);
    const { skip, take, page, pageSize } = getPrismaPagination(query);

    const where: Prisma.SiteWhereInput = {};
    if (query.active === 'true') where.active = true;
    else if (query.active === 'false') where.active = false;

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [totalItems, sites] = await Promise.all([
      prisma.site.count({ where }),
      prisma.site.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { employees: true } },
        },
      }),
    ]);

    return {
      data: sites,
      meta: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  public static async updateSite(siteId: number, input: UpdateSiteInput, session: AuthSession) {
    AuthGuard.requireRole(session, ['ADMIN']);

    return await prisma.site.update({
      where: { id: siteId },
      data: input,
    });
  }

  public static async setSiteActive(siteId: number, active: boolean, session: AuthSession) {
    AuthGuard.requireRole(session, ['ADMIN']);

    return await prisma.site.update({
      where: { id: siteId },
      data: { active },
    });
  }
}
