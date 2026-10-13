import { prisma } from '@/src/infrastructure/db/prisma';
import { Fraction, Prisma } from '@/src/generated/prisma';
import { WorkingDaysService } from '../services/working-days.service';
import { LeaveBalanceService } from '../services/leave-balance.service';
import { LeaveValidationRules } from '@/src/domain/validation/leave-validation.rules';
import { EmployeeProfileContext } from '@/src/domain/types/business-logic.types';

export interface SubmitAbsenceCommand {
  employeeId: string;
  typeId: number;
  reasonId?: number | null;
  startDate: Date;
  endDate: Date;
  fraction?: Fraction;
  enteredDays?: number;
  supportingDocumentProvided?: boolean;
  comment?: string | null;
}

export interface SubmitAbsenceResult {
  absenceId: string;
  status: string;
  calculatedWorkingDays: number;
  retainedDays: number;
  excludedHolidaysCount: number;
  excludedWeeklyRestDaysCount: number;
  netRemainingBalanceAfterRequest: number;
}

export class SubmitAbsenceUseCase {
  public static async execute(command: SubmitAbsenceCommand): Promise<SubmitAbsenceResult> {
    const fraction = command.fraction ?? 'FULL_DAY';

    // 1. Fetch Employee and Site profile
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { employeeId: command.employeeId },
      include: { site: true },
    });

    // 2. Fetch Absence Type & optional Reason
    const absenceType = await prisma.absenceType.findUniqueOrThrow({
      where: { id: command.typeId },
    });

    const absenceReason = command.reasonId
      ? await prisma.absenceReason.findUnique({ where: { id: command.reasonId } })
      : null;

    // 3. Check for Overlapping Absences (PENDING or APPROVED)
    const overlappingCount = await prisma.absence.count({
      where: {
        employeeId: command.employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: command.endDate },
        endDate: { gte: command.startDate },
      },
    });

    // 4. Calculate Net Statutory Working Days (Public Holidays NEVER consume leave)
    const workingDaysCalculation = await WorkingDaysService.calculateWorkingDays(
      command.startDate,
      command.endDate,
      fraction,
      employee.siteId
    );

    // 5. Calculate Real-Time Dynamic Balance
    const dynamicBalance = await LeaveBalanceService.getDynamicBalance(
      command.employeeId,
      command.startDate
    );

    const employeeContext: EmployeeProfileContext = {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      birthDate: employee.birthDate,
      hireDate: employee.hireDate,
      active: employee.active,
      siteId: employee.siteId,
      weeklyRestDays: employee.site?.weeklyRestDays ?? [0],
    };

    // 6. Execute Domain Validation Invariants
    LeaveValidationRules.validate({
      employee: employeeContext,
      typeCode: absenceType.code,
      isDeductible: absenceType.isDeductible,
      reasonCode: absenceReason?.code,
      startDate: command.startDate,
      endDate: command.endDate,
      fraction,
      calculatedWorkingDays: workingDaysCalculation.calculatedWorkingDays,
      currentBalance: dynamicBalance,
      hasOverlappingAbsence: overlappingCount > 0,
    });

    // 7. Retained days calculation
    const retainedDays = workingDaysCalculation.calculatedWorkingDays;
    const enteredDays = command.enteredDays ?? workingDaysCalculation.totalCalendarDays;

    // 8. Persist Absence
    const createdAbsence = await prisma.absence.create({
      data: {
        employeeId: command.employeeId,
        typeId: command.typeId,
        reasonId: command.reasonId ?? null,
        startDate: command.startDate,
        endDate: command.endDate,
        fraction,
        calculatedWorkingDays: new Prisma.Decimal(workingDaysCalculation.calculatedWorkingDays),
        enteredDays: new Prisma.Decimal(enteredDays),
        retainedDays: new Prisma.Decimal(retainedDays),
        supportingDocumentProvided: command.supportingDocumentProvided ?? false,
        status: 'PENDING',
        comment: command.comment ?? null,
      },
    });

    const netRemaining = absenceType.isDeductible
      ? dynamicBalance.netAvailableBalance - retainedDays
      : dynamicBalance.netAvailableBalance;

    return {
      absenceId: createdAbsence.id.toString(),
      status: createdAbsence.status,
      calculatedWorkingDays: workingDaysCalculation.calculatedWorkingDays,
      retainedDays,
      excludedHolidaysCount: workingDaysCalculation.excludedHolidaysCount,
      excludedWeeklyRestDaysCount: workingDaysCalculation.excludedWeeklyRestDaysCount,
      netRemainingBalanceAfterRequest: Math.round(netRemaining * 100) / 100,
    };
  }
}
