import { describe, it, expect } from 'vitest';
import { WorkingDaysCalculator } from '@/src/domain/calculations/working-days.calculator';
import { MonthlyCalendarCalculator } from '@/src/domain/calculations/monthly-calendar.calculator';

describe('Unit: Public Holiday Exclusions & Calendar Generation', () => {
  it('Scenario 1: Single public holiday falling inside leave period', () => {
    // Nov 5 (Thu) to Nov 9 (Mon) 2026. Holiday on Nov 6 (Marche Verte).
    const start = new Date('2026-11-05');
    const end = new Date('2026-11-09');
    const greenMarch = new Date('2026-11-06');

    const result = WorkingDaysCalculator.calculate({
      startDate: start,
      endDate: end,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0], // Sunday Nov 8
      publicHolidays: [greenMarch],
    });

    // Thu(w), Fri(holiday), Sat(w), Sun(rest), Mon(w)
    // 5 calendar days, 1 holiday, 1 rest day = 3 working days
    expect(result.totalCalendarDays).toBe(5);
    expect(result.excludedHolidaysCount).toBe(1);
    expect(result.excludedWeeklyRestDaysCount).toBe(1);
    expect(result.calculatedWorkingDays).toBe(3);
  });

  it('Scenario 2: Public holiday outside leave period has zero effect', () => {
    const start = new Date('2026-10-12'); // Mon
    const end = new Date('2026-10-16');   // Fri
    const holidayOutside = new Date('2026-11-06'); // Next month

    const result = WorkingDaysCalculator.calculate({
      startDate: start,
      endDate: end,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0],
      publicHolidays: [holidayOutside],
    });

    expect(result.totalCalendarDays).toBe(5);
    expect(result.excludedHolidaysCount).toBe(0);
    expect(result.calculatedWorkingDays).toBe(5);
  });

  it('Scenario 3: Public holiday falling on weekly rest day is NOT double-subtracted', () => {
    // Period: Fri Nov 6 to Mon Nov 9 (4 calendar days)
    // Sunday is weekly rest (Nov 8) AND holiday also falls on Sunday Nov 8
    const start = new Date('2026-11-06');
    const end = new Date('2026-11-09');
    const sundayHoliday = new Date('2026-11-08');

    const result = WorkingDaysCalculator.calculate({
      startDate: start,
      endDate: end,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0], // Sunday
      publicHolidays: [sundayHoliday],
    });

    // Fri(w), Sat(w), Sun(holiday on Sunday - deducted once only), Mon(w)
    expect(result.totalCalendarDays).toBe(4);
    expect(result.excludedHolidaysCount).toBe(1);
    expect(result.excludedWeeklyRestDaysCount).toBe(0); // Not deducted twice
    expect(result.calculatedWorkingDays).toBe(3);
  });

  it('Scenario 4: Multiple public holidays in one period', () => {
    // Nov 6 (Marche Verte) and Nov 18 (Fête de l'Indépendance)
    // Period: Nov 5 to Nov 20, 2026
    const start = new Date('2026-11-05'); // Thu
    const end = new Date('2026-11-20');   // Fri (16 calendar days)
    const h1 = new Date('2026-11-06');   // Fri
    const h2 = new Date('2026-11-18');   // Wed

    const result = WorkingDaysCalculator.calculate({
      startDate: start,
      endDate: end,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0], // Sundays: Nov 8, Nov 15 = 2 Sundays
      publicHolidays: [h1, h2],
    });

    // 16 calendar days - 2 Sundays - 2 Holidays = 12 working days
    expect(result.totalCalendarDays).toBe(16);
    expect(result.excludedHolidaysCount).toBe(2);
    expect(result.excludedWeeklyRestDaysCount).toBe(2);
    expect(result.calculatedWorkingDays).toBe(12);
  });

  it('Scenario 5: Duplicate holiday dates in input list are deduplicated', () => {
    const start = new Date('2026-11-05');
    const end = new Date('2026-11-09');
    // Same holiday passed twice
    const h1 = new Date('2026-11-06');
    const h1Duplicate = new Date('2026-11-06');

    const result = WorkingDaysCalculator.calculate({
      startDate: start,
      endDate: end,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0],
      publicHolidays: [h1, h1Duplicate],
    });

    expect(result.excludedHolidaysCount).toBe(1);
    expect(result.calculatedWorkingDays).toBe(3);
  });

  it('Scenario 6: Year-boundary holiday (Dec 31 to Jan 2 with Jan 1 New Year)', () => {
    const start = new Date('2026-12-31'); // Thu
    const end = new Date('2027-01-02');   // Sat
    const newYear = new Date('2027-01-01'); // Fri

    const result = WorkingDaysCalculator.calculate({
      startDate: start,
      endDate: end,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0],
      publicHolidays: [newYear],
    });

    // Dec 31(w), Jan 1(holiday), Jan 2(w) = 3 calendar days, 1 holiday, 2 working days
    expect(result.totalCalendarDays).toBe(3);
    expect(result.excludedHolidaysCount).toBe(1);
    expect(result.calculatedWorkingDays).toBe(2);
  });

  it('Scenario 7: Empty public holiday calendar processes standard workweek', () => {
    const start = new Date('2026-10-19'); // Mon
    const end = new Date('2026-10-25');   // Sun
    const result = WorkingDaysCalculator.calculate({
      startDate: start,
      endDate: end,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0],
      publicHolidays: [],
    });

    expect(result.totalCalendarDays).toBe(7);
    expect(result.excludedHolidaysCount).toBe(0);
    expect(result.excludedWeeklyRestDaysCount).toBe(1);
    expect(result.calculatedWorkingDays).toBe(6);
  });

  it('Scenario 8: Monthly Calendar Calculator classifies public holidays correctly', () => {
    const calendar = MonthlyCalendarCalculator.generate({
      year: 2026,
      month: 11, // November (30 days)
      siteContext: {
        siteId: 1,
        weeklyRestDays: [0], // Sundays
      },
      publicHolidays: [
        { date: new Date('2026-11-06'), label: 'Marche Verte', isReligious: false },
        { date: new Date('2026-11-18'), label: 'Fête de l’Indépendance', isReligious: false },
      ],
      absences: [],
      holidayCredits: [],
      totalSiteEmployeesCount: 10,
    });

    expect(calendar.summary.totalCalendarDays).toBe(30);
    expect(calendar.summary.totalPublicHolidays).toBe(2);
    // Find Nov 6 cell
    const nov6Cell = calendar.days.find((d) => d.date === '2026-11-06');
    expect(nov6Cell?.dayClassification).toBe('PUBLIC_HOLIDAY');
    expect(nov6Cell?.isPublicHoliday).toBe(true);
    expect(nov6Cell?.publicHoliday?.label).toBe('Marche Verte');
  });
});
