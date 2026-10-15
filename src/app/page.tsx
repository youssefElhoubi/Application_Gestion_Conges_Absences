"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, RotateCcw } from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import {
  DashboardApiClient,
  DashboardSummaryResponse,
  DashboardMetricsResponse,
  PublicHolidayItem,
  SiteItem,
} from "@/src/lib/api/dashboard-client";
import { AbsenceListItem } from "@/src/lib/api/absence-client";

import {
  DashboardStats,
  DashboardActionRequired,
  DashboardAbsenceOverview,
  DashboardSiteDistribution,
  DashboardRecentRequests,
  DashboardUpcomingHolidays,
  DashboardQuickNavigation,
} from "@/src/components/dashboard";

function DashboardContent() {
  // Filters state
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | undefined>(undefined);
  const [periodMode, setPeriodMode] = React.useState<"current_year" | "current_month" | "all_time">("current_year");

  // Sites list for dropdown
  const [sites, setSites] = React.useState<SiteItem[]>([]);

  // Section data states
  const [summaryData, setSummaryData] = React.useState<DashboardSummaryResponse | null>(null);
  const [metricsData, setMetricsData] = React.useState<DashboardMetricsResponse | null>(null);
  const [pendingAbsences, setPendingAbsences] = React.useState<AbsenceListItem[]>([]);
  const [totalPending, setTotalPending] = React.useState(0);
  const [recentAbsences, setRecentAbsences] = React.useState<AbsenceListItem[]>([]);
  const [holidays, setHolidays] = React.useState<PublicHolidayItem[]>([]);

  // Section loading states (initialized to true for mount)
  const [isLoadingSummary, setIsLoadingSummary] = React.useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = React.useState(true);
  const [isLoadingPending, setIsLoadingPending] = React.useState(true);
  const [isLoadingRecent, setIsLoadingRecent] = React.useState(true);
  const [isLoadingHolidays, setIsLoadingHolidays] = React.useState(true);

  // Section error states (supports partial failure handling)
  const [summaryError, setSummaryError] = React.useState<string | null>(null);
  const [metricsError, setMetricsError] = React.useState<string | null>(null);
  const [pendingError, setPendingError] = React.useState<string | null>(null);
  const [recentError, setRecentError] = React.useState<string | null>(null);
  const [holidaysError, setHolidaysError] = React.useState<string | null>(null);

  // Global refresh key
  const [refreshKey, setRefreshKey] = React.useState(0);

  // 1. Load sites once on mount
  React.useEffect(() => {
    DashboardApiClient.getSites()
      .then((data) => setSites(data))
      .catch(() => setSites([]));
  }, []);

  // 2. Fetch metrics & summary when site, period, or refreshKey changes
  React.useEffect(() => {
    let isMounted = true;

    // Fetch Metrics
    DashboardApiClient.getMetrics({
      siteId: selectedSiteId,
      periodMode,
    })
      .then((res) => {
        if (isMounted) {
          setMetricsData(res);
          setMetricsError(null);
          setIsLoadingMetrics(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur de chargement des métriques.";
          setMetricsError(msg);
          setIsLoadingMetrics(false);
        }
      });

    // Fetch Summary (Categories & Sites)
    DashboardApiClient.getSummary({
      siteId: selectedSiteId,
      year: new Date().getFullYear(),
      month: periodMode === "current_month" ? new Date().getMonth() + 1 : undefined,
    })
      .then((res) => {
        if (isMounted) {
          setSummaryData(res);
          setSummaryError(null);
          setIsLoadingSummary(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur de chargement du résumé.";
          setSummaryError(msg);
          setIsLoadingSummary(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSiteId, periodMode, refreshKey]);

  // 3. Fetch Pending requests
  React.useEffect(() => {
    let isMounted = true;

    DashboardApiClient.getPendingAbsences(5, selectedSiteId)
      .then((res) => {
        if (isMounted) {
          setPendingAbsences(res.data);
          setTotalPending(res.total);
          setPendingError(null);
          setIsLoadingPending(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur de chargement des demandes en attente.";
          setPendingError(msg);
          setIsLoadingPending(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSiteId, refreshKey]);

  // 4. Fetch Recent requests
  React.useEffect(() => {
    let isMounted = true;

    DashboardApiClient.getRecentAbsences(6, selectedSiteId)
      .then((res) => {
        if (isMounted) {
          setRecentAbsences(res.data);
          setRecentError(null);
          setIsLoadingRecent(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur de chargement des activités récentes.";
          setRecentError(msg);
          setIsLoadingRecent(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSiteId, refreshKey]);

  // 5. Fetch Upcoming Public Holidays
  React.useEffect(() => {
    let isMounted = true;

    DashboardApiClient.getUpcomingPublicHolidays(4)
      .then((res) => {
        if (isMounted) {
          setHolidays(res);
          setHolidaysError(null);
          setIsLoadingHolidays(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Erreur de chargement des jours fériés.";
          setHolidaysError(msg);
          setIsLoadingHolidays(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Handlers for user interactions
  const handleSiteChange = (val: string) => {
    const siteId = val === "ALL" ? undefined : Number(val);
    setSelectedSiteId(siteId);
    setIsLoadingMetrics(true);
    setIsLoadingSummary(true);
    setIsLoadingPending(true);
    setIsLoadingRecent(true);
  };

  const handlePeriodChange = (val: "current_year" | "current_month" | "all_time") => {
    setPeriodMode(val);
    setIsLoadingMetrics(true);
    setIsLoadingSummary(true);
  };

  const handleRefreshAll = () => {
    setIsLoadingMetrics(true);
    setIsLoadingSummary(true);
    setIsLoadingPending(true);
    setIsLoadingRecent(true);
    setIsLoadingHolidays(true);
    setRefreshKey((k) => k + 1);
  };

  return (
    <PageContainer>
      <div className="space-y-8 pb-12">
        {/* Page Header with Action Controls */}
        <PageHeader
          title="Tableau de bord RH"
          description="Vue d'ensemble opérationnelle des collaborateurs, demandes de congés et indicateurs d'absence."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Site Scope Filter */}
              <div className="w-44 sm:w-52">
                <Select
                  value={selectedSiteId ? String(selectedSiteId) : "ALL"}
                  onChange={(e) => handleSiteChange(e.target.value)}
                  className="h-9 text-xs"
                >
                  <option value="ALL">Tous les sites</option>
                  {sites.map((site) => (
                    <option key={site.id} value={String(site.id)}>
                      {site.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Period Selector */}
              <div className="w-36 sm:w-44">
                <Select
                  value={periodMode}
                  onChange={(e) => handlePeriodChange(e.target.value as "current_year" | "current_month" | "all_time")}
                  className="h-9 text-xs"
                >
                  <option value="current_year">Année en cours ({new Date().getFullYear()})</option>
                  <option value="current_month">Mois en cours</option>
                  <option value="all_time">Historique complet</option>
                </Select>
              </div>

              {/* Refresh button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                title="Actualiser les indicateurs"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only">Actualiser</span>
              </Button>

              {/* Primary Quick Action */}
              <Link
                href="/absences"
                className="inline-flex items-center justify-center font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs h-9 px-3.5 text-xs rounded-md gap-1.5 select-none transition-all cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Enregistrer une absence</span>
              </Link>
            </div>
          }
        />

        {/* 1. High-Level KPIs */}
        <section aria-label="Indicateurs clés">
          <DashboardStats
            metrics={metricsData}
            summaryKpis={summaryData?.kpis ?? null}
            isLoading={isLoadingMetrics || isLoadingSummary}
            error={metricsError || summaryError}
            onRetry={handleRefreshAll}
            siteId={selectedSiteId}
          />
        </section>

        {/* 2. Items Requiring Attention: Pending Requests */}
        <section aria-label="Demandes en attente de validation">
          <DashboardActionRequired
            pendingAbsences={pendingAbsences}
            totalPending={totalPending}
            isLoading={isLoadingPending}
            error={pendingError}
            onRetry={handleRefreshAll}
            siteId={selectedSiteId}
          />
        </section>

        {/* 3. Absence Activity Overview & Site Distribution (Two Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <DashboardAbsenceOverview
              categories={summaryData?.categoryBreakdown ?? []}
              pendingBreakdown={metricsData?.pendingRequestsByType ?? []}
              isLoading={isLoadingSummary}
              error={summaryError}
              onRetry={handleRefreshAll}
              siteId={selectedSiteId}
            />
          </div>

          <div className="lg:col-span-5">
            <DashboardSiteDistribution
              sites={summaryData?.employeesBySite ?? []}
              totalEmployees={metricsData?.activeEmployees ?? summaryData?.kpis.totalActiveEmployees ?? 0}
              isLoading={isLoadingSummary}
              error={summaryError}
              onRetry={handleRefreshAll}
              selectedSiteId={selectedSiteId}
              onSelectSite={(id) => {
                setSelectedSiteId(id);
                setIsLoadingMetrics(true);
                setIsLoadingSummary(true);
                setIsLoadingPending(true);
                setIsLoadingRecent(true);
              }}
            />
          </div>
        </div>

        {/* 4. Recent Requests & Upcoming Public Holidays */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <DashboardRecentRequests
              recentAbsences={recentAbsences}
              isLoading={isLoadingRecent}
              error={recentError}
              onRetry={handleRefreshAll}
              siteId={selectedSiteId}
            />
          </div>

          <div className="lg:col-span-5">
            <DashboardUpcomingHolidays
              holidays={holidays}
              isLoading={isLoadingHolidays}
              error={holidaysError}
              onRetry={handleRefreshAll}
            />
          </div>
        </div>

        {/* 5. Quick Navigation & Operational Shortcuts */}
        <section aria-label="Raccourcis opérationnels">
          <DashboardQuickNavigation />
        </section>
      </div>
    </PageContainer>
  );
}

export default function DashboardPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="space-y-6 py-6 animate-pulse">
            <div className="h-10 w-64 bg-muted rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-muted/40" />
              ))}
            </div>
            <div className="h-48 rounded-xl bg-muted/30" />
          </div>
        </PageContainer>
      }
    >
      <DashboardContent />
    </React.Suspense>
  );
}
