import { prisma } from '@/src/infrastructure/db/prisma';
import { BalanceCalculator } from '@/src/domain/calculations/balance.calculator';
import { DynamicBalanceResult, EmployeeProfileContext } from '@/src/domain/types/business-logic.types';

export class LeaveBalanceService {
  /**
   * Calculates the employee's dynamic leave balance in real-time.
   * No static balance counters stored in database.
   */
  public static async getDynamicBalance(
    employeeId: string,
    referenceDate: Date = new Date()
  ): Promise<DynamicBalanceResult> {
    const [employee, creditAggregate, absenceAggregate] = await Promise.all([
      // 1. Employee and Site schedule
      prisma.employee.findUniqueOrThrow({
        where: { employeeId },
        include: { site: true },
      }),

      // 2. Unconsumed Recovery credits from worked public holidays (never expire)
      prisma.holidayWorkCredit.aggregate({
        where: {
          employeeId,
          isFullyConsumed: false,
        },
        _sum: {
          creditedDays: true,
          consumedDays: true,
        },
        _count: {
          id: true,
        },
      }),

      // 3. Approved deductible absences
      prisma.absence.aggregate({
        where: {
          employeeId,
          status: 'APPROVED',
          type: { isDeductible: true },
        },
        _sum: {
          retainedDays: true,
        },
      }),
    ]);

    const credited = Number(creditAggregate._sum.creditedDays ?? 0);
    const consumed = Number(creditAggregate._sum.consumedDays ?? 0);
    const totalUnconsumedHolidayCredits = Math.max(0, credited - consumed);
    const unconsumedHolidayCreditsCount = creditAggregate._count.id;

    const totalApprovedDeductions = Number(absenceAggregate._sum.retainedDays ?? 0);

    const employeeContext: EmployeeProfileContext = {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      birthDate: employee.birthDate,
      hireDate: employee.hireDate,
      active: employee.active,
      siteId: employee.siteId,
      weeklyRestDays: employee.site?.weeklyRestDays ?? [0],
    };

    return BalanceCalculator.calculate({
      employee: employeeContext,
      totalUnconsumedHolidayCredits,
      unconsumedHolidayCreditsCount,
      totalApprovedDeductions,
      referenceDate,
    });
  }
}
