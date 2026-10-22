import { prisma } from '@/src/infrastructure/db/prisma';
import { LeaveCalculationEngine } from '@/src/domain/engine/leave-calculation.engine';
import {
  CalendarPublicHolidayItem,
  CalendarAbsenceItem,
  CalendarHolidayCreditItem,
  MonthlyCalendarOutput,
} from '@/src/domain/calculations/monthly-calendar.calculator';

export interface GetMonthlyCalendarQuery {
  siteId: number;
  year: number;
  month: number; // 1 to 12
  employeeId?: string; // Optional: filter for single employee vs entire site
}

export class MonthlyCalendarService {
  /**
   * Fetches data from database and executes the monthly calendar generation algorithm.
   */
  public static async getMonthlyCalendar(
    query: GetMonthlyCalendarQuery
  ): Promise<MonthlyCalendarOutput> {
    const { siteId, year, month, employeeId } = query;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const [site, staffCount, publicHolidays, absences, holidayCredits] = await Promise.all([
      // 1. Fetch site work schedule
      prisma.site.findUniqueOrThrow({
        where: { id: siteId },
        select: { id: true, weeklyRestDays: true, timezone: true },
      }),

      // 2. Count active site staff
      prisma.employee.count({
        where: { siteId, active: true },
      }),

      // 3. Public holidays occurring within this calendar month
      prisma.publicHoliday.findMany({
        where: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: {
          date: true,
          label: true,
          isReligious: true,
        },
      }),

      // 4. Absences overlapping this month
      prisma.absence.findMany({
        where: {
          employee: {
            siteId,
            ...(employeeId ? { employeeId } : {}),
          },
          status: { in: ['APPROVED', 'PENDING'] },
          startDate: { lte: endOfMonth },
          endDate: { gte: startOfMonth },
        },
        include: {
          employee: { select: { employeeId: true, fullName: true } },
          type: { select: { code: true, name: true, colorHex: true, isDeductible: true } },
        },
      }),

      // 5. Holiday work credits granted for holidays falling in this month
      prisma.holidayWorkCredit.findMany({
        where: {
          employee: {
            siteId,
            ...(employeeId ? { employeeId } : {}),
          },
          publicHoliday: {
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        },
        include: {
          publicHoliday: { select: { date: true } },
        },
      }),
    ]);

    const formattedHolidays: CalendarPublicHolidayItem[] = publicHolidays.map((h) => ({
      date: h.date,
      label: h.label,
      isReligious: h.isReligious,
    }));

    const formattedAbsences: CalendarAbsenceItem[] = absences.map((a) => ({
      id: a.id.toString(),
      employeeId: a.employeeId,
      employeeName: a.employee.fullName,
      startDate: a.startDate,
      endDate: a.endDate,
      fraction: a.fraction,
      status: a.status,
      typeCode: a.type.code,
      typeName: a.type.name,
      typeColor: a.type.colorHex,
      isDeductible: a.type.isDeductible,
    }));

    const formattedCredits: CalendarHolidayCreditItem[] = holidayCredits.map((c) => ({
      id: c.id.toString(),
      employeeId: c.employeeId,
      publicHolidayDate: c.publicHoliday.date,
      creditedDays: Number(c.creditedDays),
    }));

    return LeaveCalculationEngine.generateMonthlyCalendar({
      year,
      month,
      siteContext: {
        siteId: site.id,
        weeklyRestDays: site.weeklyRestDays,
        timezone: site.timezone,
      },
      publicHolidays: formattedHolidays,
      absences: formattedAbsences,
      holidayCredits: formattedCredits,
      totalSiteEmployeesCount: employeeId ? 1 : Math.max(1, staffCount),
    });
  }
}
