"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Users,
  CalendarCheck,
  Sparkles,
  Building2,
  ExternalLink,
  ShieldCheck,
  Info,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import { StatCard } from "@/src/components/shared/StatCard";
import { FilterBar, ActiveFilter } from "@/src/components/shared/FilterBar";
import { DataTable, DataTableColumn, SortDirection } from "@/src/components/table/DataTable";
import { Select } from "@/src/components/ui/select";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import {
  CounterApiClient,
  EmployeeCounterItem,
} from "@/src/lib/api/counter-client";
import { EmployeeApiClient, SiteItem } from "@/src/lib/api/employee-client";
import { formatDate } from "@/src/lib/utils";

function LeaveBalancesOverviewContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Authoritative URL-driven state (Preserve established URL search parameter conventions)
  const urlSearch = searchParams.get("search") || "";
  const urlSiteId = searchParams.get("siteId") || "all";
  const urlActive = (searchParams.get("active") as "all" | "true" | "false") || "true";
  const urlPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const urlPageSize = Math.max(1, Number(searchParams.get("pageSize")) || 10);
  const urlSortBy = searchParams.get("sortBy") || "fullName";
  const urlSortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "asc";

  // Local search query input for smooth typing in SearchInput before debounced URL update
  const [searchInput, setSearchInput] = React.useState(urlSearch);

  // Sync local search input if URL changes externally
  React.useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

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
      const current = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          value === "" ||
          (key === "siteId" && value === "all") ||
          (key === "active" && value === "true") ||
          (key === "page" && Number(value) === 1) ||
          (key === "pageSize" && Number(value) === 10) ||
          (key === "sortBy" && value === "fullName" && (updates.sortOrder === "asc" || !current.get("sortOrder"))) ||
          (key === "sortOrder" && value === "asc" && (!current.get("sortBy") || current.get("sortBy") === "fullName"))
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
    setIsLoading(true);

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
  }, [urlSearch, urlSiteId, urlActive, urlPage, urlPageSize, urlSortBy, urlSortOrder, refreshKey]);

  // 5. Reset or correct pagination when filter changes make current page invalid
  React.useEffect(() => {
    if (!isLoading) {
      const maxPages = Math.max(1, Math.ceil(totalItems / urlPageSize));
      if (urlPage > maxPages) {
        updateUrlParams({ page: maxPages });
      }
    }
  }, [totalItems, urlPage, urlPageSize, isLoading, updateUrlParams]);

  // Aggregate stats from current view for StatCards
  const aggregateMetrics = React.useMemo(() => {
    if (counters.length === 0) {
      return {
        totalAccrued: 0,
        totalTaken: 0,
        totalRecovery: 0,
        avgAvailable: 0,
      };
    }

    const totalAccrued = counters.reduce((sum, c) => sum + c.statutoryAccruedDays, 0);
    const totalTaken = counters.reduce((sum, c) => sum + c.totalApprovedDeductions, 0);
    const totalRecovery = counters.reduce((sum, c) => sum + c.activeRecoveryCreditDays, 0);
    const totalAvailable = counters.reduce((sum, c) => sum + c.netAvailableBalance, 0);
    const avgAvailable = Math.round((totalAvailable / counters.length) * 10) / 10;

    return {
      totalAccrued: Math.round(totalAccrued * 10) / 10,
      totalTaken: Math.round(totalTaken * 10) / 10,
      totalRecovery: Math.round(totalRecovery * 10) / 10,
      avgAvailable,
    };
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
    if (urlSortBy !== "fullName" || urlSortOrder !== "asc") {
      const sortLabels: Record<string, string> = {
        fullName: "Nom",
        employeeId: "Matricule",
        hireDate: "Date d'embauche",
        site: "Site",
      };
      list.push({
        id: "sort",
        label: "Tri",
        valueLabel: `${sortLabels[urlSortBy] || urlSortBy} (${urlSortOrder === "asc" ? "Croissant" : "Décroissant"})`,
      });
    }
    return list;
  }, [urlSearch, urlSiteId, urlActive, urlSortBy, urlSortOrder, sites]);

  const handleRemoveFilter = (filterId: string) => {
    if (filterId === "search") {
      setSearchInput("");
      updateUrlParams({ search: null, page: 1 });
    }
    if (filterId === "site") updateUrlParams({ siteId: "all", page: 1 });
    if (filterId === "active") updateUrlParams({ active: "all", page: 1 });
    if (filterId === "sort") updateUrlParams({ sortBy: "fullName", sortOrder: "asc", page: 1 });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  };

  const handleSortChange = (columnId: string, direction: SortDirection) => {
    if (!direction) {
      updateUrlParams({ sortBy: "fullName", sortOrder: "asc", page: 1 });
    } else {
      updateUrlParams({ sortBy: columnId, sortOrder: direction, page: 1 });
    }
  };

  // Table Columns Definition
  const columns: DataTableColumn<EmployeeCounterItem>[] = [
    {
      id: "employeeId",
      header: "Matricule",
      sortable: true,
      className: "w-28",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
          {row.employeeId}
        </span>
      ),
    },
    {
      id: "fullName",
      header: "Collaborateur",
      sortable: true,
      cell: (row) => {
        const initials = row.fullName
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase();

        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                {initials}
              </div>
              {row.active !== undefined && (
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card flex items-center justify-center ${
                    row.active ? "bg-emerald-500 text-white" : "bg-zinc-400 text-white"
                  }`}
                  title={row.active ? "Actif" : "Inactif"}
                >
                  {row.active ? (
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  ) : (
                    <XCircle className="h-2.5 w-2.5" />
                  )}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <Link
                href={`/employees/${encodeURIComponent(row.employeeId)}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-foreground hover:text-primary transition-colors hover:underline flex items-center gap-1 group text-sm truncate"
              >
                <span>{row.fullName}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
              {row.jobTitle && (
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {row.jobTitle}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "site",
      header: "Site",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
          <span>{row.siteName || "Casablanca"}</span>
        </div>
      ),
    },
    {
      id: "hireDate",
      header: "Ancienneté & Éligibilité",
      sortable: true,
      cell: (row) => (
        <div className="space-y-1 min-w-[160px]">
          <div className="text-xs font-medium text-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>
              {row.serviceYears} an{row.serviceYears > 1 ? "s" : ""} • {row.serviceMonths} mois
            </span>
          </div>
          {row.hireDate && (
            <div className="text-[11px] text-muted-foreground">
              Embauche: {formatDate(row.hireDate)}
            </div>
          )}
          <div>
            {row.isEligibleForAnnualLeave ? (
              <Badge
                variant="outline"
                className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium"
              >
                Éligible (Loi 65-99)
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-medium"
              >
                Acquisition (&lt; 6 mois)
              </Badge>
            )}
            {row.calculationBreakdown.isMinorRate && (
              <Badge
                variant="outline"
                className="ml-1 text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20 font-medium"
              >
                Mineur (2 j/m)
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "statutoryAccruedDays",
      header: "Droits Acquis",
      align: "center",
      cell: (row) => (
        <div className="flex flex-col items-center min-w-[90px]">
          <span className="font-bold text-foreground text-sm">
            {row.statutoryAccruedDays.toFixed(1)} j
          </span>
          <span className="text-[10px] text-muted-foreground">
            {row.calculationBreakdown.monthlyRateApplied} j/mois
            {row.calculationBreakdown.maxYearlyCapEnforced && " (Plafonné)"}
          </span>
        </div>
      ),
    },
    {
      id: "totalApprovedDeductions",
      header: "Congés Pris",
      align: "center",
      cell: (row) => (
        <div className="flex flex-col items-center min-w-[90px]">
          <span className="font-semibold text-muted-foreground text-sm">
            {row.totalApprovedDeductions.toFixed(1)} j
          </span>
          <span className="text-[10px] text-muted-foreground">Décomptés</span>
        </div>
      ),
    },
    {
      id: "activeRecoveryCreditDays",
      header: "Crédits Récupération",
      align: "center",
      cell: (row) => (
        <div className="flex flex-col items-center min-w-[110px]">
          <div className="flex items-center gap-1 text-sm font-semibold text-purple-700 dark:text-purple-300">
            <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>{row.activeRecoveryCreditDays.toFixed(1)} j</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {row.calculationBreakdown.unconsumedHolidayCreditsCount} férié(s) travaillé(s)
          </span>
        </div>
      ),
    },
    {
      id: "netAvailableBalance",
      header: "Solde Net Disponible",
      align: "center",
      cell: (row) => {
        const balance = row.netAvailableBalance;
        const isPositive = balance > 0;
        const isHigh = balance >= 5;

        return (
          <div className="flex flex-col items-center min-w-[130px]">
            <div
              className={`px-3 py-1 rounded-xl font-extrabold text-sm sm:text-base border shadow-2xs flex items-center gap-1.5 ${
                isHigh
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                  : isPositive
                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                  : "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30"
              }`}
            >
              <span>{balance.toFixed(1)}</span>
              <span className="text-xs font-semibold">jours ouvrés</span>
            </div>
            {!row.isEligibleForAnnualLeave && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-0.5">
                <AlertCircle className="h-2.5 w-2.5" /> Droit bloqué légalement
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Action",
      align: "right",
      cell: (row) => (
        <Button
          variant="outline"
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/employees/${encodeURIComponent(row.employeeId)}`);
          }}
          className="text-xs group"
        >
          <span>Détail</span>
          <ExternalLink className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      ),
    },
  ];

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Effectif Répertorié"
          value={totalItems}
          description="Collaborateurs suivis au registre"
          icon={<Users className="h-5 w-5" />}
          isLoading={isLoading}
          valueColor="default"
        />
        <StatCard
          title="Moyenne Disponible"
          value={`${aggregateMetrics.avgAvailable} j`}
          description="Moyenne nette par collaborateur"
          icon={<Briefcase className="h-5 w-5" />}
          isLoading={isLoading}
          valueColor="success"
        />
        <StatCard
          title="Droits Acquis (Page)"
          value={`${aggregateMetrics.totalAccrued} j`}
          description="Cumul statutaire sur l'affichage actuel"
          icon={<CalendarCheck className="h-5 w-5" />}
          isLoading={isLoading}
          valueColor="primary"
        />
        <StatCard
          title="Crédits Récupération"
          value={`${aggregateMetrics.totalRecovery} j`}
          description="Droits fériés sans date d'expiration"
          icon={<Sparkles className="h-5 w-5" />}
          isLoading={isLoading}
          valueColor="default"
        />
      </div>

      {/* Search & Filter Bar */}
      <FilterBar
        searchValue={searchInput}
        onSearchChange={(q) => {
          setSearchInput(q);
          updateUrlParams({ search: q.trim() || null, page: 1 });
        }}
        searchPlaceholder="Rechercher par collaborateur ou matricule..."
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onResetFilters={handleResetFilters}
        totalResults={totalItems}
      >
        {/* Site Filter */}
        <div className="w-44">
          <Select
            value={urlSiteId}
            onChange={(e) => updateUrlParams({ siteId: e.target.value, page: 1 })}
            options={[
              { value: "all", label: "Tous les sites" },
              ...sites.map((s) => ({ value: String(s.id), label: s.name })),
            ]}
          />
        </div>

        {/* Status Filter */}
        <div className="w-40">
          <Select
            value={urlActive}
            onChange={(e) => updateUrlParams({ active: e.target.value, page: 1 })}
            options={[
              { value: "true", label: "Actifs uniquement" },
              { value: "false", label: "Inactifs uniquement" },
              { value: "all", label: "Tous les statuts" },
            ]}
          />
        </div>
      </FilterBar>

      {/* Main Consolidated DataTable with Server-side Sorting and Pagination */}
      <DataTable
        columns={columns}
        data={counters}
        keyExtractor={(row) => row.employeeId}
        isLoading={isLoading}
        emptyTitle="Aucun solde trouvé"
        emptyDescription="Aucun collaborateur ne correspond aux critères de recherche ou aux filtres sélectionnés."
        emptyIcon={<Briefcase className="h-10 w-10 text-muted-foreground/60" />}
        emptyActionLabel="Réinitialiser les filtres"
        onEmptyAction={handleResetFilters}
        page={urlPage}
        pageSize={urlPageSize}
        totalItems={totalItems}
        pageSizeOptions={[10, 25, 50]}
        sortBy={urlSortBy}
        sortDirection={urlSortOrder as SortDirection}
        onSortChange={handleSortChange}
        onPageChange={(page) => updateUrlParams({ page })}
        onPageSizeChange={(newSize) => updateUrlParams({ pageSize: newSize, page: 1 })}
        onRowClick={(row) => router.push(`/employees/${encodeURIComponent(row.employeeId)}`)}
      />

      {/* Statutory Rules Informational Banner */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-muted/20 p-5 text-xs text-muted-foreground space-y-2 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-foreground text-sm">
          <Info className="h-4 w-4 text-primary" />
          Règles de Calcul Statutaires — Code du Travail Marocain (Loi n° 65-99)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 leading-relaxed">
          <div className="space-y-1">
            <span className="font-semibold text-foreground">Acquisition des congés (Art. 231)</span>
            <p>
              1.5 jour ouvrable par mois complet de service effectif (2.0 jours pour les salariés mineurs de moins de 18 ans). L&apos;ouverture des droits à consommation requiert 6 mois d&apos;ancienneté continue.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-foreground">Majoration d&apos;ancienneté (Art. 232)</span>
            <p>
              Majoration de 1.5 jour ouvrable supplémentaire par période entière de 5 années de service, plafonnée à un total statutaire de 30 jours ouvrables par an.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-foreground">Repos Compensateur Férié</span>
            <p>
              Les crédits accordés pour travail lors d&apos;un jour férié officiel n&apos;expirent jamais et sont consommés prioritairement selon la règle chronologique FIFO.
            </p>
          </div>
        </div>
      </div>
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
