import { describe, it, expect } from 'vitest';
import {
  parseLeaveBalancesUrlParams,
  buildLeaveBalancesQueryString,
  buildLeaveBalancesActiveFilters,
} from '@/src/lib/leave-balances/leave-balance-url';
import {
  DEFAULT_LEAVE_BALANCES_SORT_BY,
  DEFAULT_LEAVE_BALANCES_SORT_ORDER,
  DEFAULT_LEAVE_BALANCES_PAGE,
  DEFAULT_LEAVE_BALANCES_PAGE_SIZE,
  DEFAULT_LEAVE_BALANCES_ACTIVE,
  DEFAULT_LEAVE_BALANCES_SITE_ID,
} from '@/src/lib/leave-balances/leave-balance.constants';

describe('Unit: leave-balance-url utilities', () => {
  describe('parseLeaveBalancesUrlParams', () => {
    it('returns standard defaults when search params are completely empty', () => {
      const sp = new URLSearchParams('');
      const parsed = parseLeaveBalancesUrlParams(sp);

      expect(parsed).toEqual({
        search: '',
        siteId: DEFAULT_LEAVE_BALANCES_SITE_ID,
        active: DEFAULT_LEAVE_BALANCES_ACTIVE,
        page: DEFAULT_LEAVE_BALANCES_PAGE,
        pageSize: DEFAULT_LEAVE_BALANCES_PAGE_SIZE,
        sortBy: DEFAULT_LEAVE_BALANCES_SORT_BY,
        sortOrder: DEFAULT_LEAVE_BALANCES_SORT_ORDER,
      });
    });

    it('parses and trims valid search and filter parameters accurately', () => {
      const sp = new URLSearchParams(
        'search=  Mehdi  &siteId=2&active=true&page=3&pageSize=25&sortBy=netAvailableBalance&sortOrder=desc'
      );
      const parsed = parseLeaveBalancesUrlParams(sp);

      expect(parsed.search).toBe('Mehdi');
      expect(parsed.siteId).toBe('2');
      expect(parsed.active).toBe('true');
      expect(parsed.page).toBe(3);
      expect(parsed.pageSize).toBe(25);
      expect(parsed.sortBy).toBe('netAvailableBalance');
      expect(parsed.sortOrder).toBe('desc');
    });

    it('safely falls back to defaults on negative, invalid, or NaN numbers', () => {
      const sp = new URLSearchParams('page=-10&pageSize=invalid&active=bogus&sortOrder=random');
      const parsed = parseLeaveBalancesUrlParams(sp);

      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(DEFAULT_LEAVE_BALANCES_PAGE_SIZE);
      expect(parsed.active).toBe(DEFAULT_LEAVE_BALANCES_ACTIVE);
      expect(parsed.sortOrder).toBe('asc');
    });
  });

  describe('buildLeaveBalancesQueryString', () => {
    it('deletes keys matching defaults to produce minimal canonical URLs', () => {
      const current = new URLSearchParams('siteId=1&active=true&page=2');
      const qs = buildLeaveBalancesQueryString(current, {
        siteId: DEFAULT_LEAVE_BALANCES_SITE_ID,
        page: DEFAULT_LEAVE_BALANCES_PAGE,
      });

      expect(qs).toBe('active=true');
    });

    it('deletes keys with null, undefined, or empty string values', () => {
      const current = new URLSearchParams('search=test&siteId=2');
      const qs = buildLeaveBalancesQueryString(current, {
        search: '',
        siteId: null,
      });

      expect(qs).toBe('');
    });

    it('updates parameter values properly', () => {
      const current = new URLSearchParams('');
      const qs = buildLeaveBalancesQueryString(current, {
        search: 'Ahmed',
        page: 2,
      });

      expect(qs).toBe('search=Ahmed&page=2');
    });
  });

  describe('buildLeaveBalancesActiveFilters', () => {
    const mockSites = [
      { id: 1, name: 'Casablanca Siège', code: 'CASA', city: 'Casablanca', active: true },
      { id: 2, name: 'Tanger Port', code: 'TNG', city: 'Tanger', active: true },
    ];

    it('returns empty array when all parameters match default values and active is "all"', () => {
      const params = {
        ...parseLeaveBalancesUrlParams(new URLSearchParams('')),
        active: 'all' as const,
      };
      const filters = buildLeaveBalancesActiveFilters(params, mockSites);
      expect(filters).toEqual([]);
    });

    it('shows "Actifs uniquement" chip when active defaults to "true"', () => {
      const params = parseLeaveBalancesUrlParams(new URLSearchParams(''));
      const filters = buildLeaveBalancesActiveFilters(params, mockSites);
      expect(filters).toEqual([
        {
          id: 'active',
          label: 'Statut',
          valueLabel: 'Actifs uniquement',
        },
      ]);
    });

    it('generates active filter chips with human-readable labels', () => {
      const params = parseLeaveBalancesUrlParams(
        new URLSearchParams('search=Karim&siteId=1&active=false&sortBy=statutoryAccruedDays&sortOrder=desc')
      );
      const filters = buildLeaveBalancesActiveFilters(params, mockSites);

      expect(filters).toHaveLength(4);
      expect(filters[0]).toEqual({
        id: 'search',
        label: 'Recherche',
        valueLabel: '« Karim »',
      });
      expect(filters[1]).toEqual({
        id: 'site',
        label: 'Site',
        valueLabel: 'Casablanca Siège',
      });
      expect(filters[2]).toEqual({
        id: 'active',
        label: 'Statut',
        valueLabel: 'Inactifs uniquement',
      });
      expect(filters[3].id).toBe('sort');
      expect(filters[3].valueLabel).toContain('Décroissant');
    });
  });
});
