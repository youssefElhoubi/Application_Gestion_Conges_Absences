import { AbsenceStatus, Fraction } from '@/src/generated/prisma';

export interface CalendarPublicHolidayItem {
  date: Date;
  label: string;
  isReligious: boolean;
}

export interface CalendarAbsenceItem {
  id: string;
  employeeId: string;
  employeeName?: string;
  startDate: Date;
  endDate: Date;
  fraction: Fraction;
  status: AbsenceStatus;
  typeCode?: string;
  typeName: string;
  typeColor?: string;
  isDeductible: boolean;
}

export interface CalendarHolidayCreditItem {
  id: string;
  employeeId: string;
  publicHolidayDate: Date;
  creditedDays: number;
}

export interface MonthlyCalendarInput {
  year: number;
  month: number; // 1 to 12
  siteContext: {
    siteId: number;
    weeklyRestDays: number[]; // e.g. [0] for Sunday, [6, 0] for Sat/Sun
    timezone?: string;
  };
  publicHolidays: CalendarPublicHolidayItem[];
  absences: CalendarAbsenceItem[];
  holidayCredits?: CalendarHolidayCreditItem[];
  totalSiteEmployeesCount?: number;
}

export type DayClassification = 'WORKING_DAY' | 'WEEKLY_REST' | 'PUBLIC_HOLIDAY';

export interface CalendarDayCell {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  dayNameFr: string;
  dayClassification: DayClassification;
  isWorkingDay: boolean; // True if standard working day (not holiday and not weekly rest)
  isWeeklyRest: boolean;
  isPublicHoliday: boolean;
  publicHoliday?: {
    label: string;
    isReligious: boolean;
  } | null;
  absences: {
    absenceId: string;
    employeeId: string;
    employeeName?: string;
    status: AbsenceStatus;
    typeName: string;
    typeColor?: string;
    fraction: Fraction;
    isDeductible: boolean;
  }[];
  holidayCreditsEarned: {
    creditId: string;
    employeeId: string;
    creditedDays: number;
  }[];
  totalAbsentHeadcount: number;
  workingHeadcount?: number;
}

export interface MonthlyCalendarOutput {
  year: number;
  month: number;
  monthNameFr: string;
  daysInMonth: number;
  days: CalendarDayCell[];
  summary: {
    totalCalendarDays: number;
    totalStandardWorkingDays: number;
    totalWeeklyRestDays: number;
    totalPublicHolidays: number;
    totalAbsentDaysApproved: number;
    totalAbsentDaysPending: number;
    siteStaffCount: number;
    estimatedCapacityPercentage: number;
  };
}

const FRENCH_DAY_NAMES = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

const FRENCH_MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export class MonthlyCalendarCalculator {
  /**
   * Generates a monthly schedule matrix with statutory exclusions and leave overlays.
   */
  public static generate(input: MonthlyCalendarInput): MonthlyCalendarOutput {
    const { year, month, siteContext, publicHolidays, absences, holidayCredits = [], totalSiteEmployeesCount = 1 } = input;

    // Number of days in the requested month (handling leap years for Feb)
    const daysInMonth = new Date(year, month, 0).getDate();

    // Map public holidays by ISO date key (YYYY-MM-DD)
    const holidayMap = new Map<string, CalendarPublicHolidayItem>();
    for (const h of publicHolidays) {
      holidayMap.set(this.toISODateKey(new Date(h.date)), h);
    }

    const cells: CalendarDayCell[] = [];

    let totalStandardWorkingDays = 0;
    let totalWeeklyRestDays = 0;
    let totalPublicHolidays = 0;
    let totalAbsentDaysApproved = 0;
    let totalAbsentDaysPending = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const dateKey = this.toISODateKey(currentDate);
      const dayOfWeek = currentDate.getDay();

      const holiday = holidayMap.get(dateKey) ?? null;
      const isPublicHoliday = holiday !== null;
      const isWeeklyRest = siteContext.weeklyRestDays.includes(dayOfWeek);

      // Classification priority: Public Holiday > Weekly Rest > Working Day
      let dayClassification: DayClassification = 'WORKING_DAY';
      if (isPublicHoliday) {
        dayClassification = 'PUBLIC_HOLIDAY';
        totalPublicHolidays++;
      } else if (isWeeklyRest) {
        dayClassification = 'WEEKLY_REST';
        totalWeeklyRestDays++;
      } else {
        totalStandardWorkingDays++;
      }

      const isWorkingDay = dayClassification === 'WORKING_DAY';

      // Find absences overlapping this exact calendar day
      const dayAbsences = absences.filter((a) => {
        const start = this.toISODateKey(new Date(a.startDate));
        const end = this.toISODateKey(new Date(a.endDate));
        return dateKey >= start && dateKey <= end;
      });

      // Find credits earned on this exact holiday day
      const dayCredits = holidayCredits.filter((c) => {
        return this.toISODateKey(new Date(c.publicHolidayDate)) === dateKey;
      });

      // Accumulate absent headcount
      let absentHeadcountOnDay = 0;
      for (const a of dayAbsences) {
        const factor = a.fraction === 'FULL_DAY' ? 1.0 : 0.5;
        if (a.status === 'APPROVED') {
          totalAbsentDaysApproved += factor;
          absentHeadcountOnDay += factor;
        } else if (a.status === 'PENDING') {
          totalAbsentDaysPending += factor;
        }
      }

      cells.push({
        date: dateKey,
        dayOfMonth: day,
        dayOfWeek,
        dayNameFr: FRENCH_DAY_NAMES[dayOfWeek],
        dayClassification,
        isWorkingDay,
        isWeeklyRest,
        isPublicHoliday,
        publicHoliday: holiday ? { label: holiday.label, isReligious: holiday.isReligious } : null,
        absences: dayAbsences.map((a) => ({
          absenceId: a.id,
          employeeId: a.employeeId,
          employeeName: a.employeeName,
          status: a.status,
          typeName: a.typeName,
          typeColor: a.typeColor,
          fraction: a.fraction,
          isDeductible: a.isDeductible,
        })),
        holidayCreditsEarned: dayCredits.map((c) => ({
          creditId: c.id,
          employeeId: c.employeeId,
          creditedDays: c.creditedDays,
        })),
        totalAbsentHeadcount: absentHeadcountOnDay,
        workingHeadcount: Math.max(0, totalSiteEmployeesCount - absentHeadcountOnDay),
      });
    }

    // Capacity calculation: Total potential man-days vs actual working man-days
    const potentialManDays = totalStandardWorkingDays * totalSiteEmployeesCount;
    const actualWorkingManDays = Math.max(0, potentialManDays - totalAbsentDaysApproved);
    const estimatedCapacityPercentage =
      potentialManDays > 0
        ? Math.round((actualWorkingManDays / potentialManDays) * 1000) / 10
        : 100.0;

    return {
      year,
      month,
      monthNameFr: FRENCH_MONTH_NAMES[month - 1],
      daysInMonth,
      days: cells,
      summary: {
        totalCalendarDays: daysInMonth,
        totalStandardWorkingDays,
        totalWeeklyRestDays,
        totalPublicHolidays,
        totalAbsentDaysApproved: Math.round(totalAbsentDaysApproved * 100) / 100,
        totalAbsentDaysPending: Math.round(totalAbsentDaysPending * 100) / 100,
        siteStaffCount: totalSiteEmployeesCount,
        estimatedCapacityPercentage,
      },
    };
  }

  private static toISODateKey(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
