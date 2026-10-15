import { describe, it, expect } from 'vitest';
import {
  parseFilterState,
  parseCalendarUrlState,
  buildFilterQueryString,
  DEFAULT_CALENDAR_FILTERS,
} from '@/src/lib/calendar/calendar-filters';

describe('Absence Calendar URL State & Deep-link Engine (Unit Tests)', () => {
  const referenceDate = new Date('2026-10-15T10:00:00Z');

  describe('1. parseFilterState & Safe Normalization', () => {
    it('returns default filter state when search params are empty', () => {
      const sp = new URLSearchParams('');
      const filters = parseFilterState(sp);
      expect(filters).toEqual(DEFAULT_CALENDAR_FILTERS);
    });

    it('parses valid multi-criteria filter params accurately', () => {
      const sp = new URLSearchParams('search=Fatima&employeeId=EMP-0101&siteId=1&typeId=2&status=APPROVED');
      const filters = parseFilterState(sp);
      expect(filters.search).toBe('Fatima');
      expect(filters.employeeId).toBe('EMP-0101');
      expect(filters.siteId).toBe('1');
      expect(filters.typeId).toBe('2');
      expect(filters.status).toBe('APPROVED');
    });

    it('safely normalizes invalid or malicious siteId to "all"', () => {
      const sp1 = new URLSearchParams('siteId=invalid');
      expect(parseFilterState(sp1).siteId).toBe('all');

      const sp2 = new URLSearchParams('siteId=-5');
      expect(parseFilterState(sp2).siteId).toBe('all');

      const sp3 = new URLSearchParams('siteId=12;DROP TABLE');
      expect(parseFilterState(sp3).siteId).toBe('all');
    });

    it('safely normalizes invalid typeId to "all"', () => {
      const sp1 = new URLSearchParams('typeId=abc');
      expect(parseFilterState(sp1).typeId).toBe('all');

      const sp2 = new URLSearchParams('typeId=-99');
      expect(parseFilterState(sp2).typeId).toBe('all');
    });

    it('safely normalizes invalid or unrecognized status to "ALL"', () => {
      const sp1 = new URLSearchParams('status=UNKNOWN_STATUS');
      expect(parseFilterState(sp1).status).toBe('ALL');

      const sp2 = new URLSearchParams('status=deleted');
      expect(parseFilterState(sp2).status).toBe('ALL');
    });

    it('handles uppercase and lowercase status inputs safely', () => {
      const sp = new URLSearchParams('status=pending');
      expect(parseFilterState(sp).status).toBe('PENDING');
    });
  });

  describe('2. parseCalendarUrlState (Deep-linking, Periods, Dates & Views)', () => {
    it('extracts year and month from URL with valid numbers', () => {
      const sp = new URLSearchParams('year=2027&month=5');
      const state = parseCalendarUrlState(sp, referenceDate);
      expect(state.year).toBe(2027);
      expect(state.month).toBe(5);
      expect(state.view).toBe('grid');
      expect(state.date).toBeUndefined();
    });

    it('falls back to referenceDate when year or month are out of bounds or invalid', () => {
      const sp = new URLSearchParams('year=1850&month=15');
      const state = parseCalendarUrlState(sp, referenceDate);
      expect(state.year).toBe(2026);
      expect(state.month).toBe(10);
    });

    it('extracts date parameter when valid YYYY-MM-DD is supplied', () => {
      const sp = new URLSearchParams('date=2026-11-18');
      const state = parseCalendarUrlState(sp, referenceDate);
      expect(state.date).toBe('2026-11-18');
      // When year/month omitted, automatically inferred from date!
      expect(state.year).toBe(2026);
      expect(state.month).toBe(11);
    });

    it('ignores invalid date parameters safely without crashing', () => {
      const sp = new URLSearchParams('date=invalid-date-format');
      const state = parseCalendarUrlState(sp, referenceDate);
      expect(state.date).toBeUndefined();
      expect(state.year).toBe(2026);
      expect(state.month).toBe(10);
    });

    it('parses valid view mode parameter (grid, week, agenda)', () => {
      const spWeek = new URLSearchParams('view=week');
      expect(parseCalendarUrlState(spWeek, referenceDate).view).toBe('week');

      const spAgenda = new URLSearchParams('view=agenda');
      expect(parseCalendarUrlState(spAgenda, referenceDate).view).toBe('agenda');

      const spGrid = new URLSearchParams('view=grid');
      expect(parseCalendarUrlState(spGrid, referenceDate).view).toBe('grid');

      const spInvalid = new URLSearchParams('view=custom_view');
      expect(parseCalendarUrlState(spInvalid, referenceDate).view).toBe('grid');
    });

    it('combines deep-link date with view mode and employee filter (e.g., from Employee Profile)', () => {
      const sp = new URLSearchParams('employeeId=EMP-0101&view=week&date=2026-10-15');
      const state = parseCalendarUrlState(sp, referenceDate);
      expect(state.employeeId).toBe('EMP-0101');
      expect(state.view).toBe('week');
      expect(state.date).toBe('2026-10-15');
      expect(state.year).toBe(2026);
      expect(state.month).toBe(10);
    });
  });

  describe('3. buildFilterQueryString (URL Composition & State Preservation)', () => {
    it('generates a clean query string omitting default filter values', () => {
      const current = new URLSearchParams('year=2026&month=10');
      const qs = buildFilterQueryString(current, {
        status: 'ALL',
        typeId: 'all',
        siteId: 'all',
        view: 'grid',
      });
      expect(qs).toBe('year=2026&month=10');
    });

    it('preserves existing period while applying filter updates', () => {
      const current = new URLSearchParams('year=2026&month=10&siteId=1');
      const qs = buildFilterQueryString(current, {
        employeeId: 'EMP-0102',
      });
      const res = new URLSearchParams(qs);
      expect(res.get('year')).toBe('2026');
      expect(res.get('month')).toBe('10');
      expect(res.get('siteId')).toBe('1');
      expect(res.get('employeeId')).toBe('EMP-0102');
    });

    it('preserves active filters while navigating periods', () => {
      const current = new URLSearchParams('employeeId=EMP-0101&status=APPROVED&siteId=2');
      const qs = buildFilterQueryString(current, {
        year: 2026,
        month: 11,
      });
      const res = new URLSearchParams(qs);
      expect(res.get('year')).toBe('2026');
      expect(res.get('month')).toBe('11');
      expect(res.get('employeeId')).toBe('EMP-0101');
      expect(res.get('status')).toBe('APPROVED');
      expect(res.get('siteId')).toBe('2');
    });

    it('updates view mode without discarding period or filters', () => {
      const current = new URLSearchParams('year=2026&month=10&siteId=1');
      const qs = buildFilterQueryString(current, {
        view: 'week',
      });
      const res = new URLSearchParams(qs);
      expect(res.get('year')).toBe('2026');
      expect(res.get('month')).toBe('10');
      expect(res.get('siteId')).toBe('1');
      expect(res.get('view')).toBe('week');
    });

    it('removes view parameter when switching back to default grid mode', () => {
      const current = new URLSearchParams('year=2026&month=10&view=week');
      const qs = buildFilterQueryString(current, {
        view: 'grid',
      });
      const res = new URLSearchParams(qs);
      expect(res.has('view')).toBe(false);
      expect(res.get('year')).toBe('2026');
      expect(res.get('month')).toBe('10');
    });
  });
});
