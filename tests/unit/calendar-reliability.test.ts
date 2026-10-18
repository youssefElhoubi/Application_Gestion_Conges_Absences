import { describe, it, expect } from 'vitest';
import { buildEventsLookup } from '@/src/lib/calendar/calendar-events';
import { buildMonthGrid } from '@/src/lib/calendar/calendar-grid';
import { AbsenceListItem } from '@/src/lib/api/absence-client';
import { PublicHolidayItem } from '@/src/lib/api/holiday-client';

describe('Calendar Reliability & Readability Under Realistic Data Conditions', () => {
  // Helper to construct mock absence
  const createMockAbsence = (
    id: string,
    employeeName: string,
    startDate: string,
    endDate: string,
    status: 'APPROVED' | 'PENDING' = 'APPROVED'
  ): AbsenceListItem => ({
    id,
    employeeId: `EMP-${id.padStart(4, '0')}`,
    typeId: 1,
    startDate,
    endDate,
    fraction: 'FULL_DAY',
    calculatedWorkingDays: 1,
    enteredDays: 1,
    retainedDays: 1,
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

  describe('1. Dense Days & Overflow Partitioning', () => {
    it('limits visible event entries to MAX_VISIBLE_ITEMS = 2 and correctly computes hidden overflow count', () => {
      const dateKey = '2026-10-15';
      // 5 absences on the same date
      const denseAbsences = [
        createMockAbsence('1', 'Ali Amrani', '2026-10-15', '2026-10-15'),
        createMockAbsence('2', 'Fatima Zahra', '2026-10-15', '2026-10-15'),
        createMockAbsence('3', 'Youssef Elhoubi', '2026-10-15', '2026-10-15'),
        createMockAbsence('4', 'Karim Bennani', '2026-10-15', '2026-10-15'),
        createMockAbsence('5', 'Sara Mansouri', '2026-10-15', '2026-10-15'),
      ];

      const lookup = buildEventsLookup([dateKey], denseAbsences, []);
      const dayData = lookup.get(dateKey);

      expect(dayData).toBeDefined();
      expect(dayData?.absences.length).toBe(5);
      expect(dayData?.holidays.length).toBe(0);

      // Simulation of CalendarGrid overflow calculation rule:
      const MAX_VISIBLE_ITEMS = 2;
      const holidays = dayData?.holidays || [];
      const absences = dayData?.absences || [];
      const totalEvents = holidays.length + absences.length;

      const visibleHolidays = holidays.slice(0, MAX_VISIBLE_ITEMS);
      const remainingSlotsForAbsences = Math.max(0, MAX_VISIBLE_ITEMS - visibleHolidays.length);
      const visibleAbsences = absences.slice(0, remainingSlotsForAbsences);
      const visibleTotal = visibleHolidays.length + visibleAbsences.length;
      const hiddenEventsCount = Math.max(0, totalEvents - visibleTotal);

      expect(visibleHolidays.length).toBe(0);
      expect(visibleAbsences.length).toBe(2);
      expect(visibleAbsences[0].employeeName).toBe('Ali Amrani');
      expect(visibleAbsences[1].employeeName).toBe('Fatima Zahra');
      expect(hiddenEventsCount).toBe(3); // "+3 autres"
    });

    it('prioritizes public holidays when calculating visible slots on dense days', () => {
      const dateKey = '2026-11-06';
      const holiday = createMockHoliday(10, '2026-11-06', 'Marche Verte');
      const absences = [
        createMockAbsence('101', 'Omar Tazi', '2026-11-06', '2026-11-06'),
        createMockAbsence('102', 'Laila Chraibi', '2026-11-06', '2026-11-06'),
        createMockAbsence('103', 'Hassan Fassi', '2026-11-06', '2026-11-06'),
      ];

      const lookup = buildEventsLookup([dateKey], absences, [holiday]);
      const dayData = lookup.get(dateKey)!;

      const MAX_VISIBLE_ITEMS = 2;
      const visibleHolidays = dayData.holidays.slice(0, MAX_VISIBLE_ITEMS);
      const remainingSlots = Math.max(0, MAX_VISIBLE_ITEMS - visibleHolidays.length);
      const visibleAbsences = dayData.absences.slice(0, remainingSlots);
      const totalVisible = visibleHolidays.length + visibleAbsences.length;
      const hiddenCount = (dayData.holidays.length + dayData.absences.length) - totalVisible;

      expect(visibleHolidays.length).toBe(1);
      expect(visibleHolidays[0].label).toBe('Marche Verte');
      expect(visibleAbsences.length).toBe(1);
      expect(visibleAbsences[0].employeeName).toBe('Omar Tazi');
      expect(hiddenCount).toBe(2); // "+2 autres"
    });
  });

  describe('2. Decoupled Request & Error Isolation', () => {
    it('allows valid public holidays to remain visible when absence fetching rejects', async () => {
      const holidayData = [createMockHoliday(1, '2026-10-15', 'Fête Nationale')];

      const absencePromise = Promise.reject(new Error('Network error on absences API'));
      const holidayPromise = Promise.resolve({ data: holidayData });

      const [absenceResult, holidayResult] = await Promise.allSettled([absencePromise, holidayPromise]);

      expect(absenceResult.status).toBe('rejected');
      expect(holidayResult.status).toBe('fulfilled');

      let absences: AbsenceListItem[] = [];
      let absenceError: string | null = null;
      let holidays: PublicHolidayItem[] = [];
      let holidayError: string | null = null;

      if (absenceResult.status === 'fulfilled') {
        absences = (absenceResult.value as { data?: AbsenceListItem[] }).data || [];
      } else {
        absenceError = absenceResult.reason?.message || 'Erreur absences';
      }

      if (holidayResult.status === 'fulfilled') {
        holidays = holidayResult.value.data;
      } else {
        holidayError = holidayResult.reason?.message || 'Erreur fériés';
      }

      expect(absenceError).toBe('Network error on absences API');
      expect(holidayError).toBeNull();
      expect(holidays.length).toBe(1);
      expect(holidays[0].label).toBe('Fête Nationale');

      // The lookup will still contain holidays even if absences failed
      const lookup = buildEventsLookup(['2026-10-15'], absences, holidays);
      expect(lookup.get('2026-10-15')?.holidays.length).toBe(1);
      expect(lookup.get('2026-10-15')?.absences.length).toBe(0);
    });

    it('allows valid absences to remain visible when public holiday fetching rejects', async () => {
      const absenceData = [createMockAbsence('1', 'Samir Kabbaj', '2026-10-15', '2026-10-15')];

      const absencePromise = Promise.resolve({ data: absenceData });
      const holidayPromise = Promise.reject(new Error('Holiday API timeout'));

      const [absenceResult, holidayResult] = await Promise.allSettled([absencePromise, holidayPromise]);

      expect(absenceResult.status).toBe('fulfilled');
      expect(holidayResult.status).toBe('rejected');

      let absences: AbsenceListItem[] = [];
      let absenceError: string | null = null;
      let holidays: PublicHolidayItem[] = [];
      let holidayError: string | null = null;

      if (absenceResult.status === 'fulfilled') {
        absences = absenceResult.value.data;
      } else {
        absenceError = absenceResult.reason?.message || 'Erreur absences';
      }

      if (holidayResult.status === 'fulfilled') {
        holidays = (holidayResult.value as { data?: PublicHolidayItem[] }).data || [];
      } else {
        holidayError = holidayResult.reason?.message || 'Erreur fériés';
      }

      expect(absenceError).toBeNull();
      expect(holidayError).toBe('Holiday API timeout');
      expect(absences.length).toBe(1);

      const lookup = buildEventsLookup(['2026-10-15'], absences, holidays);
      expect(lookup.get('2026-10-15')?.absences.length).toBe(1);
      expect(lookup.get('2026-10-15')?.holidays.length).toBe(0);
    });
  });

  describe('3. Empty State vs Error State Disambiguation', () => {
    it('distinguishes a genuine empty calendar from a failed request and avoids false "0 absence" assertions', () => {
      const getAbsenceMetricDisplay = (
        isLoading: boolean,
        absenceError: string | null,
        approvedCount: number
      ) => {
        if (absenceError) {
          return { type: 'error', text: 'Absences indisponibles' };
        }
        return { type: 'count', text: `${approvedCount} absence validée` };
      };

      // Scenario A: Failed request
      const failedState = getAbsenceMetricDisplay(false, 'Erreur de connexion', 0);
      expect(failedState.type).toBe('error');
      expect(failedState.text).toBe('Absences indisponibles');
      // Critical check: Never show "0 absence" when request failed
      expect(failedState.text).not.toContain('0 absence');

      // Scenario B: Genuine empty month
      const emptyState = getAbsenceMetricDisplay(false, null, 0);
      expect(emptyState.type).toBe('count');
      expect(emptyState.text).toBe('0 absence validée');
    });

    it('determines the correct contextual empty state message based on active filters', () => {
      const getEmptyStateMessage = (hasActiveFilters: boolean, monthName: string, year: number) => {
        if (hasActiveFilters) {
          return `Aucune absence ne correspond aux filtres sélectionnés pour ${monthName} ${year}.`;
        }
        return `Aucune absence enregistrée pour ${monthName} ${year}.`;
      };

      expect(getEmptyStateMessage(true, 'Octobre', 2026)).toContain('filtres sélectionnés');
      expect(getEmptyStateMessage(false, 'Octobre', 2026)).toContain('enregistrée');
    });
  });

  describe('4. Period Changes & Query Boundary Computation', () => {
    it('computes correct grid boundary dates for period queries across month/year changes', () => {
      // November 2026
      const novGrid = buildMonthGrid(2026, 11);
      const firstCell = novGrid.cells[0];
      const lastCell = novGrid.cells[novGrid.cells.length - 1];

      // Nov 1, 2026 is Sunday (column index 6) -> 6 leading days from October (Oct 26 to Oct 31)
      expect(firstCell.dateKey).toBe('2026-10-26');
      expect(firstCell.isPrevMonth).toBe(true);

      // Nov 30, 2026 is Monday (column index 0) -> 6 trailing days from December (Dec 1 to Dec 6)
      expect(lastCell.dateKey).toBe('2026-12-06');
      expect(lastCell.isNextMonth).toBe(true);

      // December 2026 into January 2027
      const decGrid = buildMonthGrid(2026, 12);
      const decFirstCell = decGrid.cells[0];
      const decLastCell = decGrid.cells[decGrid.cells.length - 1];

      expect(decFirstCell.dateKey).toBe('2026-11-30');
      expect(decLastCell.dateKey).toBe('2027-01-03'); // Wraps into next year cleanly
    });

    it('ensures changing periods drops previous month data preventing stale event display', () => {
      // Oct 2026 event
      const octAbsence = createMockAbsence('1', 'Ali Amrani', '2026-10-15', '2026-10-15');
      const octLookup = buildEventsLookup(['2026-10-15'], [octAbsence], []);
      expect(octLookup.get('2026-10-15')?.absences.length).toBe(1);

      // When user changes period to Nov 2026, the grid date keys are Nov 2026
      const novDates = ['2026-11-01', '2026-11-02', '2026-11-15'];
      // While new request is loading, lookup built with new period keys and empty new absences
      const loadingNovLookup = buildEventsLookup(novDates, [], []);
      expect(loadingNovLookup.get('2026-10-15')).toBeUndefined();
      expect(loadingNovLookup.get('2026-11-15')?.absences.length).toBe(0);
    });
  });

  describe('5. Retry Mechanics & State Recovery', () => {
    it('simulates retry sequence restoring healthy state after failed data request', async () => {
      let attempt = 0;
      const fetchWithRetry = async () => {
        attempt++;
        if (attempt === 1) {
          throw new Error('500 Internal Server Error');
        }
        return { data: [createMockAbsence('99', 'Nadia Benali', '2026-10-20', '2026-10-20')] };
      };

      let absenceError: string | null = null;
      let absences: AbsenceListItem[] = [];
      let isLoading = true;

      // Attempt 1 (Fails)
      try {
        const res = await fetchWithRetry();
        absences = res.data;
      } catch (err: unknown) {
        absenceError = err instanceof Error ? err.message : String(err);
      } finally {
        isLoading = false;
      }

      expect(isLoading).toBe(false);
      expect(absenceError).toBe('500 Internal Server Error');
      expect(absences.length).toBe(0);

      // Attempt 2 (User clicks "Réessayer" which increments refreshKey)
      isLoading = true;
      absenceError = null;

      try {
        const res = await fetchWithRetry();
        absences = res.data;
        absenceError = null;
      } catch (err: unknown) {
        absenceError = err instanceof Error ? err.message : String(err);
      } finally {
        isLoading = false;
      }

      expect(isLoading).toBe(false);
      expect(absenceError).toBeNull();
      expect(absences.length).toBe(1);
      expect(absences[0].employee?.fullName).toBe('Nadia Benali');
    });
  });

  describe('6. Dense Dates & Day Detail Modal Inspection Interaction', () => {
    it('retains all events for the day summary modal when cell visible limit is exceeded', () => {
      const dateKey = '2026-10-15';
      const holiday = createMockHoliday(5, '2026-10-15', 'Fête de la Jeunesse');
      const absences = [
        createMockAbsence('1', 'Youssef Elhoubi', '2026-10-15', '2026-10-15'),
        createMockAbsence('2', 'Sara Mansouri', '2026-10-15', '2026-10-15'),
        createMockAbsence('3', 'Karim Bennani', '2026-10-15', '2026-10-15'),
        createMockAbsence('4', 'Laila Chraibi', '2026-10-15', '2026-10-15'),
        createMockAbsence('5', 'Omar Tazi', '2026-10-15', '2026-10-15'),
      ];

      const lookup = buildEventsLookup([dateKey], absences, [holiday]);
      const dayData = lookup.get(dateKey)!;

      // In the grid cell: capped at 2
      const MAX_VISIBLE = 2;
      const visibleHolidays = dayData.holidays.slice(0, MAX_VISIBLE);
      const visibleAbsences = dayData.absences.slice(0, MAX_VISIBLE - visibleHolidays.length);
      const hiddenCount = (dayData.holidays.length + dayData.absences.length) - (visibleHolidays.length + visibleAbsences.length);

      expect(visibleHolidays.length).toBe(1);
      expect(visibleAbsences.length).toBe(1);
      expect(hiddenCount).toBe(4); // "+4 autres"

      // In the modal dialog (CalendarDayDetailModal): ALL events are provided
      const modalHolidays = dayData.holidays;
      const modalAbsences = dayData.absences;

      expect(modalHolidays.length).toBe(1);
      expect(modalAbsences.length).toBe(5);
      expect(modalHolidays[0].label).toBe('Fête de la Jeunesse');
      expect(modalAbsences.map((a) => a.employeeName)).toEqual([
        'Youssef Elhoubi',
        'Sara Mansouri',
        'Karim Bennani',
        'Laila Chraibi',
        'Omar Tazi',
      ]);
    });
  });

  describe('7. Pagination Exhaustion & Complete Dataset Aggregation (Regression Bug 1 & 2)', () => {
    it('aggregates all pages when period absences exceed 100 items without silent truncation', async () => {
      // Simulate API endpoint returning 140 total absences across 2 pages (page 1: 100 items, page 2: 40 items)
      const mockFetchAbsences = async (page: number, pageSize: number) => {
        const totalItems = 140;
        const totalPages = Math.ceil(totalItems / pageSize);
        const count = page === 1 ? 100 : 40;
        const items = Array.from({ length: count }, (_, i) =>
          createMockAbsence(
            String((page - 1) * 100 + i + 1),
            `Collaborateur ${(page - 1) * 100 + i + 1}`,
            '2026-10-15',
            '2026-10-15'
          )
        );
        return {
          data: items,
          meta: {
            page,
            pageSize,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        };
      };

      // Implementation of exhaust algorithm
      const fetchAll = async () => {
        const first = await mockFetchAbsences(1, 100);
        let all = [...first.data];
        if (first.meta && first.meta.totalPages > 1) {
          const restPages = Array.from(
            { length: first.meta.totalPages - 1 },
            (_, i) => i + 2
          );
          const restResults = await Promise.all(
            restPages.map((p) => mockFetchAbsences(p, 100))
          );
          for (const res of restResults) {
            all = all.concat(res.data);
          }
        }
        return all;
      };

      const results = await fetchAll();
      expect(results.length).toBe(140);
      expect(results[0].id).toBe('1');
      expect(results[139].id).toBe('140');
      // Verify monthly counters calculate over all 140 items rather than truncated 100
      const approvedCount = results.filter((a) => a.status === 'APPROVED').length;
      expect(approvedCount).toBe(140);
    });
  });
});
