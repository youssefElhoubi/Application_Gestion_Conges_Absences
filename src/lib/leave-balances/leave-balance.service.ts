/**
 * Data access service for employee leave balance details.
 * Encapsulates communication with employee, counter, absence, and holiday API clients.
 */

import {
  CounterApiClient,
  type EmployeeCounterItem,
  type MultiEmployeeCounterQueryParams,
  type PaginatedCountersResponse,
} from '@/src/lib/api/counter-client';
import {
  EmployeeApiClient,
  type EmployeeDetail,
  type SiteItem,
} from '@/src/lib/api/employee-client';
import {
  AbsenceApiClient,
  type AbsenceListItem,
} from '@/src/lib/api/absence-client';
import {
  HolidayApiClient,
  type HolidayWorkCreditItem,
} from '@/src/lib/api/holiday-client';
import {
  DEFAULT_DETAIL_ABSENCES_PAGE_SIZE,
  DEFAULT_DETAIL_CREDITS_PAGE_SIZE,
} from '@/src/lib/leave-balances/leave-balance.constants';

export interface CoreLeaveBalanceData {
  employee: EmployeeDetail;
  counter: EmployeeCounterItem;
}

export class LeaveBalanceService {
  /**
   * Retrieves paginated multi-employee counters matching query criteria.
   */
  public static async listCounters(
    params: MultiEmployeeCounterQueryParams
  ): Promise<PaginatedCountersResponse> {
    return CounterApiClient.listCounters(params);
  }

  /**
   * Retrieves all company sites for filter dropdown options.
   */
  public static async listSites(): Promise<SiteItem[]> {
    return EmployeeApiClient.listSites();
  }

  /**
   * Retrieves both employee details and authoritative dynamic counters concurrently.
   */
  public static async getCoreLeaveBalanceData(
    employeeId: string
  ): Promise<CoreLeaveBalanceData> {
    const [employee, counter] = await Promise.all([
      EmployeeApiClient.getEmployee(employeeId),
      CounterApiClient.getEmployeeCounters(employeeId),
    ]);
    return { employee, counter };
  }

  /**
   * Retrieves absence history for an employee up to the specified page size.
   */
  public static async getAbsenceHistory(
    employeeId: string,
    pageSize: number = DEFAULT_DETAIL_ABSENCES_PAGE_SIZE
  ): Promise<AbsenceListItem[]> {
    const res = await AbsenceApiClient.listAbsences({
      employeeId,
      pageSize,
    });
    return res.data || [];
  }

  /**
   * Retrieves worked holiday recovery credits for an employee up to the specified page size.
   */
  public static async getHolidayWorkCredits(
    employeeId: string,
    pageSize: number = DEFAULT_DETAIL_CREDITS_PAGE_SIZE
  ): Promise<HolidayWorkCreditItem[]> {
    const res = await HolidayApiClient.listCredits({
      employeeId,
      pageSize,
    });
    return res.data || [];
  }
}
