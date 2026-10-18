import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { EmployeeService } from '@/src/modules/employees/employee.service';
import { prisma } from '@/src/infrastructure/db/prisma';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function GET(request?: NextRequest) {
  try {
    const session = await SessionResolver.require(request);

    let employee = null;
    let balances = null;
    let upcomingAbsences: unknown[] = [];
    let upcomingHolidays: unknown[] = [];
    let unconsumedCredits: unknown[] = [];

    if (session.employeeId) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [empRecord, balRecord, absRecords, holRecords, credRecords] = await Promise.all([
        prisma.employee.findUnique({
          where: { employeeId: session.employeeId },
          include: {
            site: true,
            manager: {
              select: {
                employeeId: true,
                fullName: true,
                email: true,
                jobTitle: true,
              },
            },
          },
        }),
        EmployeeService.getEmployeeBalances(session.employeeId, session).catch(() => null),
        prisma.absence.findMany({
          where: {
            employeeId: session.employeeId,
            status: 'APPROVED',
            endDate: { gte: today },
          },
          include: {
            type: true,
            reason: true,
          },
          orderBy: { startDate: 'asc' },
          take: 5,
        }),
        prisma.publicHoliday.findMany({
          where: {
            date: { gte: today },
          },
          orderBy: { date: 'asc' },
          take: 5,
        }),
        prisma.holidayWorkCredit.findMany({
          where: {
            employeeId: session.employeeId,
            isFullyConsumed: false,
          },
          include: {
            publicHoliday: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      employee = empRecord;
      balances = balRecord;
      upcomingAbsences = absRecords;
      upcomingHolidays = holRecords;
      unconsumedCredits = credRecords;
    }

    return NextResponse.json(
      serializeForClient({
        user: {
          id: session.userId,
          email: session.email,
          role: session.role,
        },
        employee,
        balances,
        upcomingAbsences,
        upcomingHolidays,
        unconsumedCredits,
      })
    );
  } catch (error: unknown) {
    const status = (error as { statusCode?: number })?.statusCode ?? 400;
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur.';
    return NextResponse.json({ error: message }, { status });
  }
}
