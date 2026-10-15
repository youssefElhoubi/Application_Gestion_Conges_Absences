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
 * Parses filter state from URL search params with safe normalization of invalid inputs.
 */
export function parseFilterState(searchParams: URLSearchParams): CalendarFilterState {
  const search = searchParams.get('search')?.trim() || '';
  const rawEmployeeId = searchParams.get('employeeId')?.trim();
  const employeeId = rawEmployeeId && rawEmployeeId !== '' ? rawEmployeeId : 'all';

  const rawSiteId = searchParams.get('siteId')?.trim();
  // Safe normalization: siteId must be 'all' or a valid positive integer string
  const siteId = rawSiteId && rawSiteId !== 'all' && /^\d+$/.test(rawSiteId) ? rawSiteId : 'all';

  const rawTypeId = searchParams.get('typeId')?.trim();
  // Safe normalization: typeId must be 'all' or a valid positive integer string
  const typeId = rawTypeId && rawTypeId !== 'all' && /^\d+$/.test(rawTypeId) ? rawTypeId : 'all';

  const rawStatus = searchParams.get('status')?.toUpperCase()?.trim();
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

export type CalendarViewMode = 'grid' | 'week' | 'agenda';

export interface CalendarUrlState extends CalendarFilterState {
  year: number;
  month: number;
  date?: string;
  view: CalendarViewMode;
}

/**
 * Parses full URL state (period, date, view mode, and filters) with safe fallback handling.
 */
export function parseCalendarUrlState(
  searchParams: URLSearchParams,
  referenceDate: Date = new Date()
): CalendarUrlState {
  const filters = parseFilterState(searchParams);

  // Parse date parameter if valid YYYY-MM-DD
  const rawDate = searchParams.get('date')?.trim() || '';
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && !isNaN(new Date(rawDate).getTime());
  const date = isValidDate ? rawDate : undefined;

  const dateYear = date ? parseInt(date.substring(0, 4), 10) : undefined;
  const dateMonth = date ? parseInt(date.substring(5, 7), 10) : undefined;

  const rawYear = Number(searchParams.get('year'));
  const year =
    !isNaN(rawYear) && rawYear >= 1970 && rawYear <= 2100
      ? rawYear
      : dateYear !== undefined
      ? dateYear
      : referenceDate.getFullYear();

  const rawMonth = Number(searchParams.get('month'));
  const month =
    !isNaN(rawMonth) && rawMonth >= 1 && rawMonth <= 12
      ? rawMonth
      : dateMonth !== undefined
      ? dateMonth
      : referenceDate.getMonth() + 1;

  const rawView = searchParams.get('view')?.toLowerCase()?.trim();
  const view: CalendarViewMode =
    rawView === 'week' || rawView === 'agenda' ? rawView : 'grid';

  return {
    ...filters,
    year,
    month,
    date,
    view,
  };
}

/**
 * Generates an updated URL query string preserving period and filter parameters while modifying target params.
 */
export function buildFilterQueryString(
  currentSearchParams: URLSearchParams,
  updates: Partial<CalendarFilterState & { view?: CalendarViewMode; date?: string; year?: number; month?: number }>
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
      (key === 'employeeId' && value === 'all') ||
      (key === 'view' && value === 'grid')
    ) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });

  return params.toString();
}
