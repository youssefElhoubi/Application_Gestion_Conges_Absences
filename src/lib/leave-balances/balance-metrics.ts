/**
 * Pure calculation, transformation, and filtering utilities for Leave Balances & Details.
 */

import { toSafeNumber } from '@/src/lib/utils';
import type {
  AbsenceListItem,
  AbsenceFilterTab,
  EmployeeCounterItem,
  BalanceProgressMetrics,
} from '@/src/lib/leave-balances/leave-balance.types';

/**
 * Safely decodes a route parameter with try/catch to protect against malformed URI components.
 */
export function safeDecodeParam(rawId: string | string[] | undefined): string {
  if (!rawId) return '';
  const candidate = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!candidate) return '';
  try {
    return decodeURIComponent(candidate);
  } catch {
    return candidate;
  }
}

/**
 * Filters absence items according to the selected status tab.
 */
export function filterAbsencesByTab(
  absences: AbsenceListItem[],
  tab: AbsenceFilterTab
): AbsenceListItem[] {
  if (tab === 'approved') {
    return absences.filter((a) => a.status === 'APPROVED');
  }
  if (tab === 'pending') {
    return absences.filter((a) => a.status === 'PENDING');
  }
  if (tab === 'other') {
    return absences.filter(
      (a) => a.status === 'REJECTED' || a.status === 'CANCELLED'
    );
  }
  return absences;
}

/**
 * Calculates pending absence metrics (count and total retained/working days).
 */
export function calculatePendingAbsenceMetrics(absences: AbsenceListItem[]): {
  pendingAbsences: AbsenceListItem[];
  pendingDays: number;
} {
  const pendingAbsences = absences.filter((a) => a.status === 'PENDING');
  const pendingDays = pendingAbsences.reduce((sum, a) => {
    const val = toSafeNumber(a.retainedDays ?? a.calculatedWorkingDays ?? 0);
    return sum + val;
  }, 0);

  return {
    pendingAbsences,
    pendingDays,
  };
}

/**
 * Computes balance composition progress metrics for the proportional bar and legend.
 */
export function computeBalanceProgressMetrics(
  counter: EmployeeCounterItem
): BalanceProgressMetrics {
  const isEligible = counter.isEligibleForAnnualLeave;
  const isNegative = counter.netAvailableBalance < 0;
  const totalAcquiredRights =
    counter.statutoryAccruedDays + counter.activeRecoveryCreditDays;

  const consumedPercent =
    totalAcquiredRights > 0
      ? Math.min(
          100,
          Math.round(
            (counter.totalApprovedDeductions / totalAcquiredRights) * 100
          )
        )
      : 0;

  const remainingPercent =
    totalAcquiredRights > 0 ? Math.max(0, 100 - consumedPercent) : 0;
  const availablePercent = isEligible ? remainingPercent : 0;
  const lockedPercent = !isEligible ? remainingPercent : 0;

  return {
    totalAcquiredRights,
    consumedPercent,
    availablePercent,
    lockedPercent,
    isEligible,
    isNegative,
  };
}
