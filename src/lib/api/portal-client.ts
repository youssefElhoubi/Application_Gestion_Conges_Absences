/**
 * Enterprise API client for Employee Self-Service (Portal)
 * Encapsulates all data fetching and submissions for the authenticated employee.
 */

import { EmployeeBalances, EmployeeListItem, EmployeeCreditItem } from './employee-client';
import { AbsenceListItem, AbsenceTypeItem, AbsenceFraction, CalculationPreviewResult } from './absence-client';

export interface PortalUpcomingHoliday {
  id: string | number;
  label: string;
  date: string;
  isReligious: boolean;
  comment?: string | null;
}

export interface PortalProfileData {
  user: {
    id: string;
    email: string;
    role: string;
  };
  employee: (EmployeeListItem & {
    cin?: string;
    cnssNumber?: string | null;
    birthDate?: string | null;
    manager?: {
      employeeId: string;
      fullName: string;
      email?: string;
      jobTitle?: string | null;
    } | null;
  }) | null;
  balances: EmployeeBalances | null;
  upcomingAbsences: AbsenceListItem[];
  upcomingHolidays: PortalUpcomingHoliday[];
  unconsumedCredits: EmployeeCreditItem[];
}

export interface MyRequestsQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  typeId?: string | number;
  year?: string | number;
  search?: string;
}

export interface CreateMyRequestPayload {
  typeId: number;
  reasonId?: number | null;
  startDate: string;
  endDate: string;
  fraction?: AbsenceFraction;
  supportingDocumentProvided?: boolean;
  comment?: string | null;
}

export class PortalApiClient {
  private static defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'x-user-id': 'usr-admin-default', // Fallback dev identity if cookie is missing
  };

  /**
   * Fetch complete personal portal context for authenticated employee
   */
  public static async getPortalData(): Promise<PortalProfileData> {
    const res = await fetch('/api/me', {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec de chargement de l\'espace personnel.' }));
      throw new Error(err.error || 'Impossible de charger vos données personnelles.');
    }

    return await res.json();
  }

  /**
   * List personal absence requests with simple employee-friendly filters
   */
  public static async getMyRequests(
    employeeId: string,
    params: MyRequestsQueryParams = {}
  ): Promise<{
    data: AbsenceListItem[];
    meta: {
      totalItems: number;
      itemCount: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const searchParams = new URLSearchParams();
    searchParams.set('employeeId', employeeId);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params.status && params.status !== 'ALL') searchParams.set('status', params.status);
    if (params.typeId && params.typeId !== 'ALL') searchParams.set('typeId', String(params.typeId));
    if (params.search?.trim()) searchParams.set('search', params.search.trim());

    // If year is specified, compute date range
    if (params.year && params.year !== 'ALL') {
      const yr = Number(params.year);
      searchParams.set('startDate', `${yr}-01-01`);
      searchParams.set('endDate', `${yr}-12-31`);
    }

    const res = await fetch(`/api/absences?${searchParams.toString()}`, {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec de chargement de vos demandes.' }));
      throw new Error(err.error || 'Impossible de récupérer vos demandes de congés.');
    }

    return await res.json();
  }

  /**
   * Fetch single request detail
   */
  public static async getMyRequest(id: string | number): Promise<AbsenceListItem> {
    const res = await fetch(`/api/absences/${encodeURIComponent(String(id))}`, {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Demande introuvable.' }));
      throw new Error(err.error || 'Impossible de consulter le détail de cette demande.');
    }

    return await res.json();
  }

  /**
   * Submit a new absence request on behalf of the authenticated employee
   */
  public static async submitLeaveRequest(
    employeeId: string,
    payload: CreateMyRequestPayload
  ): Promise<AbsenceListItem> {
    const res = await fetch('/api/absences', {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({
        ...payload,
        employeeId, // Firmly locked to current authenticated employee
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec de soumission de la demande.' }));
      throw new Error(err.error || 'Impossible d\'enregistrer votre demande d\'absence.');
    }

    return await res.json();
  }

  /**
   * Cancel an existing personal absence request (if PENDING or APPROVED)
   */
  public static async cancelMyRequest(id: string | number, reason?: string): Promise<AbsenceListItem> {
    const res = await fetch(`/api/absences/${encodeURIComponent(String(id))}/cancel`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({ reason: reason?.trim() || undefined }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec de l\'annulation.' }));
      throw new Error(err.error || 'Impossible d\'annuler cette demande.');
    }

    return await res.json();
  }

  /**
   * Fetch active absence types with allowed reasons
   */
  public static async getAbsenceTypes(): Promise<AbsenceTypeItem[]> {
    const res = await fetch('/api/absences/types', {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      return [];
    }

    return await res.json();
  }

  /**
   * Preview calculation using authoritative backend domain service
   */
  public static async previewCalculation(params: {
    employeeId: string;
    startDate: string;
    endDate: string;
    fraction: AbsenceFraction;
  }): Promise<CalculationPreviewResult> {
    const res = await fetch('/api/absences/calculate', {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(params),
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Calcul de prévisualisation indisponible.' }));
      throw new Error(err.error || 'Échec du calcul légal des jours ouvrés.');
    }

    return await res.json();
  }

  /**
   * Fetch personal holiday recovery credits
   */
  public static async getMyRecoveryCredits(employeeId: string): Promise<EmployeeCreditItem[]> {
    const res = await fetch(`/api/holiday-work-credits?employeeId=${encodeURIComponent(employeeId)}&pageSize=50`, {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return json.data || [];
  }
}
