/**
 * TypeScript type definitions for Leave Balances and Counters modules.
 */

import type {
  EmployeeCounterItem,
  CounterCalculationBreakdown,
} from '@/src/lib/api/counter-client';
import type {
  EmployeeDetail,
  EmployeeListItem,
} from '@/src/lib/api/employee-client';
import type {
  AbsenceListItem,
  AbsenceTypeItem,
  AbsenceStatus,
  AbsenceFraction,
} from '@/src/lib/api/absence-client';
import type {
  HolidayWorkCreditItem,
  PublicHolidayItem,
} from '@/src/lib/api/holiday-client';

// Re-export core API contracts for feature convenience
export type {
  EmployeeCounterItem,
  CounterCalculationBreakdown,
  EmployeeDetail,
  EmployeeListItem,
  AbsenceListItem,
  AbsenceTypeItem,
  AbsenceStatus,
  AbsenceFraction,
  HolidayWorkCreditItem,
  PublicHolidayItem,
};

/**
 * Filter tabs available on the employee detail absence history panel
 */
export type AbsenceFilterTab = 'all' | 'approved' | 'pending' | 'other';

/**
 * Configuration for an absence status filter tab
 */
export interface AbsenceTabConfig {
  id: AbsenceFilterTab;
  label: string;
  badgeLabel?: string;
  activeClass: string;
}

/**
 * Calculated progress percentages and status indicators for the balance composition bar
 */
export interface BalanceProgressMetrics {
  totalAcquiredRights: number;
  consumedPercent: number;
  availablePercent: number;
  lockedPercent: number;
  isEligible: boolean;
  isNegative: boolean;
}

/**
 * Tab item count mapping for absence history filter tabs
 */
export interface AbsenceTabCounts {
  all: number;
  approved: number;
  pending: number;
  other: number;
}

/**
 * Consolidated aggregate summary metrics for the leave balances overview page
 */
export interface AggregateLeaveMetrics {
  totalAccrued: number;
  totalTaken: number;
  totalRecovery: number;
  avgAvailable: number;
}

/**
 * Validated URL search parameter state for leave balances overview
 */
export interface LeaveBalancesUrlParams {
  search: string;
  siteId: string;
  active: 'all' | 'true' | 'false';
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

