"use client";

import * as React from "react";
import type { EmployeeCounterItem } from "@/src/lib/api/counter-client";
import type { EmployeeDetail } from "@/src/lib/api/employee-client";
import type { AbsenceListItem } from "@/src/lib/api/absence-client";
import type { HolidayWorkCreditItem } from "@/src/lib/api/holiday-client";
import { LeaveBalanceService } from "@/src/lib/leave-balances/leave-balance.service";
import type {
  AbsenceFilterTab,
  BalanceProgressMetrics,
} from "@/src/lib/leave-balances/leave-balance.types";
import {
  filterAbsencesByTab,
  calculatePendingAbsenceMetrics,
  computeBalanceProgressMetrics,
} from "@/src/lib/leave-balances/balance-metrics";

export interface UseLeaveBalanceDetailResult {
  // Core Data
  employee: EmployeeDetail | null;
  counter: EmployeeCounterItem | null;
  isLoadingCore: boolean;
  coreError: string | null;
  retryCore: () => void;

  // Absences Data
  absences: AbsenceListItem[];
  filteredAbsences: AbsenceListItem[];
  absenceFilterTab: AbsenceFilterTab;
  setAbsenceFilterTab: (tab: AbsenceFilterTab) => void;
  isLoadingAbsences: boolean;
  absencesError: string | null;
  retryAbsences: () => void;

  // Recovery Credits Data
  credits: HolidayWorkCreditItem[];
  isLoadingCredits: boolean;
  creditsError: string | null;
  retryCredits: () => void;

  // Derived Metrics
  pendingAbsences: AbsenceListItem[];
  pendingDays: number;
  progressMetrics: BalanceProgressMetrics | null;
}

/**
 * Custom React hook managing the stateful lifecycle, asynchronous data retrieval,
 * error isolation, and race-condition safety for the employee leave balance detail view.
 */
export function useLeaveBalanceDetail(
  employeeId: string
): UseLeaveBalanceDetailResult {
  // 1. Core State (Employee Profile + Authoritative Counters)
  const [employee, setEmployee] = React.useState<EmployeeDetail | null>(null);
  const [counter, setCounter] = React.useState<EmployeeCounterItem | null>(null);
  const [isLoadingCore, setIsLoadingCore] = React.useState(true);
  const [coreError, setCoreError] = React.useState<string | null>(null);

  // 2. Absence History State
  const [absences, setAbsences] = React.useState<AbsenceListItem[]>([]);
  const [isLoadingAbsences, setIsLoadingAbsences] = React.useState(true);
  const [absencesError, setAbsencesError] = React.useState<string | null>(null);
  const [absenceFilterTab, setAbsenceFilterTab] =
    React.useState<AbsenceFilterTab>("all");

  // 3. Recovery Credits State
  const [credits, setCredits] = React.useState<HolidayWorkCreditItem[]>([]);
  const [isLoadingCredits, setIsLoadingCredits] = React.useState(true);
  const [creditsError, setCreditsError] = React.useState<string | null>(null);

  // Request sequencing tracker to ignore stale async responses
  const activeFetchIdRef = React.useRef(0);

  // --- Data Fetching Methods ---

  const fetchCore = React.useCallback(
    (targetId: string, fetchId: number) => {
      if (!targetId) {
        setCoreError("Identifiant collaborateur manquant.");
        setIsLoadingCore(false);
        return;
      }

      setIsLoadingCore(true);
      setCoreError(null);

      LeaveBalanceService.getCoreLeaveBalanceData(targetId)
        .then(({ employee: empData, counter: counterData }) => {
          if (fetchId !== activeFetchIdRef.current) return;
          setEmployee(empData);
          setCounter(counterData);
          setCoreError(null);
        })
        .catch((err: unknown) => {
          if (fetchId !== activeFetchIdRef.current) return;
          const msg =
            err instanceof Error
              ? err.message
              : "Impossible de charger les compteurs de congés du collaborateur.";
          setCoreError(msg);
        })
        .finally(() => {
          if (fetchId === activeFetchIdRef.current) {
            setIsLoadingCore(false);
          }
        });
    },
    []
  );

  const fetchAbsences = React.useCallback(
    (targetId: string, fetchId: number) => {
      if (!targetId) {
        setIsLoadingAbsences(false);
        return;
      }

      setIsLoadingAbsences(true);
      setAbsencesError(null);

      LeaveBalanceService.getAbsenceHistory(targetId)
        .then((items) => {
          if (fetchId !== activeFetchIdRef.current) return;
          setAbsences(items);
          setAbsencesError(null);
        })
        .catch((err: unknown) => {
          if (fetchId !== activeFetchIdRef.current) return;
          const msg =
            err instanceof Error
              ? err.message
              : "Impossible de charger l'historique des absences.";
          setAbsencesError(msg);
        })
        .finally(() => {
          if (fetchId === activeFetchIdRef.current) {
            setIsLoadingAbsences(false);
          }
        });
    },
    []
  );

  const fetchCredits = React.useCallback(
    (targetId: string, fetchId: number) => {
      if (!targetId) {
        setIsLoadingCredits(false);
        return;
      }

      setIsLoadingCredits(true);
      setCreditsError(null);

      LeaveBalanceService.getHolidayWorkCredits(targetId)
        .then((items) => {
          if (fetchId !== activeFetchIdRef.current) return;
          setCredits(items);
          setCreditsError(null);
        })
        .catch((err: unknown) => {
          if (fetchId !== activeFetchIdRef.current) return;
          const msg =
            err instanceof Error
              ? err.message
              : "Impossible de charger les crédits de récupération.";
          setCreditsError(msg);
        })
        .finally(() => {
          if (fetchId === activeFetchIdRef.current) {
            setIsLoadingCredits(false);
          }
        });
    },
    []
  );

  // Trigger all queries when employeeId changes, tracking active fetch sequence
  React.useEffect(() => {
    activeFetchIdRef.current += 1;
    const currentFetchId = activeFetchIdRef.current;

    fetchCore(employeeId, currentFetchId);
    fetchAbsences(employeeId, currentFetchId);
    fetchCredits(employeeId, currentFetchId);
  }, [employeeId, fetchCore, fetchAbsences, fetchCredits]);

  // Contextual retry handlers
  const retryCore = React.useCallback(() => {
    fetchCore(employeeId, activeFetchIdRef.current);
  }, [employeeId, fetchCore]);

  const retryAbsences = React.useCallback(() => {
    fetchAbsences(employeeId, activeFetchIdRef.current);
  }, [employeeId, fetchAbsences]);

  const retryCredits = React.useCallback(() => {
    fetchCredits(employeeId, activeFetchIdRef.current);
  }, [employeeId, fetchCredits]);

  // Derived Calculations
  const filteredAbsences = React.useMemo(
    () => filterAbsencesByTab(absences, absenceFilterTab),
    [absences, absenceFilterTab]
  );

  const { pendingAbsences, pendingDays } = React.useMemo(
    () => calculatePendingAbsenceMetrics(absences),
    [absences]
  );

  const progressMetrics = React.useMemo(
    () => (counter ? computeBalanceProgressMetrics(counter) : null),
    [counter]
  );

  return {
    employee,
    counter,
    isLoadingCore,
    coreError,
    retryCore,

    absences,
    filteredAbsences,
    absenceFilterTab,
    setAbsenceFilterTab,
    isLoadingAbsences,
    absencesError,
    retryAbsences,

    credits,
    isLoadingCredits,
    creditsError,
    retryCredits,

    pendingAbsences,
    pendingDays,
    progressMetrics,
  };
}
