/**
 * Calendar Grid Calculation Engine
 * Pure, timezone-safe date math for monthly calendar grids.
 * Follows Moroccan / ISO 8601 week convention (Monday to Sunday).
 */

export interface CalendarGridCell {
  dateKey: string; // ISO Date-only format: YYYY-MM-DD
  dayOfMonth: number;
  month: number; // 1 to 12
  year: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday (JS convention)
  weekColumnIndex: number; // 0 = Monday, 1 = Tuesday, ... 6 = Sunday (ISO / Moroccan standard)
  isCurrentMonth: boolean;
  isPrevMonth: boolean;
  isNextMonth: boolean;
  isToday: boolean;
  isWeekend: boolean; // Sunday or Saturday (weekly rest)
  dayNameFr: string;
  formattedDateFr: string;
}

export interface MonthGridResult {
  year: number;
  month: number;
  monthNameFr: string;
  daysInMonth: number;
  cells: CalendarGridCell[];
  totalWeeks: number;
}

export const MONTH_NAMES_FR = [
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
] as const;

export const WEEKDAYS_FR = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
] as const;

export const WEEKDAYS_SHORT_FR = [
  'Lun',
  'Mar',
  'Mer',
  'Jeu',
  'Ven',
  'Sam',
  'Dim',
] as const;

/**
 * Creates a normalized date-only string (YYYY-MM-DD) without timezone distortion.
 */
export function toDateKey(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses a YYYY-MM-DD string into year, month, and day integers.
 */
export function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const parts = dateKey.split('T')[0].split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10),
  };
}

/**
 * Computes adjacent month and year for forward and backward navigation.
 * Properly wraps across year boundaries (Jan -> Dec prev year, Dec -> Jan next year).
 */
export function getAdjacentMonth(
  year: number,
  month: number,
  direction: 'prev' | 'next'
): { year: number; month: number } {
  if (direction === 'prev') {
    return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  } else {
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  }
}

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
