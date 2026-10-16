import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/infrastructure/db/prisma';
import { WorkingDaysService } from '@/src/application/services/working-days.service';
import { LeaveBalanceService } from '@/src/application/services/leave-balance.service';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { Fraction } from '@/src/generated/prisma';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { AuthGuard } from '@/src/modules/auth/auth.guard';

export async function POST(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const body = await request.json();
    const { employeeId, startDate, endDate, fraction = 'FULL_DAY' } = body;

    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'employeeId, startDate and endDate are mandatory.' },
        { status: 400 }
      );
    }

    AuthGuard.requireAccessEmployee(session, employeeId);

    const employee = await prisma.employee.findUnique({
      where: { employeeId },
      include: { site: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    if (eDate < sDate) {
      return NextResponse.json(
        { error: 'End date cannot be earlier than start date.' },
        { status: 400 }
      );
    }

    const workingDaysCalc = await WorkingDaysService.calculateWorkingDays(
      sDate,
      eDate,
      fraction as Fraction,
      employee.siteId
    );

    const dynamicBalance = await LeaveBalanceService.getDynamicBalance(
      employeeId,
      sDate
    );

    return NextResponse.json(
      serializeForClient({
        calculatedWorkingDays: workingDaysCalc.calculatedWorkingDays,
        enteredDays: workingDaysCalc.totalCalendarDays,
        retainedDays: workingDaysCalc.calculatedWorkingDays,
        excludedHolidaysCount: workingDaysCalc.excludedHolidaysCount,
        excludedWeeklyRestDaysCount: workingDaysCalc.excludedWeeklyRestDaysCount,
        currentBalance: dynamicBalance,
      })
    );
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    const msg = error instanceof Error ? error.message : 'Calculation preview failed.';
    return NextResponse.json({ error: msg }, { status });
  }
}
