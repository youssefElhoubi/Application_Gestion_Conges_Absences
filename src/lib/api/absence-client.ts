/**
 * Enterprise API client for Absence & Leave management
 * Handles typed interactions with REST endpoints and calculations
 */

export type AbsenceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type AbsenceFraction = 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON';

export interface AbsenceReasonItem {
  id: number;
  typeId: number;
  code: string;
  name: string;
  allowedDays: number | string;
  active: boolean;
}

export interface AbsenceTypeItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isDeductible: boolean;
  requiresJustification: boolean;
  colorHex: string;
  active: boolean;
  reasons: AbsenceReasonItem[];
}

export interface AbsenceListItem {
  id: string | number;
  employeeId: string;
  typeId: number;
  reasonId?: number | null;
  startDate: string;
  endDate: string;
  fraction: AbsenceFraction;
  calculatedWorkingDays: number | string;
  enteredDays: number | string;
  retainedDays: number | string;
  supportingDocumentProvided: boolean;
  status: AbsenceStatus;
  requestDate: string;
  comment?: string | null;
  rejectionReason?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  employee: {
    employeeId: string;
    fullName: string;
    siteId: number;
    site?: {
      name: string;
    };
  };
  type: {
    id: number;
    code: string;
    name: string;
    colorHex: string;
    isDeductible: boolean;
    requiresJustification?: boolean;
  };
  reason?: {
    id: number;
    code: string;
    name: string;
    allowedDays: number | string;
  } | null;
}

export interface ApprovalHistoryItem {
  id: string | number;
  absenceId: string | number;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CORRECTED';
  fromStatus: AbsenceStatus;
  toStatus: AbsenceStatus;
  performedByUserId: string | null;
  performedByEmployeeId: string | null;
  comment: string | null;
  createdAt: string;
  performedByUser?: {
    email: string;
    role: string;
  } | null;
}

export interface AbsenceDetail extends AbsenceListItem {
  employee: {
    employeeId: string;
    fullName: string;
    siteId: number;
    cin?: string;
    cnssNumber?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    birthDate?: string | null;
    hireDate?: string | null;
    site?: {
      id: number;
      name: string;
      city: string | null;
    };
  };
  approvalHistory: ApprovalHistoryItem[];
}

export interface CalculationPreviewResult {
  calculatedWorkingDays: number;
  enteredDays: number;
  retainedDays: number;
  excludedHolidaysCount: number;
  excludedWeeklyRestDaysCount: number;
  currentBalance: {
    employeeId: string;
    statutoryAccruedDays: number;
    activeRecoveryCreditDays: number;
    totalApprovedDeductions: number;
    netAvailableBalance: number;
    isEligibleForAnnualLeave: boolean;
    serviceMonths: number;
    serviceYears: number;
  };
}

export interface AbsenceQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AbsenceStatus | 'ALL';
  typeId?: number | string;
  employeeId?: string;
  siteId?: number | string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedAbsencesResponse {
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
}

export interface CreateAbsencePayload {
  employeeId: string;
  typeId: number;
  reasonId?: number | null;
  startDate: string;
  endDate: string;
  fraction?: AbsenceFraction;
  supportingDocumentProvided?: boolean;
  comment?: string | null;
}

export class AbsenceApiClient {
  private static defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'x-user-id': 'usr-admin-default', // Fallback admin header for development
  };

  /**
   * List absence requests with pagination and rich filters
   */
  public static async listAbsences(params: AbsenceQueryParams = {}): Promise<PaginatedAbsencesResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.status && params.status !== 'ALL') searchParams.set('status', params.status);
    if (params.typeId && params.typeId !== 'all') searchParams.set('typeId', String(params.typeId));
    if (params.employeeId && params.employeeId !== 'all') searchParams.set('employeeId', params.employeeId);
    if (params.siteId && params.siteId !== 'all') searchParams.set('siteId', String(params.siteId));
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);

    const res = await fetch(`/api/absences?${searchParams.toString()}`, {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec de chargement des absences.' }));
      throw new Error(err.error || 'Erreur lors du chargement des demandes d\'absence.');
    }

    return await res.json();
  }

  /**
   * Retrieve single absence with full employee context and approval audit trail
   */
  public static async getAbsence(id: string | number): Promise<AbsenceDetail> {
    const res = await fetch(`/api/absences/${encodeURIComponent(String(id))}`, {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Absence introuvable.' }));
      throw new Error(err.error || 'Impossible de récupérer les détails de la demande d\'absence.');
    }

    return await res.json();
  }

  /**
   * Load all available database-driven absence types and reasons
   */
  public static async getAbsenceTypes(): Promise<AbsenceTypeItem[]> {
    const res = await fetch('/api/absences/types', {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec de chargement des types d\'absence.' }));
      throw new Error(err.error || 'Impossible de charger les types d\'absence.');
    }

    return await res.json();
  }

  /**
   * Authoritative calculation preview calling backend domain services
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
   * Create a new absence request
   */
  public static async createAbsence(payload: CreateAbsencePayload): Promise<AbsenceListItem> {
    const res = await fetch('/api/absences', {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec de création de la demande.' }));
      throw new Error(err.error || 'Impossible de créer la demande d\'absence.');
    }

    return await res.json();
  }

  /**
   * Update an existing PENDING absence request
   */
  public static async updateAbsence(id: string | number, payload: CreateAbsencePayload): Promise<AbsenceListItem> {
    const res = await fetch(`/api/absences/${encodeURIComponent(String(id))}`, {
      method: 'PUT',
      headers: this.defaultHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec de modification de la demande.' }));
      throw new Error(err.error || 'Impossible de modifier la demande d\'absence.');
    }

    return await res.json();
  }

  /**
   * Approve a PENDING absence request
   */
  public static async approveAbsence(id: string | number, comment?: string): Promise<AbsenceListItem> {
    const res = await fetch(`/api/absences/${encodeURIComponent(String(id))}/approve`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({ comment: comment?.trim() || undefined }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec de validation de l\'absence.' }));
      throw new Error(err.error || 'Impossible d\'approuver la demande d\'absence.');
    }

    return await res.json();
  }

  /**
   * Reject a PENDING absence request with mandatory reason
   */
  public static async rejectAbsence(id: string | number, reason: string): Promise<AbsenceListItem> {
    const res = await fetch(`/api/absences/${encodeURIComponent(String(id))}/reject`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({ reason: reason.trim() }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec du rejet de l\'absence.' }));
      throw new Error(err.error || 'Impossible de rejeter la demande d\'absence.');
    }

    return await res.json();
  }

  /**
   * Cancel an absence request
   */
  public static async cancelAbsence(id: string | number, reason?: string): Promise<AbsenceListItem> {
    const res = await fetch(`/api/absences/${encodeURIComponent(String(id))}/cancel`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({ reason: reason?.trim() || undefined }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec de l\'annulation de l\'absence.' }));
      throw new Error(err.error || 'Impossible d\'annuler la demande d\'absence.');
    }

    return await res.json();
  }
}
