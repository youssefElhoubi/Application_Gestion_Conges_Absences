/**
 * Enterprise API client for Employee management
 * Encapsulates all interactions with the existing Next.js REST endpoints
 */

export interface EmployeeListItem {
  employeeId: string;
  cin: string;
  cnssNumber: string | null;
  fullName: string;
  email: string;
  siteId: number;
  jobTitle: string | null;
  department: string | null;
  birthDate: string | null;
  hireDate: string;
  active: boolean;
  observation: string | null;
  managerId: string | null;
  site?: {
    id: number;
    name: string;
    city: string | null;
  };
  manager?: {
    employeeId: string;
    fullName: string;
  } | null;
}

export interface EmployeeDetail extends EmployeeListItem {
  calculatedAge: number | null;
  isMinor: boolean;
  seniorityMonths: number;
  seniorityYears: number;
  isEligibleForAnnualLeave: boolean;
}

export interface EmployeeBalances {
  employeeId: string;
  seniorityMonths: number;
  isEligible: boolean;
  accruedDays: number;
  takenApprovedDays: number;
  pendingDays: number;
  remainingPaidBalance: number;
  recoveryCreditsTotal: number;
  recoveryCreditsConsumed: number;
  recoveryCreditsRemaining: number;
  totalAvailableDays: number;
}

export interface EmployeeAbsenceItem {
  id: number | string;
  employeeId: string;
  typeId: number;
  reasonId?: number | null;
  startDate: string;
  endDate: string;
  fraction: 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON';
  calculatedWorkingDays: number | string;
  enteredDays?: number | string;
  retainedDays?: number | string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  supportingDocumentProvided: boolean;
  comment?: string | null;
  rejectionReason?: string | null;
  type?: {
    id: number;
    name: string;
    code: string;
    colorHex: string;
  };
  reason?: {
    id: number;
    name: string;
    code: string;
  } | null;
}

export interface EmployeeCreditItem {
  id: number | string;
  employeeId: string;
  publicHolidayId: number | string;
  creditedDays: number | string;
  consumedDays: number | string;
  isFullyConsumed: boolean;
  comment?: string | null;
  publicHoliday?: {
    id: number | string;
    label: string;
    date: string;
  };
}

export interface SiteItem {
  id: number;
  code: string;
  name: string;
  city: string | null;
  active: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
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

export class EmployeeApiClient {
  private static defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'x-user-id': 'usr-admin-default', // Fallback admin header for client calls
  };

  /**
   * List employees with filtering, searching, and pagination
   */
  public static async listEmployees(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    siteId?: number | string;
    active?: 'true' | 'false' | 'all';
    department?: string;
  }): Promise<PaginatedResponse<EmployeeListItem>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.siteId && params.siteId !== 'all') searchParams.set('siteId', String(params.siteId));
    if (params.active && params.active !== 'all') searchParams.set('active', params.active);
    if (params.department?.trim() && params.department !== 'all') searchParams.set('department', params.department.trim());

    const res = await fetch(`/api/employees?${searchParams.toString()}`, {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Échec de chargement des collaborateurs.' }));
      throw new Error(err.error || 'Erreur lors du chargement des collaborateurs.');
    }

    return await res.json();
  }

  /**
   * Fetch single employee detail with calculated age and seniority metrics
   */
  public static async getEmployee(employeeId: string): Promise<EmployeeDetail> {
    const res = await fetch(`/api/employees/${encodeURIComponent(employeeId)}`, {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Collaborateur introuvable.' }));
      throw new Error(err.error || 'Impossible de récupérer la fiche collaborateur.');
    }

    return await res.json();
  }

  /**
   * Fetch employee's dynamic leave balances
   */
  public static async getEmployeeBalances(employeeId: string): Promise<EmployeeBalances> {
    const res = await fetch(`/api/employees/${encodeURIComponent(employeeId)}/counters`, {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Soldes indisponibles.' }));
      throw new Error(err.error || 'Impossible de récupérer les soldes du collaborateur.');
    }

    const data = await res.json();
    return {
      ...data,
      employeeId: data.employeeId,
      seniorityMonths: data.serviceMonths ?? data.seniorityMonths ?? 0,
      isEligible: data.isEligibleForAnnualLeave ?? data.isEligible ?? true,
      accruedDays: data.statutoryAccruedDays ?? data.accruedDays ?? 0,
      takenApprovedDays: data.totalApprovedDeductions ?? data.takenApprovedDays ?? 0,
      pendingDays: data.pendingDays ?? 0,
      remainingPaidBalance: data.netAvailableBalance ?? data.remainingPaidBalance ?? 0,
      recoveryCreditsTotal: data.activeRecoveryCreditDays ?? data.recoveryCreditsTotal ?? 0,
      recoveryCreditsConsumed: data.recoveryCreditsConsumed ?? 0,
      recoveryCreditsRemaining: data.activeRecoveryCreditDays ?? data.recoveryCreditsRemaining ?? 0,
      totalAvailableDays: data.netAvailableBalance ?? data.totalAvailableDays ?? 0,
      statutoryAccruedDays: data.statutoryAccruedDays ?? data.accruedDays ?? 0,
      netAvailableBalance: data.netAvailableBalance ?? data.remainingPaidBalance ?? 0,
      totalApprovedDeductions: data.totalApprovedDeductions ?? data.takenApprovedDays ?? 0,
      activeRecoveryCreditDays: data.activeRecoveryCreditDays ?? data.recoveryCreditsRemaining ?? 0,
      isEligibleForAnnualLeave: data.isEligibleForAnnualLeave ?? data.isEligible ?? true,
    } as EmployeeBalances;
  }

  /**
   * Fetch employee's historical and pending absences
   */
  public static async getEmployeeAbsences(employeeId: string): Promise<PaginatedResponse<EmployeeAbsenceItem>> {
    const res = await fetch(`/api/absences?employeeId=${encodeURIComponent(employeeId)}&pageSize=50`, {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        data: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 50,
          totalPages: 1,
          currentPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    return await res.json();
  }

  /**
   * Fetch employee's public holiday recovery credits
   */
  public static async getEmployeeCredits(employeeId: string): Promise<PaginatedResponse<EmployeeCreditItem>> {
    const res = await fetch(`/api/holiday-work-credits?employeeId=${encodeURIComponent(employeeId)}&pageSize=50`, {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        data: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 50,
          totalPages: 1,
          currentPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    return await res.json();
  }

  /**
   * Fetch sites list for dropdown selects
   */
  public static async listSites(): Promise<SiteItem[]> {
    const res = await fetch('/api/sites?pageSize=100&active=true', {
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return json.data || [];
  }

  /**
   * Create an employee
   */
  public static async createEmployee(payload: Record<string, unknown>): Promise<EmployeeListItem> {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Échec de la création du collaborateur.');
    }

    return data;
  }

  /**
   * Update an employee
   */
  public static async updateEmployee(employeeId: string, payload: Record<string, unknown>): Promise<EmployeeListItem> {
    const res = await fetch(`/api/employees/${encodeURIComponent(employeeId)}`, {
      method: 'PATCH',
      headers: this.defaultHeaders,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Échec de la mise à jour du collaborateur.');
    }

    return data;
  }
}
