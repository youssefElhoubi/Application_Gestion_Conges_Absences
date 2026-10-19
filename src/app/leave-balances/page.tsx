"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import { ActiveFilter } from "@/src/components/shared/FilterBar";
import { SortDirection } from "@/src/components/table/DataTable";
import { Badge } from "@/src/components/ui/badge";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import {
  CounterApiClient,
  EmployeeCounterItem,
} from "@/src/lib/api/counter-client";
import { EmployeeApiClient, SiteItem } from "@/src/lib/api/employee-client";
import {
  DEFAULT_LEAVE_BALANCES_SORT_BY,
  DEFAULT_LEAVE_BALANCES_SORT_ORDER,
  DEFAULT_LEAVE_BALANCES_PAGE,
  DEFAULT_LEAVE_BALANCES_PAGE_SIZE,
  DEFAULT_LEAVE_BALANCES_ACTIVE,
  DEFAULT_LEAVE_BALANCES_SITE_ID,
  LEAVE_BALANCES_SORT_LABELS,
} from "@/src/lib/leave-balances/leave-balance.constants";
import { computeAggregateMetrics } from "@/src/lib/leave-balances/balance-metrics";
import type { AggregateLeaveMetrics } from "@/src/lib/leave-balances/leave-balance.types";
import {
  LeaveBalancesKpiCards,
  LeaveBalancesFilterBar,
  LeaveBalancesTable,
  LeaveBalancesLegalBanner,
} from "@/src/components/leave-balances";

function LeaveBalancesOverviewContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Authoritative URL-driven state (Preserve established URL search parameter conventions)
  const urlSearch = searchParams.get("search") || "";
  const urlSiteId = searchParams.get("siteId") || DEFAULT_LEAVE_BALANCES_SITE_ID;
  const urlActive = (searchParams.get("active") as "all" | "true" | "false") || DEFAULT_LEAVE_BALANCES_ACTIVE;
  const urlPage = Math.max(1, Number(searchParams.get("page")) || DEFAULT_LEAVE_BALANCES_PAGE);
  const urlPageSize = Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_LEAVE_BALANCES_PAGE_SIZE);
  const urlSortBy = searchParams.get("sortBy") || DEFAULT_LEAVE_BALANCES_SORT_BY;
  const urlSortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || DEFAULT_LEAVE_BALANCES_SORT_ORDER;

  // Local search query input for smooth typing in SearchInput before debounced URL update
  const [searchInput, setSearchInput] = React.useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = React.useState(urlSearch);

  if (prevUrlSearch !== urlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }

  // Data state
  const [counters, setCounters] = React.useState<EmployeeCounterItem[]>([]);
  const [sites, setSites] = React.useState<SiteItem[]>([]);
  const [totalItems, setTotalItems] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // 2. Helper to synchronize filter and pagination updates into URL search params
  const updateUrlParams = React.useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      setIsLoading(true);
      const current = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          value === "" ||
          (key === "siteId" && value === DEFAULT_LEAVE_BALANCES_SITE_ID) ||
          (key === "active" && value === DEFAULT_LEAVE_BALANCES_ACTIVE) ||
          (key === "page" && Number(value) === DEFAULT_LEAVE_BALANCES_PAGE) ||
          (key === "pageSize" && Number(value) === DEFAULT_LEAVE_BALANCES_PAGE_SIZE) ||
          (key === "sortBy" && value === DEFAULT_LEAVE_BALANCES_SORT_BY && (updates.sortOrder === DEFAULT_LEAVE_BALANCES_SORT_ORDER || !current.get("sortOrder"))) ||
          (key === "sortOrder" && value === DEFAULT_LEAVE_BALANCES_SORT_ORDER && (!current.get("sortBy") || current.get("sortBy") === DEFAULT_LEAVE_BALANCES_SORT_BY))
        ) {
          current.delete(key);
        } else {
          current.set(key, String(value));
        }
      });

      const queryString = current.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // 3. Fetch sites list for dropdown filter
  React.useEffect(() => {
    EmployeeApiClient.listSites()
      .then((s) => setSites(s))
      .catch(() => {});
  }, []);

  // 4. Fetch multi-employee counters whenever URL parameters or refreshKey change
  React.useEffect(() => {
    let isMounted = true;

    CounterApiClient.listCounters({
      page: urlPage,
      pageSize: urlPageSize,
      search: urlSearch,
      siteId: urlSiteId !== "all" ? urlSiteId : undefined,
      active: urlActive !== "all" ? urlActive : undefined,
      sortBy: urlSortBy,
      sortOrder: urlSortOrder,
    })
      .then((response) => {
        if (isMounted) {
          setCounters(response.data);
          setTotalItems(response.meta.totalItems);
          setError(null);
          setIsLoading(false);

          // Correct out-of-bounds pagination if total count changed
          const maxPages = Math.max(1, Math.ceil(response.meta.totalItems / urlPageSize));
          if (urlPage > maxPages) {
            updateUrlParams({ page: maxPages });
          }
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : "Impossible de charger la vue consolidée des soldes.";
          setError(message);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [urlSearch, urlSiteId, urlActive, urlPage, urlPageSize, urlSortBy, urlSortOrder, refreshKey, updateUrlParams]);

  // Aggregate stats from current view for StatCards
  const aggregateMetrics: AggregateLeaveMetrics = React.useMemo(() => {
    return computeAggregateMetrics(counters);
  }, [counters]);

  // Active filters list for FilterBar chips
  const activeFilters = React.useMemo<ActiveFilter[]>(() => {
    const list: ActiveFilter[] = [];
    if (urlSearch) {
      list.push({
        id: "search",
        label: "Recherche",
        valueLabel: `« ${urlSearch} »`,
      });
    }
    if (urlSiteId !== "all") {
      const site = sites.find((s) => String(s.id) === urlSiteId);
      list.push({
        id: "site",
        label: "Site",
        valueLabel: site?.name || urlSiteId,
      });
    }
    if (urlActive !== "all") {
      list.push({
        id: "active",
        label: "Statut",
        valueLabel: urlActive === "true" ? "Actifs uniquement" : "Inactifs uniquement",
      });
    }
    if (urlSortBy !== DEFAULT_LEAVE_BALANCES_SORT_BY || urlSortOrder !== DEFAULT_LEAVE_BALANCES_SORT_ORDER) {
      list.push({
        id: "sort",
        label: "Tri",
        valueLabel: `${LEAVE_BALANCES_SORT_LABELS[urlSortBy] || urlSortBy} (${urlSortOrder === "asc" ? "Croissant" : "Décroissant"})`,
      });
    }
    return list;
  }, [urlSearch, urlSiteId, urlActive, urlSortBy, urlSortOrder, sites]);

  const handleRemoveFilter = (filterId: string) => {
    if (filterId === "search") {
      setSearchInput("");
      updateUrlParams({ search: null, page: DEFAULT_LEAVE_BALANCES_PAGE });
    }
    if (filterId === "site") updateUrlParams({ siteId: DEFAULT_LEAVE_BALANCES_SITE_ID, page: DEFAULT_LEAVE_BALANCES_PAGE });
    if (filterId === "active") updateUrlParams({ active: "all", page: DEFAULT_LEAVE_BALANCES_PAGE });
    if (filterId === "sort") updateUrlParams({ sortBy: DEFAULT_LEAVE_BALANCES_SORT_BY, sortOrder: DEFAULT_LEAVE_BALANCES_SORT_ORDER, page: DEFAULT_LEAVE_BALANCES_PAGE });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  };

  const handleSortChange = (columnId: string, direction: SortDirection) => {
    if (!direction) {
      updateUrlParams({ sortBy: DEFAULT_LEAVE_BALANCES_SORT_BY, sortOrder: DEFAULT_LEAVE_BALANCES_SORT_ORDER, page: DEFAULT_LEAVE_BALANCES_PAGE });
    } else {
      updateUrlParams({ sortBy: columnId, sortOrder: direction, page: DEFAULT_LEAVE_BALANCES_PAGE });
    }
  };

  if (error) {
    return (
      <PageContainer>
        <ErrorState
          title="Erreur lors de la récupération des soldes"
          message={error}
          onRetry={() => setRefreshKey((k) => k + 1)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="Soldes et Compteurs de Congés"
        description="Vue consolidée des droits acquis, congés consommés et soldes nets disponibles selon le Code du Travail marocain (Loi 65-99)."
        badge={
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 flex items-center gap-1 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            Loi n° 65-99 (Art. 231 & 232)
          </Badge>
        }
      />

      {/* KPI StatCards Row */}
      <LeaveBalancesKpiCards
        totalItems={totalItems}
        metrics={aggregateMetrics}
        isLoading={isLoading}
      />

      {/* Search & Filter Bar */}
      <LeaveBalancesFilterBar
        searchValue={searchInput}
        onSearchChange={(q) => {
          setSearchInput(q);
          updateUrlParams({ search: q.trim() || null, page: DEFAULT_LEAVE_BALANCES_PAGE });
        }}
        sites={sites}
        selectedSiteId={urlSiteId}
        onSiteChange={(siteId) => updateUrlParams({ siteId, page: DEFAULT_LEAVE_BALANCES_PAGE })}
        selectedActive={urlActive}
        onActiveChange={(active) => updateUrlParams({ active, page: DEFAULT_LEAVE_BALANCES_PAGE })}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onResetFilters={handleResetFilters}
        totalResults={totalItems}
      />

      {/* Main Consolidated DataTable with Server-side Sorting, Pagination, and Mobile Cards */}
      <LeaveBalancesTable
        counters={counters}
        totalItems={totalItems}
        isLoading={isLoading}
        page={urlPage}
        pageSize={urlPageSize}
        sortBy={urlSortBy}
        sortDirection={urlSortOrder as SortDirection}
        onSortChange={handleSortChange}
        onPageChange={(page) => updateUrlParams({ page })}
        onPageSizeChange={(newSize) => updateUrlParams({ pageSize: newSize, page: DEFAULT_LEAVE_BALANCES_PAGE })}
        onResetFilters={handleResetFilters}
        onRowClick={(row) => router.push(`/leave-balances/${encodeURIComponent(row.employeeId)}`)}
      />

      {/* Statutory Rules Informational Banner */}
      <LeaveBalancesLegalBanner />
    </PageContainer>
  );
}

export default function LeaveBalancesPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="space-y-6 animate-pulse">
            <div className="h-20 bg-muted/60 rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-muted/40 rounded-xl" />
              ))}
            </div>
            <div className="h-96 bg-muted/30 rounded-xl" />
          </div>
        </PageContainer>
      }
    >
      <LeaveBalancesOverviewContent />
    </React.Suspense>
  );
}

