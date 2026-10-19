"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import { Badge } from "@/src/components/ui/badge";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import {
  LeaveBalancesKpiCards,
  LeaveBalancesFilterBar,
  LeaveBalancesTable,
  LeaveBalancesLegalBanner,
  useLeaveBalancesUrlState,
  useLeaveBalancesData,
} from "@/src/components/leave-balances";

function LeaveBalancesOverviewContent() {
  const router = useRouter();

  // 1. Authoritative URL-driven state & action handlers
  const urlState = useLeaveBalancesUrlState();

  // 2. Remote multi-employee counter data & site metadata
  const data = useLeaveBalancesData({
    page: urlState.page,
    pageSize: urlState.pageSize,
    search: urlState.search,
    siteId: urlState.siteId,
    active: urlState.active,
    sortBy: urlState.sortBy,
    sortOrder: urlState.sortOrder,
    onPaginationCorrection: urlState.handlePageChange,
  });

  // 3. Active filter chips derived from URL state and loaded sites
  const activeFilters = React.useMemo(() => {
    return urlState.buildActiveFilters(data.sites);
  }, [urlState, data.sites]);

  if (data.error) {
    return (
      <PageContainer>
        <ErrorState
          title="Erreur lors de la récupération des soldes"
          message={data.error}
          onRetry={data.refresh}
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
          <Badge
            variant="outline"
            className="text-xs bg-primary/10 text-primary border-primary/20 flex items-center gap-1 font-semibold"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Loi n° 65-99 (Art. 231 & 232)
          </Badge>
        }
      />

      {/* KPI StatCards Row */}
      <LeaveBalancesKpiCards
        totalItems={data.totalItems}
        metrics={data.aggregateMetrics}
        isLoading={data.isLoading}
      />

      {/* Search & Filter Bar */}
      <LeaveBalancesFilterBar
        searchValue={urlState.searchInput}
        onSearchChange={urlState.handleSearchChange}
        sites={data.sites}
        selectedSiteId={urlState.siteId}
        onSiteChange={urlState.handleSiteChange}
        selectedActive={urlState.active}
        onActiveChange={urlState.handleActiveChange}
        activeFilters={activeFilters}
        onRemoveFilter={urlState.handleRemoveFilter}
        onResetFilters={urlState.handleResetFilters}
        totalResults={data.totalItems}
      />

      {/* Main Consolidated DataTable with Server-side Sorting, Pagination, and Mobile Cards */}
      <LeaveBalancesTable
        counters={data.counters}
        totalItems={data.totalItems}
        isLoading={data.isLoading}
        page={urlState.page}
        pageSize={urlState.pageSize}
        sortBy={urlState.sortBy}
        sortDirection={urlState.sortOrder}
        onSortChange={urlState.handleSortChange}
        onPageChange={urlState.handlePageChange}
        onPageSizeChange={urlState.handlePageSizeChange}
        onResetFilters={urlState.handleResetFilters}
        onRowClick={(row) =>
          router.push(`/leave-balances/${encodeURIComponent(row.employeeId)}`)
        }
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
