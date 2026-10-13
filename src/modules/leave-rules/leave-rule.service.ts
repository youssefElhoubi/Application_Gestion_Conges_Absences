import { prisma } from '@/src/infrastructure/db/prisma';
import { AuthSession, AuthGuard } from '../auth/auth.guard';
import {
  CreateLeaveRuleInput,
  UpdateLeaveRuleInput,
  LeaveRuleQuery,
} from './leave-rule.schema';
import { getPrismaPagination, buildPaginationMeta, PaginatedResult } from '@/src/lib/pagination/pagination';
import { Prisma } from '@/src/generated/prisma';

export class LeaveRuleService {
  public static async createRule(input: CreateLeaveRuleInput, session: AuthSession) {
    AuthGuard.requireRole(session, ['ADMIN']);

    const existing = await prisma.leaveRule.findUnique({ where: { code: input.code } });
    if (existing) throw new Error(`Leave rule code "${input.code}" already exists.`);

    return await prisma.leaveRule.create({
      data: {
        code: input.code,
        name: input.name,
        value: new Prisma.Decimal(input.value),
        unit: input.unit,
        description: input.description ?? null,
        active: true,
      },
    });
  }

  public static async getRuleByCode(code: string, _session: AuthSession) {
    return await prisma.leaveRule.findUniqueOrThrow({
      where: { code },
    });
  }

  public static async listRules(
    query: LeaveRuleQuery,
    _session: AuthSession
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = getPrismaPagination(query);
    const where: any = {};

    if (query.active === 'true') where.active = true;
    else if (query.active === 'false') where.active = false;

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [totalItems, rules] = await Promise.all([
      prisma.leaveRule.count({ where }),
      prisma.leaveRule.findMany({
        where,
        skip,
        take,
        orderBy: { code: 'asc' },
      }),
    ]);

    return {
      data: rules,
      meta: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  public static async updateRule(
    id: bigint,
    input: UpdateLeaveRuleInput,
    session: AuthSession
  ) {
    AuthGuard.requireRole(session, ['ADMIN']);

    return await prisma.leaveRule.update({
      where: { id },
      data: {
        name: input.name,
        value: input.value !== undefined ? new Prisma.Decimal(input.value) : undefined,
        unit: input.unit,
        description: input.description,
      },
    });
  }

  public static async setRuleActive(id: bigint, active: boolean, session: AuthSession) {
    AuthGuard.requireRole(session, ['ADMIN']);

    return await prisma.leaveRule.update({
      where: { id },
      data: { active },
    });
  }
}
