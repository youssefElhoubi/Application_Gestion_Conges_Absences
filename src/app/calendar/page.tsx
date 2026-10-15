"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  Sun,
  Moon,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import { CalendarGrid } from "@/src/components/calendar/CalendarGrid";
import {
  buildMonthGrid,
  getAdjacentMonth,
  MONTH_NAMES_FR,
} from "@/src/lib/calendar/calendar-grid";
import {
  buildEventsLookup,
} from "@/src/lib/calendar/calendar-events";
import { AbsenceApiClient, AbsenceListItem } from "@/src/lib/api/absence-client";
import { HolidayApiClient, PublicHolidayItem } from "@/src/lib/api/holiday-client";

function CalendarPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Stable reference to current date
  const now = React.useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 to 12

  // 1. Authoritative period state driven by URL search params with dynamic fallbacks
  const urlYear = Number(searchParams.get("year"));
  const urlMonth = Number(searchParams.get("month"));

  const year = !isNaN(urlYear) && urlYear >= 1970 && urlYear <= 2100 ? urlYear : currentYear;
  const month = !isNaN(urlMonth) && urlMonth >= 1 && urlMonth <= 12 ? urlMonth : currentMonth;

  // 2. Data State
  const [absences, setAbsences] = React.useState<AbsenceListItem[]>([]);
  const [holidays, setHolidays] = React.useState<PublicHolidayItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // 3. Synchronize navigation into URL search params
  const updatePeriod = React.useCallback(
    (newYear: number, newMonth: number) => {
      const params = new URLSearchParams(searchParams.toString());

      params.set("year", String(newYear));
      params.set("month", String(newMonth));

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // 4. Navigation Actions
  const goToPrevMonth = React.useCallback(() => {
    const prev = getAdjacentMonth(year, month, "prev");
    updatePeriod(prev.year, prev.month);
  }, [year, month, updatePeriod]);

  const goToNextMonth = React.useCallback(() => {
    const next = getAdjacentMonth(year, month, "next");
    updatePeriod(next.year, next.month);
  }, [year, month, updatePeriod]);

  const goToToday = React.useCallback(() => {
    updatePeriod(currentYear, currentMonth);
  }, [currentYear, currentMonth, updatePeriod]);

  // 5. Build Month Grid with pure timezone-safe date math
  const grid = React.useMemo(() => {
    return buildMonthGrid(year, month, now);
  }, [year, month, now]);

  // 6. Fetch verified absence and public holiday data for the visible calendar period
  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const firstCellDateKey = grid.cells[0]?.dateKey;
    const lastCellDateKey = grid.cells[grid.cells.length - 1]?.dateKey;

    if (!firstCellDateKey || !lastCellDateKey) return;

    // Determine all years spanned by visible cells (e.g., Dec 2025 to Jan 2026)
    const startYear = parseInt(firstCellDateKey.split("-")[0], 10);
    const endYear = parseInt(lastCellDateKey.split("-")[0], 10);
    const holidayYears = Array.from(new Set([year, startYear, endYear]));

    Promise.all([
      // 1. Fetch absences overlapping the visible grid range
      AbsenceApiClient.listAbsences({
        startDate: firstCellDateKey,
        endDate: lastCellDateKey,
        pageSize: 300,
        status: "ALL",
      }),
      // 2. Fetch public holidays for visible year(s)
      Promise.all(
        holidayYears.map((y) =>
          HolidayApiClient.listHolidays({ year: y, pageSize: 100 }).catch(() => ({
            data: [],
            meta: { totalItems: 0, totalPages: 0, page: 1, pageSize: 100, hasNextPage: false, hasPrevPage: false },
          }))
        )
      ),
    ])
      .then(([absencesRes, holidayResults]) => {
        if (!isMounted) return;

        setAbsences(absencesRes.data || []);

        // Deduplicate public holidays by ID
        const allHolidays = holidayResults.flatMap((r) => r.data || []);
        const uniqueHolidays = Array.from(
          new Map(allHolidays.map((h) => [String(h.id), h])).values()
        );
        setHolidays(uniqueHolidays);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Impossible de charger les données du calendrier.";
        setError(msg);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [grid, refreshKey, year]);

  // 7. Build Events Lookup Dictionary
  const eventsLookup = React.useMemo(() => {
    const dateKeys = grid.cells.map((c) => c.dateKey);
    return buildEventsLookup(dateKeys, absences, holidays);
  }, [grid.cells, absences, holidays]);

  // Quick picker select options
  const monthOptions = React.useMemo(() => {
    return MONTH_NAMES_FR.map((name, idx) => ({
      value: String(idx + 1),
      label: name,
    }));
  }, []);

  const yearOptions = React.useMemo(() => {
    const startYear = currentYear - 3;
    const endYear = currentYear + 4;
    const options = [];
    for (let y = startYear; y <= endYear; y++) {
      options.push({ value: String(y), label: String(y) });
    }
    return options;
  }, [currentYear]);

  // Summary Metrics for currently visible month
  const approvedCount = React.useMemo(
    () => absences.filter((a) => a.status === "APPROVED").length,
    [absences]
  );
  const pendingCount = React.useMemo(
    () => absences.filter((a) => a.status === "PENDING").length,
    [absences]
  );
  const visibleHolidaysCount = React.useMemo(() => {
    const currentMonthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    return holidays.filter((h) => h.date.startsWith(currentMonthPrefix)).length;
  }, [holidays, year, month]);

  return (
    <PageContainer>
      {/* 1. Page Header */}
      <PageHeader
        title="Calendrier des Absences"
        description="Planning mensuel consolidé des congés payés, autorisations d'absence et jours fériés légaux de l'entreprise."
        breadcrumbs={
          <nav className="flex items-center gap-1.5" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-foreground transition-colors">
              Tableau de bord
            </Link>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-foreground font-medium">Calendrier mensuel</span>
          </nav>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Indicator */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20 shadow-xs"
              role="status"
              aria-label="Mode d'affichage: Vue Mensuelle"
            >
              <CalendarRange className="h-4 w-4 shrink-0" />
              <span>Vue Mensuelle</span>
            </div>
          </div>
        }
      />

      {/* 2. Month Navigation Toolbar & Quick Stats */}
      <div className="flex flex-col gap-3.5 p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Navigation Controls: Previous / Month Label / Next & Today */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between sm:justify-start w-full sm:w-auto">
            {/* Today Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToToday}
              leftIcon={<Calendar className="h-4 w-4" />}
              className="text-xs font-medium"
            >
              Aujourd&apos;hui
            </Button>

            {/* Stepper Controls */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goToPrevMonth}
                aria-label="Mois précédent"
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden md:inline text-xs ml-1 font-medium">Précédent</span>
              </Button>

              {/* Prominent Month & Year Heading */}
              <h2
                className="text-sm sm:text-base font-bold text-foreground min-w-[140px] sm:min-w-[170px] text-center tracking-tight capitalize select-none"
                aria-live="polite"
              >
                {grid.monthNameFr} {grid.year}
              </h2>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goToNextMonth}
                aria-label="Mois suivant"
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <span className="hidden md:inline text-xs mr-1 font-medium">Suivant</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Month & Year Select Jumpers */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <div className="w-32">
              <Select
                value={String(month)}
                onChange={(e) => updatePeriod(year, Number(e.target.value))}
                options={monthOptions}
                aria-label="Sélectionner le mois"
                className="h-8 text-xs font-medium"
              />
            </div>

            <div className="w-24">
              <Select
                value={String(year)}
                onChange={(e) => updatePeriod(Number(e.target.value), month)}
                options={yearOptions}
                aria-label="Sélectionner l'année"
                className="h-8 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Quick Month Metrics Summary */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap pt-2 border-t border-border/50 text-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{approvedCount} absence{approvedCount > 1 ? "s" : ""} validée{approvedCount > 1 ? "s" : ""}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium">
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>{pendingCount} en attente</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{visibleHolidaysCount} jour{visibleHolidaysCount > 1 ? "s" : ""} férié{visibleHolidaysCount > 1 ? "s" : ""}</span>
          </div>

          {isLoading && (
            <span className="text-xs text-muted-foreground ml-auto animate-pulse flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Actualisation...
            </span>
          )}
        </div>
      </div>

      {/* Error Alert (if fetch failed) */}
      {error && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-rose-500/10 text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            leftIcon={<RefreshCw className="h-3 w-3" />}
            className="h-7 text-xs"
          >
            Réessayer
          </Button>
        </div>
      )}

      {/* 3. Monthly Calendar Grid */}
      <CalendarGrid
        cells={grid.cells}
        eventsLookup={eventsLookup}
      />

      {/* 4. Legend & Work Week Note */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20 text-xs text-muted-foreground">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-foreground">Légende:</span>

          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Validé (Bordure continue)
          </span>

          <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
            <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            En attente (Bordure tiretée)
          </span>

          <span className="inline-flex items-center gap-1 font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            Jour férié officiel
          </span>

          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Sun className="h-3 w-3 text-amber-500" />
            <Moon className="h-3 w-3 text-indigo-500" />
            Demi-journées (Matin / Après-midi)
          </span>
        </div>

        <div className="font-medium shrink-0">
          {grid.daysInMonth} jours • {grid.totalWeeks} semaines affichées
        </div>
      </div>
    </PageContainer>
  );
}

export default function CalendarPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="space-y-6 animate-pulse">
            <div className="h-20 bg-muted/60 rounded-xl" />
            <div className="h-14 bg-muted/40 rounded-xl" />
            <div className="h-[480px] bg-muted/30 rounded-xl border border-border" />
          </div>
        </PageContainer>
      }
    >
      <CalendarPageContent />
    </React.Suspense>
  );
}
