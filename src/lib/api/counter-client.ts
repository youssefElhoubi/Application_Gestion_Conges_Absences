/**
 * Enterprise API client for Leave Balances and Dynamic Counters
 * Communicates with /api/counters and /api/employees/[id]/counters
 */

export interface CounterCalculationBreakdown {
  monthlyRateApplied: number;
  isMinorRate: boolean;
  seniorityMonths: number;
  maxYearlyCapEnforced: boolean;
  unconsumedHolidayCreditsCount: number;
}

export interface EmployeeCounterItem {
  employeeId: string;
  fullName: string;
  siteName?: string;
  jobTitle?: string | null;
  hireDate?: string | Date;
  active?: boolean;
  referenceDate: string | Date;
  serviceMonths: number;
  serviceYears: number;
  isEligibleForAnnualLeave: boolean;
  statutoryAccruedDays: number;
  activeRecoveryCreditDays: number;
  totalApprovedDeductions: number;
  netAvailableBalance: number;
  calculationBreakdown: CounterCalculationBreakdown;
}

export interface MultiEmployeeCounterQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  siteId?: number | string;
  active?: 'true' | 'false' | 'all';
  asOfDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedCountersResponse {
  data: EmployeeCounterItem[];
  meta: {
    totalItems: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

export class CounterApiClient {
  private static defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'x-user-id': 'usr-admin-default', // Fallback admin header for client calls
  };

  /**
   * Fetch multi-employee balance summaries with pagination, search, and filters
   */
  public static async listCounters(
    params: MultiEmployeeCounterQueryParams = {}
  ): Promise<PaginatedCountersResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.siteId && params.siteId !== 'all') searchParams.set('siteId', String(params.siteId));
    if (params.active && params.active !== 'all') searchParams.set('active', params.active);
    if (params.asOfDate) searchParams.set('asOfDate', params.asOfDate);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const res = await fetch(`/api/counters?${searchParams.toString()}`, {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec du chargement des compteurs de congés.' }));
      throw new Error(err.error || 'Erreur lors de la récupération des soldes de congés.');
    }

    return await res.json();
  }

  /**
   * Fetch single employee dynamic balance breakdown
   */
  public static async getEmployeeCounters(employeeId: string): Promise<EmployeeCounterItem> {
    const res = await fetch(`/api/employees/${encodeURIComponent(employeeId)}/counters`, {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Soldes indisponibles.' }));
      throw new Error(err.error || 'Impossible de récupérer les soldes du collaborateur.');
    }

    return await res.json();
  }
}
