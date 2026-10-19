/**
 * Pure URL parameter parsing, serialization, and filter display helpers
 * for the consolidated leave balances overview feature.
 * Strictly free of React dependencies and side-effects.
 */

import type { LeaveBalancesUrlParams } from '@/src/lib/leave-balances/leave-balance.types';
import type { SiteItem } from '@/src/lib/api/employee-client';
import type { ActiveFilter } from '@/src/components/shared/FilterBar';
import {
  DEFAULT_LEAVE_BALANCES_SORT_BY,
  DEFAULT_LEAVE_BALANCES_SORT_ORDER,
  DEFAULT_LEAVE_BALANCES_PAGE,
  DEFAULT_LEAVE_BALANCES_PAGE_SIZE,
  DEFAULT_LEAVE_BALANCES_ACTIVE,
  DEFAULT_LEAVE_BALANCES_SITE_ID,
  LEAVE_BALANCES_SORT_LABELS,
} from '@/src/lib/leave-balances/leave-balance.constants';

/**
 * Extracts and safely normalizes URL search parameters into a typed LeaveBalancesUrlParams object.
 */
export function parseLeaveBalancesUrlParams(
  searchParams: URLSearchParams | { get: (key: string) => string | null }
): LeaveBalancesUrlParams {
  const search = searchParams.get('search')?.trim() || '';
  const siteId = searchParams.get('siteId') || DEFAULT_LEAVE_BALANCES_SITE_ID;

  const rawActive = searchParams.get('active');
  const active: 'all' | 'true' | 'false' =
    rawActive === 'true' || rawActive === 'false' || rawActive === 'all'
      ? rawActive
      : DEFAULT_LEAVE_BALANCES_ACTIVE;

  const rawPage = Number(searchParams.get('page'));
  const page = Math.max(1, !isNaN(rawPage) && rawPage > 0 ? rawPage : DEFAULT_LEAVE_BALANCES_PAGE);

  const rawPageSize = Number(searchParams.get('pageSize'));
  const pageSize = Math.min(
    100,
    Math.max(1, !isNaN(rawPageSize) && rawPageSize > 0 ? rawPageSize : DEFAULT_LEAVE_BALANCES_PAGE_SIZE)
  );

  const sortBy = searchParams.get('sortBy') || DEFAULT_LEAVE_BALANCES_SORT_BY;

  const rawSortOrder = searchParams.get('sortOrder');
  const sortOrder: 'asc' | 'desc' =
    rawSortOrder === 'asc' || rawSortOrder === 'desc'
      ? rawSortOrder
      : DEFAULT_LEAVE_BALANCES_SORT_ORDER;

  return {
    search,
    siteId,
    active,
    page,
    pageSize,
    sortBy,
    sortOrder,
  };
}

/**
 * Serializes parameter updates on top of the current query string,
 * automatically purging keys matching default values to keep URLs minimal and clean.
 */
export function buildLeaveBalancesQueryString(
  currentParams: URLSearchParams | string,
  updates: Record<string, string | number | null | undefined>
): string {
  const current =
    typeof currentParams === 'string'
      ? new URLSearchParams(currentParams)
      : new URLSearchParams(currentParams.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (key === 'siteId' && value === DEFAULT_LEAVE_BALANCES_SITE_ID) ||
      (key === 'active' && value === DEFAULT_LEAVE_BALANCES_ACTIVE) ||
      (key === 'page' && Number(value) === DEFAULT_LEAVE_BALANCES_PAGE) ||
      (key === 'pageSize' && Number(value) === DEFAULT_LEAVE_BALANCES_PAGE_SIZE) ||
      (key === 'sortBy' &&
        value === DEFAULT_LEAVE_BALANCES_SORT_BY &&
        (updates.sortOrder === DEFAULT_LEAVE_BALANCES_SORT_ORDER || !current.get('sortOrder'))) ||
      (key === 'sortOrder' &&
        value === DEFAULT_LEAVE_BALANCES_SORT_ORDER &&
        (!current.get('sortBy') || current.get('sortBy') === DEFAULT_LEAVE_BALANCES_SORT_BY))
    ) {
      current.delete(key);
    } else {
      current.set(key, String(value));
    }
  });

  return current.toString();
}

/**
 * Derives the active filter chips list from the current URL state and available sites.
 * Only filters that deviate from standard canonical defaults generate chips.
 */
export function buildLeaveBalancesActiveFilters(
  params: LeaveBalancesUrlParams,
  sites: SiteItem[] = []
): ActiveFilter[] {
  const list: ActiveFilter[] = [];

  if (params.search) {
    list.push({
      id: 'search',
      label: 'Recherche',
      valueLabel: `« ${params.search} »`,
    });
  }

  if (params.siteId !== DEFAULT_LEAVE_BALANCES_SITE_ID) {
    const site = sites.find((s) => String(s.id).trim() === String(params.siteId).trim());
    list.push({
      id: 'site',
      label: 'Site',
      valueLabel: site?.name || params.siteId,
    });
  }

  if (params.active !== DEFAULT_LEAVE_BALANCES_ACTIVE) {
    list.push({
      id: 'active',
      label: 'Statut',
      valueLabel:
        params.active === 'false' ? 'Inactifs uniquement' : 'Tous les statuts',
    });
  }

  if (
    params.sortBy !== DEFAULT_LEAVE_BALANCES_SORT_BY ||
    params.sortOrder !== DEFAULT_LEAVE_BALANCES_SORT_ORDER
  ) {
    const sortLabel =
      LEAVE_BALANCES_SORT_LABELS[params.sortBy] || params.sortBy;
    const dirLabel = params.sortOrder === 'asc' ? 'Croissant' : 'Décroissant';
    list.push({
      id: 'sort',
      label: 'Tri',
      valueLabel: `${sortLabel} (${dirLabel})`,
    });
  }

  return list;
}
