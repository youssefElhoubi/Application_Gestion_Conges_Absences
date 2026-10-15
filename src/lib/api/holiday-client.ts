/**
 * Enterprise API client for Public Holidays and Holiday Work Recovery Credits
 */

export interface PublicHolidayItem {
  id: string | number;
  date: string;
  label: string;
  isReligious: boolean;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    holidayWorkCredits: number;
  };
}

export interface HolidayWorkCreditItem {
  id: string | number;
  employeeId: string;
  publicHolidayId: string | number;
  creditedDays: string | number;
  consumedDays: string | number;
  isFullyConsumed: boolean;
  recordedByUserId?: string | null;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    employeeId: string;
    fullName: string;
    jobTitle?: string | null;
    site?: {
      name: string;
      city?: string | null;
    } | null;
  };
  publicHoliday?: {
    id: string | number;
    date: string;
    label: string;
    isReligious?: boolean;
  };
}

export interface PublicHolidayDetail extends PublicHolidayItem {
  holidayWorkCredits?: HolidayWorkCreditItem[];
}

export interface CreatePublicHolidayPayload {
  date: string;
  label: string;
  isReligious?: boolean;
  comment?: string | null;
}

export interface UpdatePublicHolidayPayload {
  date?: string;
  label?: string;
  isReligious?: boolean;
  comment?: string | null;
}

export interface GrantCreditPayload {
  employeeId: string;
  publicHolidayId: number | string;
  creditedDays?: number;
  comment?: string | null;
}

export interface CorrectCreditPayload {
  creditedDays?: number;
  comment: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class HolidayApiClient {
  private static defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'x-user-id': 'usr-admin-default',
  };

  /**
   * List configured public holidays
   */
  public static async listHolidays(params: {
    year?: number;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResult<PublicHolidayItem>> {
    const sp = new URLSearchParams();
    if (params.year) sp.append('year', String(params.year));
    if (params.search) sp.append('search', params.search);
    if (params.page) sp.append('page', String(params.page));
    if (params.pageSize) sp.append('pageSize', String(params.pageSize));

    const res = await fetch(`/api/public-holidays?${sp.toString()}`, {
      method: 'GET',
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur lors du chargement des jours fériés.');
    }

    return res.json();
  }

  /**
   * Retrieve a specific public holiday by ID with linked recovery credits
   */
  public static async getHoliday(id: string | number): Promise<PublicHolidayDetail> {
    const res = await fetch(`/api/public-holidays/${id}`, {
      method: 'GET',
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Impossible de charger le jour férié ${id}.`);
    }

    return res.json();
  }

  /**
   * Create a new public holiday
   */
  public static async createHoliday(payload: CreatePublicHolidayPayload): Promise<PublicHolidayItem> {
    const res = await fetch('/api/public-holidays', {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Impossible d'enregistrer le jour férié.");
    }

    return res.json();
  }

  /**
   * Update an existing public holiday
   */
  public static async updateHoliday(
    id: string | number,
    payload: UpdatePublicHolidayPayload
  ): Promise<PublicHolidayItem> {
    const res = await fetch(`/api/public-holidays/${id}`, {
      method: 'PATCH',
      headers: this.defaultHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impossible de mettre à jour le jour férié.');
    }

    return res.json();
  }

  /**
   * Delete a public holiday (blocked by backend if credits are linked)
   */
  public static async deleteHoliday(id: string | number): Promise<PublicHolidayItem> {
    const res = await fetch(`/api/public-holidays/${id}`, {
      method: 'DELETE',
      headers: this.defaultHeaders,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impossible de supprimer le jour férié.');
    }

    return res.json();
  }

  /**
   * List recovery credits granted to employees
   */
  public static async listCredits(params: {
    employeeId?: string;
    publicHolidayId?: number | string;
    isFullyConsumed?: 'true' | 'false' | 'all';
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResult<HolidayWorkCreditItem>> {
    const sp = new URLSearchParams();
    if (params.employeeId) sp.append('employeeId', params.employeeId);
    if (params.publicHolidayId) sp.append('publicHolidayId', String(params.publicHolidayId));
    if (params.isFullyConsumed) sp.append('isFullyConsumed', params.isFullyConsumed);
    if (params.page) sp.append('page', String(params.page));
    if (params.pageSize) sp.append('pageSize', String(params.pageSize));

    const res = await fetch(`/api/holiday-work-credits?${sp.toString()}`, {
      method: 'GET',
      headers: this.defaultHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur lors du chargement des crédits de récupération.');
    }

    return res.json();
  }

  /**
   * Retrieve a single recovery credit by ID
   */
  public static async getCredit(id: string | number): Promise<HolidayWorkCreditItem> {
    const res = await fetch(`/api/holiday-work-credits/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Impossible de charger le crédit ${id}.`);
    }

    return res.json();
  }

  /**
   * Grant recovery credit to an employee for working on a public holiday
   */
  public static async grantCredit(payload: GrantCreditPayload): Promise<HolidayWorkCreditItem> {
    const res = await fetch('/api/holiday-work-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Impossible d'octroyer le crédit de récupération.");
    }

    return res.json();
  }

  /**
   * Correct or adjust an existing recovery credit with audit comment
   */
  public static async correctCredit(
    id: string | number,
    payload: CorrectCreditPayload
  ): Promise<HolidayWorkCreditItem> {
    const res = await fetch(`/api/holiday-work-credits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Impossible d'ajuster le crédit de récupération.");
    }

    return res.json();
  }

  /**
   * Delete or revoke an unconsumed recovery credit
   */
  public static async deleteCredit(id: string | number): Promise<HolidayWorkCreditItem> {
    const res = await fetch(`/api/holiday-work-credits/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impossible de supprimer le crédit de récupération.');
    }

    return res.json();
  }
}
