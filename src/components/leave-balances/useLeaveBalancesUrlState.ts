"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { SiteItem } from "@/src/lib/api/employee-client";
import type { ActiveFilter } from "@/src/components/shared/FilterBar";
import type { SortDirection } from "@/src/components/table/DataTable";
import {
  parseLeaveBalancesUrlParams,
  buildLeaveBalancesQueryString,
  buildLeaveBalancesActiveFilters,
} from "@/src/lib/leave-balances/leave-balance-url";
import {
  DEFAULT_LEAVE_BALANCES_SORT_BY,
  DEFAULT_LEAVE_BALANCES_SORT_ORDER,
  DEFAULT_LEAVE_BALANCES_PAGE,
  DEFAULT_LEAVE_BALANCES_ACTIVE,
  DEFAULT_LEAVE_BALANCES_SITE_ID,
} from "@/src/lib/leave-balances/leave-balance.constants";

export interface UseLeaveBalancesUrlStateResult {
  // Parsed and normalized URL parameters
  search: string;
  siteId: string;
  active: "all" | "true" | "false";
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";

  // Local responsive search buffer
  searchInput: string;
  setSearchInput: (value: string) => void;

  // Active filter chip indicators
  activeFilters: ActiveFilter[];
  buildActiveFilters: (sites?: SiteItem[]) => ActiveFilter[];

  // Action and synchronization handlers
  updateUrlParams: (updates: Record<string, string | number | null | undefined>) => void;
  handleSearchChange: (value: string) => void;
  handleSiteChange: (siteId: string) => void;
  handleActiveChange: (active: string) => void;
  handleSortChange: (columnId: string, direction: SortDirection) => void;
  handlePageChange: (newPage: number) => void;
  handlePageSizeChange: (newPageSize: number) => void;
  handleRemoveFilter: (filterId: string) => void;
  handleResetFilters: () => void;
}

/**
 * Custom React hook managing bidirectional URL parameter synchronization,
 * search buffer reconciliation, and active filter derivation for leave balances overview.
 */
export function useLeaveBalancesUrlState(
  sites: SiteItem[] = []
): UseLeaveBalancesUrlStateResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Authoritative URL-driven state parsing
  const parsed = React.useMemo(() => {
    return parseLeaveBalancesUrlParams(searchParams);
  }, [searchParams]);

  // 2. Local search query input for responsive typing before URL synchronization
  const [searchInput, setSearchInput] = React.useState(parsed.search);
  const [prevUrlSearch, setPrevUrlSearch] = React.useState(parsed.search);

  if (prevUrlSearch !== parsed.search) {
    setPrevUrlSearch(parsed.search);
    setSearchInput(parsed.search);
  }

  // 3. Helper to synchronize updates into URL search params
  const updateUrlParams = React.useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const queryString = buildLeaveBalancesQueryString(
        searchParams.toString(),
        updates
      );
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  // 4. Action handlers
  const handleSearchChange = React.useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setSearchInput(value);
      if (trimmed === parsed.search) return;
      updateUrlParams({
        search: trimmed || null,
        page: DEFAULT_LEAVE_BALANCES_PAGE,
      });
    },
    [parsed.search, updateUrlParams]
  );

  const handleSiteChange = React.useCallback(
    (siteId: string) => {
      updateUrlParams({
        siteId,
        page: DEFAULT_LEAVE_BALANCES_PAGE,
      });
    },
    [updateUrlParams]
  );

  const handleActiveChange = React.useCallback(
    (active: string) => {
      const normalized =
        active === "true" || active === "false" ? active : "all";
      updateUrlParams({
        active: normalized,
        page: DEFAULT_LEAVE_BALANCES_PAGE,
      });
    },
    [updateUrlParams]
  );

  const handleSortChange = React.useCallback(
    (columnId: string, direction: SortDirection) => {
      if (!direction) {
        updateUrlParams({
          sortBy: DEFAULT_LEAVE_BALANCES_SORT_BY,
          sortOrder: DEFAULT_LEAVE_BALANCES_SORT_ORDER,
          page: DEFAULT_LEAVE_BALANCES_PAGE,
        });
      } else {
        updateUrlParams({
          sortBy: columnId,
          sortOrder: direction,
          page: DEFAULT_LEAVE_BALANCES_PAGE,
        });
      }
    },
    [updateUrlParams]
  );

  const handlePageChange = React.useCallback(
    (newPage: number) => {
      updateUrlParams({ page: newPage });
    },
    [updateUrlParams]
  );

  const handlePageSizeChange = React.useCallback(
    (newPageSize: number) => {
      updateUrlParams({
        pageSize: newPageSize,
        page: DEFAULT_LEAVE_BALANCES_PAGE,
      });
    },
    [updateUrlParams]
  );

  const handleRemoveFilter = React.useCallback(
    (filterId: string) => {
      if (filterId === "search") {
        setSearchInput("");
        updateUrlParams({ search: null, page: DEFAULT_LEAVE_BALANCES_PAGE });
      } else if (filterId === "site") {
        updateUrlParams({
          siteId: DEFAULT_LEAVE_BALANCES_SITE_ID,
          page: DEFAULT_LEAVE_BALANCES_PAGE,
        });
      } else if (filterId === "active") {
        updateUrlParams({
          active: DEFAULT_LEAVE_BALANCES_ACTIVE,
          page: DEFAULT_LEAVE_BALANCES_PAGE,
        });
      } else if (filterId === "sort") {
        updateUrlParams({
          sortBy: DEFAULT_LEAVE_BALANCES_SORT_BY,
          sortOrder: DEFAULT_LEAVE_BALANCES_SORT_ORDER,
          page: DEFAULT_LEAVE_BALANCES_PAGE,
        });
      }
    },
    [updateUrlParams]
  );

  const handleResetFilters = React.useCallback(() => {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  // 5. Active filter chip badges derived from current params and site names
  const buildActiveFilters = React.useCallback(
    (availableSites: SiteItem[] = sites) => {
      return buildLeaveBalancesActiveFilters(parsed, availableSites);
    },
    [parsed, sites]
  );

  const activeFilters = React.useMemo(() => {
    return buildActiveFilters(sites);
  }, [buildActiveFilters, sites]);

  return {
    search: parsed.search,
    siteId: parsed.siteId,
    active: parsed.active,
    page: parsed.page,
    pageSize: parsed.pageSize,
    sortBy: parsed.sortBy,
    sortOrder: parsed.sortOrder,
    searchInput,
    setSearchInput,
    activeFilters,
    buildActiveFilters,
    updateUrlParams,
    handleSearchChange,
    handleSiteChange,
    handleActiveChange,
    handleSortChange,
    handlePageChange,
    handlePageSizeChange,
    handleRemoveFilter,
    handleResetFilters,
  };
}
