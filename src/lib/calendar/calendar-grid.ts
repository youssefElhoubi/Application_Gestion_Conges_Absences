/**
 * Calendar Grid Calculation Engine
 * Pure, timezone-safe date math for monthly calendar grids.
 * Follows Moroccan / ISO 8601 week convention (Monday to Sunday).
 */

import {
  CalendarGridCell,
  MonthGridResult,
  WeekInfoResult,
} from './calendar-types';
import {
  MONTH_NAMES_FR,
  WEEKDAYS_FR,
  WEEKDAYS_SHORT_FR,
} from './calendar-constants';
import {
  toDateKey,
  parseDateKey,
  getAdjacentMonth,
  getAdjacentWeek,
} from './calendar-date-utils';

// Re-export types, constants, and utilities for backward compatibility
export type { CalendarGridCell, MonthGridResult, WeekInfoResult };
export {
  MONTH_NAMES_FR,
  WEEKDAYS_FR,
  WEEKDAYS_SHORT_FR,
  toDateKey,
  parseDateKey,
  getAdjacentMonth,
  getAdjacentWeek,
};

/**
 * Builds the complete monthly grid cells including leading days from previous month
 * and trailing days from next month to form complete 7-day rows (Monday to Sunday).
 */
export function buildMonthGrid(
  year: number,
  month: number,
  referenceDate?: Date
): MonthGridResult {
  // Normalize input
  const safeYear = Math.max(1970, Math.min(2100, Math.floor(year)));
  const safeMonth = Math.max(1, Math.min(12, Math.floor(month)));

  // Current date for today's highlight
  const now = referenceDate ?? new Date();
  const todayKey = toDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());

  // Number of days in current month
  const daysInMonth = new Date(safeYear, safeMonth, 0).getDate();

  // Day of week of the 1st day of the month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfMonth = new Date(safeYear, safeMonth - 1, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();

  // Map JS day-of-week (0=Sun..6=Sat) to Monday-start index (0=Mon..6=Sun)
  const leadingDaysCount = (firstDayOfWeek + 6) % 7;

  // Previous month parameters
  const prevPeriod = getAdjacentMonth(safeYear, safeMonth, 'prev');
  const daysInPrevMonth = new Date(prevPeriod.year, prevPeriod.month, 0).getDate();

  const cells: CalendarGridCell[] = [];

  // 1. Leading cells from previous month
  for (let i = leadingDaysCount; i > 0; i--) {
    const day = daysInPrevMonth - i + 1;
    const dateKey = toDateKey(prevPeriod.year, prevPeriod.month, day);
    const dateObj = new Date(prevPeriod.year, prevPeriod.month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const weekColumnIndex = (dayOfWeek + 6) % 7;

    cells.push({
      dateKey,
      dayOfMonth: day,
      month: prevPeriod.month,
      year: prevPeriod.year,
      dayOfWeek,
      weekColumnIndex,
      isCurrentMonth: false,
      isPrevMonth: true,
      isNextMonth: false,
      isToday: dateKey === todayKey,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayNameFr: WEEKDAYS_FR[weekColumnIndex],
      formattedDateFr: `${day} ${MONTH_NAMES_FR[prevPeriod.month - 1]} ${prevPeriod.year}`,
    });
  }

  // 2. Days in the current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(safeYear, safeMonth, day);
    const dateObj = new Date(safeYear, safeMonth - 1, day);
    const dayOfWeek = dateObj.getDay();
    const weekColumnIndex = (dayOfWeek + 6) % 7;

    cells.push({
      dateKey,
      dayOfMonth: day,
      month: safeMonth,
      year: safeYear,
      dayOfWeek,
      weekColumnIndex,
      isCurrentMonth: true,
      isPrevMonth: false,
      isNextMonth: false,
      isToday: dateKey === todayKey,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayNameFr: WEEKDAYS_FR[weekColumnIndex],
      formattedDateFr: `${day} ${MONTH_NAMES_FR[safeMonth - 1]} ${safeYear}`,
    });
  }

  // 3. Trailing cells from next month to complete the final 7-day row
  const nextPeriod = getAdjacentMonth(safeYear, safeMonth, 'next');
  const trailingDaysCount = (7 - (cells.length % 7)) % 7;

  for (let day = 1; day <= trailingDaysCount; day++) {
    const dateKey = toDateKey(nextPeriod.year, nextPeriod.month, day);
    const dateObj = new Date(nextPeriod.year, nextPeriod.month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const weekColumnIndex = (dayOfWeek + 6) % 7;

    cells.push({
      dateKey,
      dayOfMonth: day,
      month: nextPeriod.month,
      year: nextPeriod.year,
      dayOfWeek,
      weekColumnIndex,
      isCurrentMonth: false,
      isPrevMonth: false,
      isNextMonth: true,
      isToday: dateKey === todayKey,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayNameFr: WEEKDAYS_FR[weekColumnIndex],
      formattedDateFr: `${day} ${MONTH_NAMES_FR[nextPeriod.month - 1]} ${nextPeriod.year}`,
    });
  }

  return {
    year: safeYear,
    month: safeMonth,
    monthNameFr: MONTH_NAMES_FR[safeMonth - 1],
    daysInMonth,
    cells,
    totalWeeks: cells.length / 7,
  };
}

/**
 * Given any date string (YYYY-MM-DD) or reference Date, returns the 7 days of that week (Monday to Sunday)
 * along with French labels and boundary date keys without timezone distortion.
 */
export function getWeekDays(
  referenceDateKeyOrDate: string | Date,
  referenceToday?: Date
): WeekInfoResult {
  const parts =
    typeof referenceDateKeyOrDate === 'string'
      ? parseDateKey(referenceDateKeyOrDate)
      : {
          year: referenceDateKeyOrDate.getFullYear(),
          month: referenceDateKeyOrDate.getMonth() + 1,
          day: referenceDateKeyOrDate.getDate(),
        };

  const refDateObj = new Date(parts.year, parts.month - 1, parts.day);
  const dayOfWeek = refDateObj.getDay();
  const mondayOffset = (dayOfWeek + 6) % 7; // Monday = 0, Sunday = 6

  const mondayObj = new Date(parts.year, parts.month - 1, parts.day - mondayOffset);
  const mondayKey = toDateKey(mondayObj.getFullYear(), mondayObj.getMonth() + 1, mondayObj.getDate());

  const now = referenceToday ?? new Date();
  const todayKey = toDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const days: CalendarGridCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayObj.getFullYear(), mondayObj.getMonth(), mondayObj.getDate() + i);
    const dKey = toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const dow = d.getDay();
    const colIdx = i; // 0=Mon..6=Sun
    days.push({
      dateKey: dKey,
      dayOfMonth: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      dayOfWeek: dow,
      weekColumnIndex: colIdx,
      isCurrentMonth: d.getMonth() + 1 === parts.month,
      isPrevMonth: d.getMonth() + 1 < parts.month,
      isNextMonth: d.getMonth() + 1 > parts.month,
      isToday: dKey === todayKey,
      isWeekend: dow === 0 || dow === 6,
      dayNameFr: WEEKDAYS_FR[colIdx],
      formattedDateFr: `${d.getDate()} ${MONTH_NAMES_FR[d.getMonth()]} ${d.getFullYear()}`,
    });
  }

  const sundayObj = new Date(mondayObj.getFullYear(), mondayObj.getMonth(), mondayObj.getDate() + 6);
  const sundayKey = toDateKey(sundayObj.getFullYear(), sundayObj.getMonth() + 1, sundayObj.getDate());

  let formattedWeekLabelFr = '';
  if (
    mondayObj.getMonth() === sundayObj.getMonth() &&
    mondayObj.getFullYear() === sundayObj.getFullYear()
  ) {
    formattedWeekLabelFr = `Semaine du ${mondayObj.getDate()} au ${sundayObj.getDate()} ${MONTH_NAMES_FR[mondayObj.getMonth()]} ${mondayObj.getFullYear()}`;
  } else if (mondayObj.getFullYear() === sundayObj.getFullYear()) {
    formattedWeekLabelFr = `Semaine du ${mondayObj.getDate()} ${MONTH_NAMES_FR[mondayObj.getMonth()]} au ${sundayObj.getDate()} ${MONTH_NAMES_FR[sundayObj.getMonth()]} ${mondayObj.getFullYear()}`;
  } else {
    formattedWeekLabelFr = `Semaine du ${mondayObj.getDate()} ${MONTH_NAMES_FR[mondayObj.getMonth()]} ${mondayObj.getFullYear()} au ${sundayObj.getDate()} ${MONTH_NAMES_FR[sundayObj.getMonth()]} ${sundayObj.getFullYear()}`;
  }

  return {
    mondayDateKey: mondayKey,
    sundayDateKey: sundayKey,
    days,
    formattedWeekLabelFr,
    year: mondayObj.getFullYear(),
    month: mondayObj.getMonth() + 1,
  };
}
