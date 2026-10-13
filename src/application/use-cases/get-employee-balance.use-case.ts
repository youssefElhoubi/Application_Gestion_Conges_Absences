import { LeaveBalanceService } from '../services/leave-balance.service';
import { DynamicBalanceResult } from '@/src/domain/types/business-logic.types';

export class GetEmployeeBalanceUseCase {
  public static async execute(
    employeeId: string,
    referenceDate?: Date
  ): Promise<DynamicBalanceResult> {
    return await LeaveBalanceService.getDynamicBalance(employeeId, referenceDate);
  }
}
