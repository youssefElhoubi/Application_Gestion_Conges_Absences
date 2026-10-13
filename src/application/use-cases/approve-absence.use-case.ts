import { prisma } from '@/src/infrastructure/db/prisma';
import { RecoveryCreditService } from '../services/recovery-credit.service';
import {
  DomainError,
  InvalidStatusTransitionError,
} from '@/src/domain/errors/domain-errors';

export interface ApproveAbsenceCommand {
  absenceId: bigint;
  approverId: string;
}

export class ApproveAbsenceUseCase {
  public static async execute(command: ApproveAbsenceCommand) {
    const { absenceId, approverId } = command;

    return await prisma.$transaction(async (tx: any) => {
      // 1. Fetch Absence with Type
      const absence = await tx.absence.findUniqueOrThrow({
        where: { id: absenceId },
        include: { type: true },
      });

      // 2. State Machine Guard
      if (absence.status !== 'PENDING') {
        throw new InvalidStatusTransitionError(absence.status, 'APPROVE');
      }

      // 3. Separation of duties: Approver cannot be the applicant
      if (absence.employeeId === approverId) {
        throw new DomainError('Self-approval violation: An employee cannot approve their own absence request.');
      }

      // 4. If this is Recovery Leave, consume unexpired holiday recovery credits
      if (absence.type.code === 'RECUPERATION' || absence.type.code === 'RECOVERY') {
        const daysToConsume = Number(absence.retainedDays);
        await RecoveryCreditService.consumeCredits(absence.employeeId, daysToConsume, tx);
      }

      // 5. Update Absence Status
      const updated = await tx.absence.update({
        where: { id: absenceId },
        data: {
          status: 'APPROVED',
          approvedById: approverId,
          approvedAt: new Date(),
        },
      });

      return {
        absenceId: updated.id.toString(),
        employeeId: updated.employeeId,
        status: updated.status,
        approvedById: updated.approvedById,
        approvedAt: updated.approvedAt,
      };
    });
  }
}
