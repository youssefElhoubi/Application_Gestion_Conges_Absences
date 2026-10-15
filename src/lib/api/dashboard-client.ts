/**
 * Enterprise API client for HR Dashboard analytics and operational metrics
 */

import { AbsenceListItem } from './absence-client';

export interface DashboardKPIs {
  totalActiveEmployees: number;
  pendingAbsenceRequests: number;
  pendingRequiringMyAction: number;
  totalApprovedDays: number;
  totalApprovedRequestsCount: number;
  unjustifiedAbsenceDays: number;
  availableRecoveryCredits: number;
}

export interface AbsenceCategoryBreakdown {
  typeId: number;
  code: string;
  name: string;
  colorHex: string;
  totalDays: number;
  requestsCount: number;
}

export interface SiteEmployeeDistribution {
  siteId: number;
  siteName: string;
  city: string;
  activeEmployeesCount: number;
}

export interface DashboardSummaryResponse {
  period: {
    year: number;
    month: number | null;
    startDate: string;
    endDate: string;
  };
  kpis: DashboardKPIs;
  categoryBreakdown: AbsenceCategoryBreakdown[];
  employeesBySite: SiteEmployeeDistribution[];
}

export interface PendingRequestTypeBreakdown {
  typeCode: string;
  typeName: string;
  count: number;
}

export interface DashboardMetricsResponse {
  activeEmployees: number;
  validatedLeaveDays: number;
  recoveryDaysAvailable: number;
  nonJustifiedAbsenceDays: number;
  pendingLeaveRequests: number;
  nonJustifiedAbsenceCount: number;
  recoveryDaysReserved: number;
  pendingRequestsByType: PendingRequestTypeBreakdown[];
  generatedAt: string;
  period: {
    startDate: string | null;
    endDate: string | null;
    mode: string;
  };
  appliedFilters: {
    siteId: number | null;
    employeeId: string | null;
    userScopeRole: string;
  };
}

export interface PublicHolidayItem {
  id: string | number;
  date: string;
  label: string;
  isReligious: boolean;
  comment?: string | null;
}

export interface SiteItem {
  id: number;
  code: string;
  name: string;
  city: string;
  timezone: string;
  weeklyRestDays: number[];
  active: boolean;
  _count?: {
    employees: number;
  };
}

export class DashboardApiClient {
  /**
   * Retrieves aggregated dashboard summary (KPIs, category breakdown, site distribution)
   */
  public static async getSummary(params: {
    siteId?: number;
    year?: number;
    month?: number;
  } = {}): Promise<DashboardSummaryResponse> {
    const sp = new URLSearchParams();
    if (params.siteId) sp.append('siteId', String(params.siteId));
    if (params.year) sp.append('year', String(params.year));
    if (params.month) sp.append('month', String(params.month));

    const res = await fetch(`/api/dashboard/summary?${sp.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impossible de charger le résumé du tableau de bord.');
    }

    return res.json();
  }

  /**
   * Retrieves 5 core metrics with fine-grained period and scope options
   */
  public static async getMetrics(params: {
    siteId?: number;
    periodMode?: 'current_year' | 'current_month' | 'custom' | 'all_time';
    startDate?: string;
    endDate?: string;
  } = {}): Promise<DashboardMetricsResponse> {
    const sp = new URLSearchParams();
    if (params.siteId) sp.append('siteId', String(params.siteId));
    if (params.periodMode) sp.append('periodMode', params.periodMode);
    if (params.startDate) sp.append('startDate', params.startDate);
    if (params.endDate) sp.append('endDate', params.endDate);

    const res = await fetch(`/api/dashboard/metrics?${sp.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impossible de charger les métriques du tableau de bord.');
    }

    return res.json();
  }

  /**
   * Retrieves requests awaiting HR validation
   */
  public static async getPendingAbsences(pageSize = 5, siteId?: number): Promise<{
    data: AbsenceListItem[];
    total: number;
  }> {
    const sp = new URLSearchParams({
      status: 'PENDING',
      pageSize: String(pageSize),
      page: '1',
    });
    if (siteId) sp.append('siteId', String(siteId));

    const res = await fetch(`/api/absences?${sp.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impossible de charger les demandes en attente.');
    }

    const json = await res.json();
    return {
      data: json.data || [],
      total: json.meta?.totalItems || 0,
    };
  }

  /**
   * Retrieves latest absence activity across the organisation
   */
  public static async getRecentAbsences(pageSize = 6, siteId?: number): Promise<{
    data: AbsenceListItem[];
    total: number;
  }> {
    const sp = new URLSearchParams({
      pageSize: String(pageSize),
      page: '1',
    });
    if (siteId) sp.append('siteId', String(siteId));

    const res = await fetch(`/api/absences?${sp.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impossible de charger les dernières demandes.');
    }

    const json = await res.json();
    return {
      data: json.data || [],
      total: json.meta?.totalItems || 0,
    };
  }

  /**
   * Retrieves upcoming public holidays
   */
  public static async getUpcomingPublicHolidays(pageSize = 4): Promise<PublicHolidayItem[]> {
    const sp = new URLSearchParams({
      pageSize: String(pageSize),
      page: '1',
    });

    const res = await fetch(`/api/public-holidays?${sp.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impossible de charger les jours fériés légaux.');
    }

    const json = await res.json();
    return json.data || [];
  }

  /**
   * Retrieves list of sites for scope filtering
   */
  public static async getSites(): Promise<SiteItem[]> {
    const res = await fetch('/api/sites', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return json.data || [];
  }
}
