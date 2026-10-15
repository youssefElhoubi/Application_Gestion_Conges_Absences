import { ActiveFilter } from '@/src/components/shared/FilterBar';
import { AbsenceStatus, AbsenceTypeItem } from '@/src/lib/api/absence-client';
import { SiteItem, EmployeeListItem } from '@/src/lib/api/employee-client';
import { getStatusLabel } from '@/src/lib/calendar/calendar-events';

export interface CalendarFilterState {
  search: string;
  employeeId: string; // 'all' or specific employeeId
  siteId: string; // 'all' or specific siteId
  typeId: string; // 'all' or specific typeId
  status: AbsenceStatus | 'ALL';
}

export const DEFAULT_CALENDAR_FILTERS: CalendarFilterState = {
  search: '',
  employeeId: 'all',
  siteId: 'all',
  typeId: 'all',
  status: 'ALL',
};

/**
 * Parses filter state from URL search params.
 */
export function parseFilterState(searchParams: URLSearchParams): CalendarFilterState {
  const search = searchParams.get('search')?.trim() || '';
  const employeeId = searchParams.get('employeeId')?.trim() || 'all';
  const siteId = searchParams.get('siteId')?.trim() || 'all';
  const typeId = searchParams.get('typeId')?.trim() || 'all';
  const rawStatus = searchParams.get('status')?.toUpperCase();
  const status: AbsenceStatus | 'ALL' =
    rawStatus === 'PENDING' || rawStatus === 'APPROVED' || rawStatus === 'REJECTED' || rawStatus === 'CANCELLED'
      ? (rawStatus as AbsenceStatus)
      : 'ALL';

  return {
    search,
    employeeId,
    siteId,
    typeId,
    status,
  };
}

/**
 * Builds the list of active filter chips for display in FilterBar.
 */
export function deriveActiveFilters(
  filters: CalendarFilterState,
  options: {
    types?: AbsenceTypeItem[];
    sites?: SiteItem[];
    employees?: EmployeeListItem[];
  }
): ActiveFilter[] {
  const active: ActiveFilter[] = [];

  // 1. Employee Filter
  if (filters.employeeId && filters.employeeId !== 'all') {
    const emp = options.employees?.find((e) => e.employeeId === filters.employeeId);
    active.push({
      id: 'employeeId',
      label: 'Collaborateur',
      valueLabel: emp ? `${emp.fullName} (${emp.employeeId})` : filters.employeeId,
    });
  }

  // 2. Site Filter
  if (filters.siteId && filters.siteId !== 'all') {
    const site = options.sites?.find((s) => String(s.id) === filters.siteId);
    active.push({
      id: 'siteId',
      label: 'Site',
      valueLabel: site?.name || `Site ${filters.siteId}`,
    });
  }

  // 3. Absence Type Filter
  if (filters.typeId && filters.typeId !== 'all') {
    const type = options.types?.find((t) => String(t.id) === filters.typeId);
    active.push({
      id: 'typeId',
      label: 'Type',
      valueLabel: type?.name || `Type ${filters.typeId}`,
    });
  }

  // 4. Status Filter
  if (filters.status && filters.status !== 'ALL') {
    active.push({
      id: 'status',
      label: 'Statut',
      valueLabel: getStatusLabel(filters.status),
    });
  }

  return active;
}

/**
 * Generates an updated URL query string preserving year and month while modifying filter params.
 */
export function buildFilterQueryString(
  currentSearchParams: URLSearchParams,
  updates: Partial<CalendarFilterState>
): string {
  const params = new URLSearchParams(currentSearchParams.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (key === 'status' && value === 'ALL') ||
      (key === 'typeId' && value === 'all') ||
      (key === 'siteId' && value === 'all') ||
      (key === 'employeeId' && value === 'all')
    ) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });

  return params.toString();
}
