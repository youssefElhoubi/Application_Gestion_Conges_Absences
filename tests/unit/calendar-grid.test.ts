import { describe, it, expect } from 'vitest';
import {
  buildMonthGrid,
  getAdjacentMonth,
  toDateKey,
  parseDateKey,
  MONTH_NAMES_FR,
  WEEKDAYS_FR,
  WEEKDAYS_SHORT_FR,
} from '@/src/lib/calendar/calendar-grid';

describe('Calendar Grid Engine (Unit Tests)', () => {
  it('correctly maps date keys without timezone drift', () => {
    const key = toDateKey(2026, 10, 15);
    expect(key).toBe('2026-10-15');

    const parsed = parseDateKey(key);
    expect(parsed).toEqual({ year: 2026, month: 10, day: 15 });
  });

  it('correctly computes adjacent months and wraps year boundaries', () => {
    // Regular forward and backward
    expect(getAdjacentMonth(2026, 5, 'prev')).toEqual({ year: 2026, month: 4 });
    expect(getAdjacentMonth(2026, 5, 'next')).toEqual({ year: 2026, month: 6 });

    // Boundary wrap: January -> December previous year
    expect(getAdjacentMonth(2026, 1, 'prev')).toEqual({ year: 2025, month: 12 });

    // Boundary wrap: December -> January next year
    expect(getAdjacentMonth(2026, 12, 'next')).toEqual({ year: 2027, month: 1 });
  });

  it('builds October 2026 calendar grid with correct weekday alignment and padding', () => {
    const today = new Date(2026, 9, 15); // Oct 15, 2026
    const grid = buildMonthGrid(2026, 10, today);

    expect(grid.year).toBe(2026);
    expect(grid.month).toBe(10);
    expect(grid.monthNameFr).toBe('Octobre');
    expect(grid.daysInMonth).toBe(31);

    // Total cells must be a multiple of 7
    expect(grid.cells.length % 7).toBe(0);

    // Oct 1, 2026 is Thursday -> Monday-start index 3 -> 3 leading days from September (28, 29, 30)
    const prevDays = grid.cells.filter((c) => c.isPrevMonth);
    expect(prevDays.length).toBe(3);
    expect(prevDays[0].dateKey).toBe('2026-09-28');
    expect(prevDays[0].weekColumnIndex).toBe(0); // Monday
    expect(prevDays[2].dateKey).toBe('2026-09-30');

    // First day of current month
    const firstDay = grid.cells.find((c) => c.dateKey === '2026-10-01');
    expect(firstDay).toBeDefined();
    expect(firstDay?.weekColumnIndex).toBe(3); // Thursday
    expect(firstDay?.isCurrentMonth).toBe(true);

    // Last day of current month (Oct 31, 2026 is Saturday -> column 5)
    const lastDay = grid.cells.find((c) => c.dateKey === '2026-10-31');
    expect(lastDay).toBeDefined();
    expect(lastDay?.weekColumnIndex).toBe(5); // Saturday
    expect(lastDay?.isCurrentMonth).toBe(true);

    // Trailing days from November: 1 day (Nov 1, Sunday)
    const nextDays = grid.cells.filter((c) => c.isNextMonth);
    expect(nextDays.length).toBe(1);
    expect(nextDays[0].dateKey).toBe('2026-11-01');
    expect(nextDays[0].weekColumnIndex).toBe(6); // Sunday

    // Total cells for Oct 2026: 3 + 31 + 1 = 35 (5 full weeks)
    expect(grid.cells.length).toBe(35);
    expect(grid.totalWeeks).toBe(5);

    // Verify today's date detection
    const todayCell = grid.cells.find((c) => c.dateKey === '2026-10-15');
    expect(todayCell?.isToday).toBe(true);
    expect(todayCell?.isCurrentMonth).toBe(true);

    // Verify other cells are not marked today
    const otherCell = grid.cells.find((c) => c.dateKey === '2026-10-14');
    expect(otherCell?.isToday).toBe(false);
  });

  it('correctly handles February in leap years vs non-leap years', () => {
    // February 2024 (Leap year -> 29 days)
    const leapFeb = buildMonthGrid(2024, 2);
    expect(leapFeb.daysInMonth).toBe(29);
    const feb29 = leapFeb.cells.find((c) => c.dateKey === '2024-02-29');
    expect(feb29).toBeDefined();
    expect(feb29?.isCurrentMonth).toBe(true);

    // February 2026 (Non-leap year -> 28 days)
    const nonLeapFeb = buildMonthGrid(2026, 2);
    expect(nonLeapFeb.daysInMonth).toBe(28);
    const feb29NonLeap = nonLeapFeb.cells.find((c) => c.dateKey === '2026-02-29');
    expect(feb29NonLeap).toBeUndefined();
  });

  it('guarantees every row in the grid starts on Monday and ends on Sunday', () => {
    const grid = buildMonthGrid(2026, 10);
    const totalWeeks = grid.cells.length / 7;

    for (let w = 0; w < totalWeeks; w++) {
      const weekStart = grid.cells[w * 7];
      const weekEnd = grid.cells[w * 7 + 6];

      expect(weekStart.weekColumnIndex).toBe(0); // Monday
      expect(weekStart.dayOfWeek).toBe(1); // Monday in JS
      expect(weekEnd.weekColumnIndex).toBe(6); // Sunday
      expect(weekEnd.dayOfWeek).toBe(0); // Sunday in JS
    }
  });

  it('provides complete French day and month constants', () => {
    expect(MONTH_NAMES_FR.length).toBe(12);
    expect(MONTH_NAMES_FR[0]).toBe('Janvier');
    expect(MONTH_NAMES_FR[11]).toBe('Décembre');

    expect(WEEKDAYS_FR.length).toBe(7);
    expect(WEEKDAYS_FR[0]).toBe('Lundi');
    expect(WEEKDAYS_FR[6]).toBe('Dimanche');

    expect(WEEKDAYS_SHORT_FR.length).toBe(7);
    expect(WEEKDAYS_SHORT_FR[0]).toBe('Lun');
    expect(WEEKDAYS_SHORT_FR[6]).toBe('Dim');
  });
});
