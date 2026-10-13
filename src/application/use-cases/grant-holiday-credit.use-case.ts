import { RecoveryCreditService } from '../services/recovery-credit.service';

export interface GrantHolidayCreditCommand {
  employeeId: string;
  publicHolidayId: bigint;
  creditedDays?: number;
  comment?: string;
}

export class GrantHolidayCreditUseCase {
  public static async execute(command: GrantHolidayCreditCommand) {
    const record = await RecoveryCreditService.grantHolidayWorkCredit(
      command.employeeId,
      command.publicHolidayId,
      command.creditedDays ?? 1.0,
      command.comment
    );

    return {
      creditId: record.id.toString(),
      employeeId: record.employeeId,
      publicHolidayId: record.publicHolidayId.toString(),
      creditedDays: Number(record.creditedDays),
      consumedDays: Number(record.consumedDays),
      isFullyConsumed: record.isFullyConsumed,
      createdAt: record.createdAt,
    };
  }
}
