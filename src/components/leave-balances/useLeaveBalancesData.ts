"use client";

import * as React from "react";
import type { EmployeeCounterItem } from "@/src/lib/api/counter-client";
import type { SiteItem } from "@/src/lib/api/employee-client";
import { LeaveBalanceService } from "@/src/lib/leave-balances/leave-balance.service";
import { computeAggregateMetrics } from "@/src/lib/leave-balances/balance-metrics";
import type { AggregateLeaveMetrics } from "@/src/lib/leave-balances/leave-balance.types";

export interface UseLeaveBalancesDataParams {
  page: number;
  pageSize: number;
  search: string;
  siteId: string;
  active: "all" | "true" | "false";
  sortBy: string;
  sortOrder: "asc" | "desc";
  onPaginationCorrection?: (maxPages: number) => void;
}

export interface UseLeaveBalancesDataResult {
  counters: EmployeeCounterItem[];
  sites: SiteItem[];
  totalItems: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  aggregateMetrics: AggregateLeaveMetrics;
}

/**
 * Custom React hook managing remote multi-employee counter data fetching,
 * site metadata caching, race-condition protection, out-of-bounds pagination correction,
 * and display-level metric aggregations.
 */
export function useLeaveBalancesData(
  params: UseLeaveBalancesDataParams
): UseLeaveBalancesDataResult {
  const {
    page,
    pageSize,
    search,
    siteId,
    active,
    sortBy,
    sortOrder,
    onPaginationCorrection,
  } = params;

  const [counters, setCounters] = React.useState<EmployeeCounterItem[]>([]);
  const [sites, setSites] = React.useState<SiteItem[]>([]);
  const [totalItems, setTotalItems] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Request sequencing tracker to ignore stale async responses
  const activeFetchIdRef = React.useRef(0);

  // 1. Fetch sites once on mount for filter dropdown options
  React.useEffect(() => {
    let isMounted = true;

    LeaveBalanceService.listSites()
      .then((s) => {
        if (isMounted) {
          setSites(s);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch multi-employee counters whenever query parameters or refreshKey change
  React.useEffect(() => {
    let isMounted = true;
    const fetchId = ++activeFetchIdRef.current;
    setIsLoading(true);

    LeaveBalanceService.listCounters({
      page,
      pageSize,
      search,
      siteId: siteId !== "all" ? siteId : undefined,
      active: active !== "all" ? active : undefined,
      sortBy,
      sortOrder,
    })
      .then((response) => {
        if (!isMounted || fetchId !== activeFetchIdRef.current) return;

        setCounters(response.data);
        setTotalItems(response.meta.totalItems);
        setError(null);
        setIsLoading(false);

        // Correct out-of-bounds pagination if total count changed
        const maxPages = Math.max(1, Math.ceil(response.meta.totalItems / pageSize));
        if (page > maxPages && onPaginationCorrection) {
          onPaginationCorrection(maxPages);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted || fetchId !== activeFetchIdRef.current) return;

        const message =
          err instanceof Error
            ? err.message
            : "Impossible de charger la vue consolidée des soldes.";
        setError(message);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    page,
    pageSize,
    search,
    siteId,
    active,
    sortBy,
    sortOrder,
    refreshKey,
    onPaginationCorrection,
  ]);

  // 3. Aggregate stats derived from current loaded view
  const aggregateMetrics = React.useMemo(() => {
    return computeAggregateMetrics(counters);
  }, [counters]);

  const refresh = React.useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    counters,
    sites,
    totalItems,
    isLoading,
    error,
    refresh,
    aggregateMetrics,
  };
}
