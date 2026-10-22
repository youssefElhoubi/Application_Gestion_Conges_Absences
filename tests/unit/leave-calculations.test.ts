import { describe, it, expect } from 'vitest';
import { WorkingDaysCalculator } from '@/src/domain/calculations/working-days.calculator';

describe('Unit: Working Days & Duration Calculations', () => {
  it('Scenario 1: Start date equals end date (Single working day)', () => {
    const monday = new Date('2026-10-19'); // Monday
    const result = WorkingDaysCalculator.calculate({
      startDate: monday,
      endDate: monday,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0], // Sunday
      publicHolidays: [],
    });

    expect(result.totalCalendarDays).toBe(1);
    expect(result.calculatedWorkingDays).toBe(1);
    expect(result.excludedHolidaysCount).toBe(0);
    expect(result.excludedWeeklyRestDaysCount).toBe(0);
  });

  it('Scenario 2: Multiple consecutive working days (Monday to Friday)', () => {
    const start = new Date('2026-10-19'); // Monday
    const end = new Date('2026-10-23');   // Friday
    const result = WorkingDaysCalculator.calculate({
      startDate: start,
      endDate: end,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0], // Sunday
      publicHolidays: [],
    });

    expect(result.totalCalendarDays).toBe(5);
    expect(result.calculatedWorkingDays).toBe(5);
  });

  it('Scenario 3: Period spanning weekend / weekly rest day (Thursday to Tuesday)', () => {
    const thursday = new Date('2026-10-22');
    const tuesday = new Date('2026-10-27');
    const result = WorkingDaysCalculator.calculate({
      startDate: thursday,
      endDate: tuesday,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0], // Sunday
      publicHolidays: [],
    });

    // Thu, Fri, Sat, Sun(rest), Mon, Tue = 6 calendar days, 5 working days
    expect(result.totalCalendarDays).toBe(6);
    expect(result.calculatedWorkingDays).toBe(5);
    expect(result.excludedWeeklyRestDaysCount).toBe(1);
  });

  it('Scenario 4: Public holiday inside a leave period (Excluded from working days)', () => {
    const start = new Date('2026-11-05');
    const end = new Date('2026-11-09');
    const greenMarchHoliday = new Date('2026-11-06'); // Marche Verte

    const result = WorkingDaysCalculator.calculate({
      startDate: start,
      endDate: end,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0], // Sunday Nov 8
      publicHolidays: [greenMarchHoliday],
    });

    // Thu Nov 5 (work), Fri Nov 6 (holiday), Sat Nov 7 (work), Sun Nov 8 (rest), Mon Nov 9 (work)
    expect(result.totalCalendarDays).toBe(5);
    expect(result.calculatedWorkingDays).toBe(3);
    expect(result.excludedHolidaysCount).toBe(1);
    expect(result.excludedWeeklyRestDaysCount).toBe(1);
  });

  it('Scenario 5: Period containing both weekends and public holidays without double counting', () => {
    const start = new Date('2026-11-06'); // Fri
    const end = new Date('2026-11-09');   // Mon
    const sundayHoliday = new Date('2026-11-08'); // Holiday falls on Sunday

    const result = WorkingDaysCalculator.calculate({
      startDate: start,
      endDate: end,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0], // Sunday
      publicHolidays: [sundayHoliday],
    });

    // Fri(work), Sat(work), Sun(holiday on Sunday -> excluded once), Mon(work)
    expect(result.totalCalendarDays).toBe(4);
    expect(result.calculatedWorkingDays).toBe(3);
    expect(result.excludedHolidaysCount).toBe(1);
    expect(result.excludedWeeklyRestDaysCount).toBe(0); // Not double counted!
  });

  it('Scenario 6: Half-day request produces 0.5 days on a working day', () => {
    const wednesday = new Date('2026-10-21');
    const result = WorkingDaysCalculator.calculate({
      startDate: wednesday,
      endDate: wednesday,
      fraction: 'HALF_DAY_MORNING',
      weeklyRestDays: [0],
      publicHolidays: [],
    });

    expect(result.totalCalendarDays).toBe(1);
    expect(result.calculatedWorkingDays).toBe(0.5);
  });

  it('Scenario 7: Half-day requested on a weekly rest day produces 0.0 days', () => {
    const sunday = new Date('2026-10-25');
    const result = WorkingDaysCalculator.calculate({
      startDate: sunday,
      endDate: sunday,
      fraction: 'HALF_DAY_AFTERNOON',
      weeklyRestDays: [0],
      publicHolidays: [],
    });

    expect(result.calculatedWorkingDays).toBe(0.0);
  });

  it('Scenario 8: Year-end boundary (Dec 29, 2026 to Jan 4, 2027) with New Year Holiday', () => {
    const start = new Date('2026-12-29'); // Tue
    const end = new Date('2027-01-04');   // Mon
    const newYearHoliday = new Date('2027-01-01'); // Friday

    const result = WorkingDaysCalculator.calculate({
      startDate: start,
      endDate: end,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0], // Sunday Jan 3
      publicHolidays: [newYearHoliday],
    });

    // Dec 29(w), Dec 30(w), Dec 31(w), Jan 1(h), Jan 2(w), Jan 3(rest), Jan 4(w) = 7 days, 5 working
    expect(result.totalCalendarDays).toBe(7);
    expect(result.calculatedWorkingDays).toBe(5);
    expect(result.excludedHolidaysCount).toBe(1);
    expect(result.excludedWeeklyRestDaysCount).toBe(1);
  });

  it('Scenario 9: Leap-year calculation (February 29, 2028)', () => {
    const feb28 = new Date('2028-02-28'); // Monday
    const march1 = new Date('2028-03-01'); // Wednesday

    const result = WorkingDaysCalculator.calculate({
      startDate: feb28,
      endDate: march1,
      fraction: 'FULL_DAY',
      weeklyRestDays: [0],
      publicHolidays: [],
    });

    // Feb 28, Feb 29 (leap!), Mar 1 = 3 working days
    expect(result.totalCalendarDays).toBe(3);
    expect(result.calculatedWorkingDays).toBe(3);
  });

  it('Scenario 10: Site-specific workweek variation (Friday & Saturday rest: [5, 6])', () => {
    const wednesday = new Date('2026-10-21');
    const sunday = new Date('2026-10-25');

    const result = WorkingDaysCalculator.calculate({
      startDate: wednesday,
      endDate: sunday,
      fraction: 'FULL_DAY',
      weeklyRestDays: [5, 6], // Fri & Sat rest
      publicHolidays: [],
    });

    // Wed(w), Thu(w), Fri(rest), Sat(rest), Sun(w) = 5 days, 3 working days
    expect(result.totalCalendarDays).toBe(5);
    expect(result.calculatedWorkingDays).toBe(3);
    expect(result.excludedWeeklyRestDaysCount).toBe(2);
  });
});
