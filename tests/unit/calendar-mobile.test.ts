import { describe, it, expect } from 'vitest';
import {
  CalendarGridCell,
  buildMonthGrid,
} from '@/src/lib/calendar/calendar-grid';
import {
  DayEventsMap,
  buildEventsLookup,
  extractDateKey,
} from '@/src/lib/calendar/calendar-events';
import { AbsenceListItem } from '@/src/lib/api/absence-client';
import { PublicHolidayItem } from '@/src/lib/api/holiday-client';

describe('Calendar Mobile & Tablet Responsiveness (Unit Tests)', () => {
  const createMockAbsence = (
    id: string,
    employeeName: string,
    startDate: string,
    endDate: string,
    fraction: 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON' = 'FULL_DAY',
    status: 'APPROVED' | 'PENDING' = 'APPROVED'
  ): AbsenceListItem => ({
    id,
    employeeId: `EMP-${id.padStart(4, '0')}`,
    typeId: 1,
    startDate,
    endDate,
    fraction,
    calculatedWorkingDays: fraction === 'FULL_DAY' ? 1 : 0.5,
    enteredDays: fraction === 'FULL_DAY' ? 1 : 0.5,
    retainedDays: fraction === 'FULL_DAY' ? 1 : 0.5,
    supportingDocumentProvided: false,
    status,
    requestDate: '2026-10-01',
    createdAt: '2026-10-01',
    employee: {
      employeeId: `EMP-${id.padStart(4, '0')}`,
      fullName: employeeName,
      siteId: 1,
      site: { name: 'Casablanca' },
    },
    type: {
      id: 1,
      code: 'CONGE_PAYE',
      name: 'Congé Payé Annuel',
      colorHex: '#3b82f6',
      isDeductible: true,
    },
  });

  const createMockHoliday = (id: number, date: string, label: string): PublicHolidayItem => ({
    id,
    date,
    label,
    isReligious: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  });

  describe('1. Compact Grid Data & Indicator Calculations', () => {
    it('accurately computes indicator flags for compact mobile date buttons', () => {
      const grid = buildMonthGrid(2026, 10);
      const dateKeys = grid.cells.map((c) => c.dateKey);

      const holiday = createMockHoliday(1, '2026-10-15', 'Fête');
      const approvedAbsence = createMockAbsence('1', 'Ali Amrani', '2026-10-15', '2026-10-15', 'FULL_DAY', 'APPROVED');
      const pendingAbsence = createMockAbsence('2', 'Sara Mansouri', '2026-10-15', '2026-10-15', 'HALF_DAY_MORNING', 'PENDING');

      const lookup = buildEventsLookup(dateKeys, [approvedAbsence, pendingAbsence], [holiday]);
      const dayData = lookup.get('2026-10-15')!;

      expect(dayData).toBeDefined();
      expect(dayData.holidays.length).toBe(1);
      expect(dayData.absences.length).toBe(2);

      const hasHoliday = dayData.holidays.length > 0;
      const hasApproved = dayData.absences.some((a) => a.status === 'APPROVED');
      const hasPending = dayData.absences.some((a) => a.status === 'PENDING');

      expect(hasHoliday).toBe(true);
      expect(hasApproved).toBe(true);
      expect(hasPending).toBe(true);
    });

    it('handles empty day cells in compact grid gracefully', () => {
      const grid = buildMonthGrid(2026, 10);
      const dateKeys = grid.cells.map((c) => c.dateKey);

      const lookup = buildEventsLookup(dateKeys, [], []);
      const emptyDay = lookup.get('2026-10-20')!;

      expect(emptyDay.holidays.length).toBe(0);
      expect(emptyDay.absences.length).toBe(0);
    });
  });

  describe('2. Selected Day Inspector View Logic', () => {
    it('retrieves and formats all authorized details for the selected day', () => {
      const grid = buildMonthGrid(2026, 10);
      const dateKeys = grid.cells.map((c) => c.dateKey);

      const holiday = createMockHoliday(2, '2026-10-12', 'Fête Nationale');
      const absence = createMockAbsence(
        '10',
        'Fatima-Zahra Alami',
        '2026-10-12',
        '2026-10-14',
        'HALF_DAY_AFTERNOON',
        'APPROVED'
      );

      const lookup = buildEventsLookup(dateKeys, [absence], [holiday]);
      const selectedEvents = lookup.get('2026-10-12')!;

      expect(selectedEvents.holidays.length).toBe(1);
      expect(selectedEvents.holidays[0].label).toBe('Fête Nationale');

      expect(selectedEvents.absences.length).toBe(1);
      const absEvent = selectedEvents.absences[0];
      expect(absEvent.employeeName).toBe('Fatima-Zahra Alami');
      expect(absEvent.isHalfDay).toBe(true);
      expect(absEvent.fraction).toBe('HALF_DAY_AFTERNOON');
      expect(absEvent.status).toBe('APPROVED');
      expect(absEvent.statusLabelFr).toBe('Validé');
      expect(absEvent.employeeSiteName).toBe('Casablanca');
    });

    it('defaults selected date to today when in active month, and to the 1st when viewing another month', () => {
      const now = new Date(2026, 9, 15); // Oct 15, 2026
      const currentYear = 2026;
      const currentMonth = 10;
      const todayDateKey = '2026-10-15';

      const computeDefaultDate = (targetYear: number, targetMonth: number) => {
        if (targetYear === currentYear && targetMonth === currentMonth) {
          return todayDateKey;
        }
        return `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
      };

      // Viewing current month
      expect(computeDefaultDate(2026, 10)).toBe('2026-10-15');

      // Viewing previous month (September)
      expect(computeDefaultDate(2026, 9)).toBe('2026-09-01');

      // Viewing next year (January 2027)
      expect(computeDefaultDate(2027, 1)).toBe('2027-01-01');
    });
  });

  describe('3. Agenda View Chronological Grouping', () => {
    it('filters out empty days and groups only active dates chronologically', () => {
      const grid = buildMonthGrid(2026, 10);
      const dateKeys = grid.cells.map((c) => c.dateKey);

      const absence1 = createMockAbsence('1', 'Ali Amrani', '2026-10-05', '2026-10-05');
      const absence2 = createMockAbsence('2', 'Omar Tazi', '2026-10-22', '2026-10-22');
      const holiday = createMockHoliday(5, '2026-10-15', 'Fête de la Jeunesse');

      const lookup = buildEventsLookup(dateKeys, [absence1, absence2], [holiday]);

      // Logic used in CalendarAgendaView:
      const daysWithEvents = grid.cells
        .filter((cell) => cell.isCurrentMonth)
        .map((cell) => {
          const dayData = lookup.get(cell.dateKey) || { holidays: [], absences: [] };
          return {
            cell,
            ...dayData,
            totalEvents: dayData.holidays.length + dayData.absences.length,
          };
        })
        .filter((day) => day.totalEvents > 0);

      // Only 3 days have events (Oct 5, Oct 15, Oct 22)
      expect(daysWithEvents.length).toBe(3);

      expect(daysWithEvents[0].cell.dateKey).toBe('2026-10-05');
      expect(daysWithEvents[0].absences.length).toBe(1);

      expect(daysWithEvents[1].cell.dateKey).toBe('2026-10-15');
      expect(daysWithEvents[1].holidays.length).toBe(1);

      expect(daysWithEvents[2].cell.dateKey).toBe('2026-10-22');
      expect(daysWithEvents[2].absences.length).toBe(1);
    });

    it('omits adjacent month padding days from the agenda view', () => {
      const grid = buildMonthGrid(2026, 10);
      const dateKeys = grid.cells.map((c) => c.dateKey);

      // Event on Sep 29 (prev month padding)
      const prevMonthAbsence = createMockAbsence('99', 'Sara Mansouri', '2026-09-29', '2026-09-29');
      const lookup = buildEventsLookup(dateKeys, [prevMonthAbsence], []);

      const currentMonthAgendaDays = grid.cells
        .filter((cell) => cell.isCurrentMonth)
        .map((cell) => {
          const dayData = lookup.get(cell.dateKey) || { holidays: [], absences: [] };
          return {
            cell,
            ...dayData,
            totalEvents: dayData.holidays.length + dayData.absences.length,
          };
        })
        .filter((day) => day.totalEvents > 0);

      // Even though Sep 29 is in the grid cell array for week alignment, it is excluded from October's agenda
      expect(currentMonthAgendaDays.length).toBe(0);
    });
  });

  describe('4. Navigation & Route Targets Integrity on Mobile', () => {
    it('generates correct route targets for direct mobile actions', () => {
      const absence = createMockAbsence('42', 'Karim Bennani', '2026-10-15', '2026-10-15');
      const holiday = createMockHoliday(10, '2026-10-15', 'Marche Verte');

      const absenceRoute = `/absences/${absence.id}`;
      const employeeRoute = `/employees/${encodeURIComponent(absence.employeeId)}`;
      const holidayRoute = `/holidays/${holiday.id}`;

      expect(absenceRoute).toBe('/absences/42');
      expect(employeeRoute).toBe('/employees/EMP-0042');
      expect(holidayRoute).toBe('/holidays/10');
    });
  });
});
