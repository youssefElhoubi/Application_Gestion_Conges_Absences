import { prisma } from '@/src/infrastructure/db/prisma';
import { AuthSession, AuthGuard } from '../auth/auth.guard';
import {
  CreateAbsenceInput,
  AbsenceQuery,
  ApproveAbsenceInput,
  RejectAbsenceInput,
  CancelAbsenceInput,
} from './absence.schema';
import { getPrismaPagination, buildPaginationMeta, PaginatedResult } from '@/src/lib/pagination/pagination';
import { WorkingDaysService } from '@/src/application/services/working-days.service';
import { LeaveBalanceService } from '@/src/application/services/leave-balance.service';
import { LeaveValidationRules } from '@/src/domain/validation/leave-validation.rules';
import { RecoveryCreditService } from '@/src/application/services/recovery-credit.service';
import { Prisma } from '@/src/generated/prisma';

export class AbsenceService {
  /**
   * Create an absence request with full statutory validation
   */
  public static async createAbsenceRequest(input: CreateAbsenceInput, session: AuthSession) {
    // 1. Permission check: Applicant must be the employee themselves, or HR/Admin
    AuthGuard.requireAccessEmployee(session, input.employeeId);

    // 2. Fetch Employee, Site & Type
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { employeeId: input.employeeId },
      include: { site: true },
    });

    const absenceType = await prisma.absenceType.findUniqueOrThrow({
      where: { id: input.typeId },
    });

    const absenceReason = input.reasonId
      ? await prisma.absenceReason.findUnique({ where: { id: input.reasonId } })
      : null;

    // 3. Collision / Overlap check (PENDING or APPROVED)
    const overlapCount = await prisma.absence.count({
      where: {
        employeeId: input.employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: input.endDate },
        endDate: { gte: input.startDate },
      },
    });

    // 4. Calculate Net Statutory Working Days (Public Holidays NEVER consume leave)
    const workingDaysCalc = await WorkingDaysService.calculateWorkingDays(
      input.startDate,
      input.endDate,
      input.fraction,
      employee.siteId
    );

    // 5. Dynamic Leave Balance Check
    const dynamicBalance = await LeaveBalanceService.getDynamicBalance(
      input.employeeId,
      input.startDate
    );

    // 6. Domain Validation Rules Invariants (Seniority, Quotas, Overlap)
    LeaveValidationRules.validate({
      employee: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        birthDate: employee.birthDate,
        hireDate: employee.hireDate,
        active: employee.active,
        siteId: employee.siteId,
        weeklyRestDays: employee.site?.weeklyRestDays ?? [0],
      },
      typeCode: absenceType.code,
      isDeductible: absenceType.isDeductible,
      reasonCode: absenceReason?.code,
      startDate: input.startDate,
      endDate: input.endDate,
      fraction: input.fraction,
      calculatedWorkingDays: workingDaysCalc.calculatedWorkingDays,
      currentBalance: dynamicBalance,
      hasOverlappingAbsence: overlapCount > 0,
    });

    const retainedDays = workingDaysCalc.calculatedWorkingDays;
    const enteredDays = workingDaysCalc.totalCalendarDays;

    // 7. Atomic transaction: create Absence + initial ApprovalHistory log
    return await prisma.$transaction(async (tx: any) => {
      const createdAbsence = await tx.absence.create({
        data: {
          employeeId: input.employeeId,
          typeId: input.typeId,
          reasonId: input.reasonId ?? null,
          startDate: input.startDate,
          endDate: input.endDate,
          fraction: input.fraction,
          calculatedWorkingDays: new Prisma.Decimal(workingDaysCalc.calculatedWorkingDays),
          enteredDays: new Prisma.Decimal(enteredDays),
          retainedDays: new Prisma.Decimal(retainedDays),
          supportingDocumentProvided: input.supportingDocumentProvided,
          status: 'PENDING',
          comment: input.comment ?? null,
        },
        include: {
          type: true,
          reason: true,
          employee: { select: { employeeId: true, fullName: true, siteId: true } },
        },
      });

      // Audit Trail
      await tx.approvalHistory.create({
        data: {
          absenceId: createdAbsence.id,
          action: 'SUBMITTED',
          fromStatus: 'PENDING',
          toStatus: 'PENDING',
          performedByUserId: session.userId,
          performedByEmployeeId: session.employeeId,
          comment: input.comment ?? 'Absence request submitted.',
        },
      });

      return createdAbsence;
    });
  }

  /**
   * Retrieve absence by ID with authorization check
   */
  public static async getAbsenceById(absenceId: bigint, session: AuthSession) {
    const absence = await prisma.absence.findUniqueOrThrow({
      where: { id: absenceId },
      include: {
        type: true,
        reason: true,
        employee: { select: { employeeId: true, fullName: true, siteId: true } },
        approvalHistory: {
          orderBy: { createdAt: 'desc' },
          include: { performedByUser: { select: { email: true, role: true } } },
        },
      },
    });

    AuthGuard.requireAccessEmployee(session, absence.employeeId);
    return absence;
  }

  /**
   * List absence requests with pagination and role-based scoping
   */
  public static async listAbsences(
    query: AbsenceQuery,
    session: AuthSession
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = getPrismaPagination(query);
    const where: any = {};

    // Role-based data scoping
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

    if (query.siteId) {
      where.employee = { siteId: query.siteId };
    }

    if (query.typeId) {
      where.typeId = query.typeId;
    }

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.AND = [];
      if (query.startDate) where.AND.push({ endDate: { gte: query.startDate } });
      if (query.endDate) where.AND.push({ startDate: { lte: query.endDate } });
    }

    if (query.search) {
      where.employee = {
        ...where.employee,
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { employeeId: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [totalItems, absences] = await Promise.all([
      prisma.absence.count({ where }),
      prisma.absence.findMany({
        where,
        skip,
        take,
        orderBy: { requestDate: 'desc' },
        include: {
          type: true,
          reason: true,
          employee: { select: { employeeId: true, fullName: true, siteId: true, site: { select: { name: true } } } },
        },
      }),
    ]);

    return {
      data: absences,
      meta: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  /**
   * Approve absence request:
   * Enforces self-approval prohibition, state transition, and atomic recovery credit debit.
   */
  public static async approveAbsence(
    absenceId: bigint,
    input: ApproveAbsenceInput,
    session: AuthSession
  ) {
    return await prisma.$transaction(async (tx: any) => {
      const absence = await tx.absence.findUniqueOrThrow({
        where: { id: absenceId },
        include: { type: true, employee: true },
      });

      // 1. Authorization & Self-Approval prohibition
      AuthGuard.requireCanReviewAbsence(session, absence.employeeId);

      // 2. State machine check
      if (absence.status !== 'PENDING') {
        throw new Error(`Cannot approve absence with status "${absence.status}".`);
      }

      // 3. Concurrency check: Ensure balance has not been exhausted by another concurrent approval
      if (absence.type.isDeductible) {
        const balance = await LeaveBalanceService.getDynamicBalance(absence.employeeId, absence.startDate);
        const requiredDays = Number(absence.retainedDays);
        if (balance.netAvailableBalance < requiredDays) {
          throw new Error(
            `Concurrency conflict: Remaining balance (${balance.netAvailableBalance}) is now insufficient for requested ${requiredDays} days.`
          );
        }
      }

      // 4. If Recovery Leave, consume available recovery credits in FIFO order
      if (absence.type.code === 'RECUPERATION') {
        const daysToConsume = Number(absence.retainedDays);
        await RecoveryCreditService.consumeCredits(absence.employeeId, daysToConsume, tx);
      }

      // 5. Update Status
      const updatedAbsence = await tx.absence.update({
        where: { id: absenceId },
        data: {
          status: 'APPROVED',
          approvedById: session.userId,
          approvedAt: new Date(),
        },
        include: { type: true, employee: true },
      });

      // 6. Record in ApprovalHistory audit trail
      await tx.approvalHistory.create({
        data: {
          absenceId,
          action: 'APPROVED',
          fromStatus: 'PENDING',
          toStatus: 'APPROVED',
          performedByUserId: session.userId,
          performedByEmployeeId: session.employeeId,
          comment: input.comment ?? 'Absence approved.',
        },
      });

      return updatedAbsence;
    });
  }

  /**
   * Reject absence request with mandatory justification
   */
  public static async rejectAbsence(
    absenceId: bigint,
    input: RejectAbsenceInput,
    session: AuthSession
  ) {
    return await prisma.$transaction(async (tx: any) => {
      const absence = await tx.absence.findUniqueOrThrow({
        where: { id: absenceId },
      });

      // 1. Authorization check
      AuthGuard.requireCanReviewAbsence(session, absence.employeeId);

      // 2. State transition
      if (absence.status !== 'PENDING') {
        throw new Error(`Cannot reject absence with status "${absence.status}".`);
      }

      const updated = await tx.absence.update({
        where: { id: absenceId },
        data: {
          status: 'REJECTED',
          rejectionReason: input.reason,
          approvedById: session.userId,
          approvedAt: new Date(),
        },
      });

      // 3. Audit trail
      await tx.approvalHistory.create({
        data: {
          absenceId,
          action: 'REJECTED',
          fromStatus: 'PENDING',
          toStatus: 'REJECTED',
          performedByUserId: session.userId,
          performedByEmployeeId: session.employeeId,
          comment: input.reason,
        },
      });

      return updated;
    });
  }

  /**
   * Cancel an absence request
   */
  public static async cancelAbsence(
    absenceId: bigint,
    input: CancelAbsenceInput,
    session: AuthSession
  ) {
    return await prisma.$transaction(async (tx: any) => {
      const absence = await tx.absence.findUniqueOrThrow({
        where: { id: absenceId },
      });

      const isApplicant = session.employeeId === absence.employeeId;
      const isAdminOrHr = session.role === 'ADMIN' || session.role === 'HR_MANAGER';

      if (!isApplicant && !isAdminOrHr) {
        throw new Error('You do not have permission to cancel this absence request.');
      }

      // Workflow transition validation
      if (absence.status === 'REJECTED' || absence.status === 'CANCELLED') {
        throw new Error(`Absence is already closed with status "${absence.status}".`);
      }

      // Approved leaves that already started can only be cancelled by HR or Admin
      const today = new Date();
      if (absence.status === 'APPROVED' && absence.startDate <= today && !isAdminOrHr) {
        throw new Error('Approved leaves that have already started require HR intervention to cancel.');
      }

      const updated = await tx.absence.update({
        where: { id: absenceId },
        data: { status: 'CANCELLED' },
      });

      // Audit trail
      await tx.approvalHistory.create({
        data: {
          absenceId,
          action: 'CANCELLED',
          fromStatus: absence.status,
          toStatus: 'CANCELLED',
          performedByUserId: session.userId,
          performedByEmployeeId: session.employeeId,
          comment: input.reason ?? 'Absence cancelled.',
        },
      });

      return updated;
    });
  }
}
