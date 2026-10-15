"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  CalendarRange,
  CalendarDays,
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
  Info,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import { FilterBar } from "@/src/components/shared/FilterBar";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import { cn } from "@/src/lib/utils";
import {
  CalendarGrid,
  CalendarCompactGrid,
  CalendarDaySelectedView,
  CalendarAgendaView,
  CalendarWeeklyTimeline,
  CalendarAbsenceDetailModal,
  CalendarHolidayDetailModal,
} from "@/src/components/calendar";
import {
  buildMonthGrid,
  getAdjacentMonth,
  getWeekDays,
  getAdjacentWeek,
  parseDateKey,
  MONTH_NAMES_FR,
} from "@/src/lib/calendar/calendar-grid";
import {
  buildEventsLookup,
  CalendarAbsenceEvent,
  CalendarHolidayEvent,
} from "@/src/lib/calendar/calendar-events";
import {
  CalendarFilterState,
  CalendarViewMode,
  parseCalendarUrlState,
  deriveActiveFilters,
  buildFilterQueryString,
} from "@/src/lib/calendar/calendar-filters";
import {
  AbsenceApiClient,
  AbsenceListItem,
  AbsenceTypeItem,
  AbsenceStatus,
} from "@/src/lib/api/absence-client";
import {
  EmployeeApiClient,
  EmployeeListItem,
  SiteItem,
} from "@/src/lib/api/employee-client";
import { HolidayApiClient, PublicHolidayItem } from "@/src/lib/api/holiday-client";

function CalendarPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Stable reference to current date
  const now = React.useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 to 12

  // 1. Authoritative URL state: period, date, view mode, and filters with safe normalization
  const urlState = React.useMemo(() => {
    return parseCalendarUrlState(searchParams, now);
  }, [searchParams, now]);

  const year = urlState.year;
  const month = urlState.month;
  const viewMode = urlState.view;
  const filters = urlState;

  const [selectedAbsence, setSelectedAbsence] = React.useState<CalendarAbsenceEvent | null>(null);
  const [selectedHoliday, setSelectedHoliday] = React.useState<CalendarHolidayEvent | null>(null);

  const todayDateKey = React.useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [now]);

  // Default selected date: deep-linked urlState.date if provided, else today if viewing current month, else 1st of active month
  const defaultSelectedDate = React.useMemo(() => {
    if (urlState.date) {
      return urlState.date;
    }
    if (year === currentYear && month === currentMonth) {
      return todayDateKey;
    }
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }, [urlState.date, year, month, currentYear, currentMonth, todayDateKey]);

  const [userSelectedDateKey, setUserSelectedDateKey] = React.useState<string | null>(null);
  const [prevDefaultDate, setPrevDefaultDate] = React.useState<string>(defaultSelectedDate);

  if (prevDefaultDate !== defaultSelectedDate) {
    setPrevDefaultDate(defaultSelectedDate);
    setUserSelectedDateKey(null);
  }

  const selectedDateKey = userSelectedDateKey ?? defaultSelectedDate;
  const setSelectedDateKey = React.useCallback((key: string | null) => {
    setUserSelectedDateKey(key);
  }, []);

  // Active 7-day week calculation for Weekly Team Timeline
  const weekInfo = React.useMemo(() => {
    return getWeekDays(selectedDateKey, now);
  }, [selectedDateKey, now]);

  // 4. Data State
  const [absences, setAbsences] = React.useState<AbsenceListItem[]>([]);
  const [holidays, setHolidays] = React.useState<PublicHolidayItem[]>([]);
  const [types, setTypes] = React.useState<AbsenceTypeItem[]>([]);
  const [sites, setSites] = React.useState<SiteItem[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [absenceError, setAbsenceError] = React.useState<string | null>(null);
  const [holidayError, setHolidayError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // 5. Load reference data (Absence Types, Sites, Employees) on mount
  React.useEffect(() => {
    let isMounted = true;
    Promise.all([
      AbsenceApiClient.getAbsenceTypes().catch(() => []),
      EmployeeApiClient.listSites().catch(() => []),
      EmployeeApiClient.listEmployees({ pageSize: 100, active: "true" })
        .then((res) => res.data || [])
        .catch(() => []),
    ]).then(([typesList, sitesList, empList]) => {
      if (isMounted) {
        setTypes(typesList);
        setSites(sitesList);
        setEmployees(empList);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // 6. Synchronize filter updates into URL search params (supporting Back/Forward history)
  const applyFilterUpdates = React.useCallback(
    (updates: Partial<CalendarFilterState>) => {
      const queryString = buildFilterQueryString(searchParams, updates);
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // 7. View mode switcher updating the URL without full-page reloads and supporting back/forward navigation
  const handleViewModeChange = React.useCallback(
    (newMode: CalendarViewMode) => {
      const queryString = buildFilterQueryString(searchParams, { view: newMode });
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // 8. Synchronize month/year/date navigation into URL search params preserving active filters and view
  const updatePeriod = React.useCallback(
    (newYear: number, newMonth: number, newDate?: string) => {
      const updates: { year: number; month: number; date?: string } = {
        year: newYear,
        month: newMonth,
      };
      if (newDate) {
        updates.date = newDate;
      }
      const queryString = buildFilterQueryString(searchParams, updates);
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // 9. Navigation Actions (Month or Week)
  const goToPrev = React.useCallback(() => {
    if (viewMode === "week") {
      const prevMon = getAdjacentWeek(weekInfo.mondayDateKey, "prev");
      setSelectedDateKey(prevMon);
      const p = parseDateKey(prevMon);
      updatePeriod(p.year, p.month, prevMon);
    } else {
      const prev = getAdjacentMonth(year, month, "prev");
      updatePeriod(prev.year, prev.month);
    }
  }, [viewMode, weekInfo.mondayDateKey, year, month, updatePeriod, setSelectedDateKey]);

  const goToNext = React.useCallback(() => {
    if (viewMode === "week") {
      const nextMon = getAdjacentWeek(weekInfo.mondayDateKey, "next");
      setSelectedDateKey(nextMon);
      const p = parseDateKey(nextMon);
      updatePeriod(p.year, p.month, nextMon);
    } else {
      const next = getAdjacentMonth(year, month, "next");
      updatePeriod(next.year, next.month);
    }
  }, [viewMode, weekInfo.mondayDateKey, year, month, updatePeriod, setSelectedDateKey]);

  const goToToday = React.useCallback(() => {
    setSelectedDateKey(todayDateKey);
    updatePeriod(currentYear, currentMonth, todayDateKey);
  }, [currentYear, currentMonth, todayDateKey, updatePeriod, setSelectedDateKey]);

  // 9. Individual filter removal handler
  const handleRemoveFilter = React.useCallback(
    (filterId: string) => {
      if (filterId === "search") {
        applyFilterUpdates({ search: "" });
      } else if (filterId === "employeeId") {
        applyFilterUpdates({ employeeId: "all" });
      } else if (filterId === "siteId") {
        applyFilterUpdates({ siteId: "all" });
      } else if (filterId === "typeId") {
        applyFilterUpdates({ typeId: "all" });
      } else if (filterId === "status") {
        applyFilterUpdates({ status: "ALL" });
      }
    },
    [applyFilterUpdates]
  );

  // 9. Reset all filters restoring unfiltered view without resetting active month/year
  const handleResetFilters = React.useCallback(() => {
    applyFilterUpdates({
      search: "",
      employeeId: "all",
      siteId: "all",
      typeId: "all",
      status: "ALL",
    });
  }, [applyFilterUpdates]);

  // 10. Active filter indicators for FilterBar
  const activeFilters = React.useMemo(() => {
    const list = deriveActiveFilters(filters, { types, sites, employees });
    if (filters.search) {
      list.unshift({
        id: "search",
        label: "Recherche",
        valueLabel: `"${filters.search}"`,
      });
    }
    return list;
  }, [filters, types, sites, employees]);

  // 11. Employees filtered by active site selection if applicable
  const filteredEmployeesForSelect = React.useMemo(() => {
    if (filters.siteId && filters.siteId !== "all") {
      return employees.filter((e) => String(e.siteId) === filters.siteId);
    }
    return employees;
  }, [employees, filters.siteId]);

  // Filtered employees for Timeline rows (respecting site, employee, and search filters)
  const timelineEmployees = React.useMemo(() => {
    let list = employees;
    if (filters.siteId && filters.siteId !== "all") {
      list = list.filter((e) => String(e.siteId) === filters.siteId);
    }
    if (filters.employeeId && filters.employeeId !== "all") {
      list = list.filter((e) => e.employeeId === filters.employeeId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.employeeId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, filters.siteId, filters.employeeId, filters.search]);

  // 12. Build Month Grid with pure timezone-safe date math
  const grid = React.useMemo(() => {
    return buildMonthGrid(year, month, now);
  }, [year, month, now]);

  // 13. Fetch verified absence and public holiday data with decoupled error handling
  React.useEffect(() => {
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        setIsLoading(true);
        setAbsenceError(null);
        setHolidayError(null);
      }
    });

    const firstCellDateKey = grid.cells[0]?.dateKey;
    const lastCellDateKey = grid.cells[grid.cells.length - 1]?.dateKey;

    if (!firstCellDateKey || !lastCellDateKey) return;

    // Determine all years spanned by visible cells (e.g., Dec 2025 to Jan 2026)
    const startYear = parseInt(firstCellDateKey.split("-")[0], 10);
    const endYear = parseInt(lastCellDateKey.split("-")[0], 10);
    const holidayYears = Array.from(new Set([year, startYear, endYear]));

    const absencePromise = AbsenceApiClient.listAbsences({
      startDate: firstCellDateKey,
      endDate: lastCellDateKey,
      pageSize: 100,
      search: filters.search || undefined,
      employeeId: filters.employeeId !== "all" ? filters.employeeId : undefined,
      siteId: filters.siteId !== "all" ? Number(filters.siteId) : undefined,
      typeId: filters.typeId !== "all" ? Number(filters.typeId) : undefined,
      status: filters.status,
    });

    const holidayPromise = Promise.all(
      holidayYears.map((y) =>
        HolidayApiClient.listHolidays({ year: y, pageSize: 100 })
      )
    );

    Promise.allSettled([absencePromise, holidayPromise]).then(
      ([absenceResult, holidayResult]) => {
        if (!isMounted) return;

        if (absenceResult.status === "fulfilled") {
          setAbsences(absenceResult.value.data || []);
          setAbsenceError(null);
        } else {
          const msg =
            absenceResult.reason instanceof Error
              ? absenceResult.reason.message
              : "Impossible de charger les absences pour cette période.";
          setAbsenceError(msg);
        }

        if (holidayResult.status === "fulfilled") {
          const allHolidays = holidayResult.value.flatMap((r) => r.data || []);
          const uniqueHolidays = Array.from(
            new Map(allHolidays.map((h) => [String(h.id), h])).values()
          );
          setHolidays(uniqueHolidays);
          setHolidayError(null);
        } else {
          const msg =
            holidayResult.reason instanceof Error
              ? holidayResult.reason.message
              : "Impossible de charger les jours fériés légaux.";
          setHolidayError(msg);
        }

        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [grid, refreshKey, year, filters]);

  // 7. Build Events Lookup Dictionary
  const eventsLookup = React.useMemo(() => {
    const dateKeys = grid.cells.map((c) => c.dateKey);
    return buildEventsLookup(dateKeys, absences, holidays);
  }, [grid.cells, absences, holidays]);

  // Selected day cell and events for Mobile/Tablet day inspector
  const selectedDayCell = React.useMemo(() => {
    return grid.cells.find((c) => c.dateKey === selectedDateKey) || grid.cells[0];
  }, [grid.cells, selectedDateKey]);

  const selectedDayEvents = React.useMemo(() => {
    return eventsLookup.get(selectedDateKey) || { holidays: [], absences: [] };
  }, [eventsLookup, selectedDateKey]);

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
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => handleViewModeChange("grid")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={viewMode === "grid"}
              aria-label="Afficher la vue mensuelle"
            >
              <CalendarRange className="h-3.5 w-3.5 shrink-0" />
              <span>Mois</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("week")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "week"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={viewMode === "week"}
              aria-label="Afficher le planning hebdomadaire de l'équipe"
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Semaine</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("agenda")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "agenda"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={viewMode === "agenda"}
              aria-label="Afficher la vue agenda chronologique"
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>Agenda</span>
            </button>
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
                onClick={goToPrev}
                aria-label={viewMode === "week" ? "Semaine précédente" : "Mois précédent"}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden md:inline text-xs ml-1 font-medium">Précédent</span>
              </Button>

              {/* Prominent Period Heading (Week or Month) */}
              <h2
                className="text-sm sm:text-base font-bold text-foreground min-w-[140px] sm:min-w-[170px] text-center tracking-tight capitalize select-none px-1"
                aria-live="polite"
              >
                {viewMode === "week"
                  ? weekInfo.formattedWeekLabelFr
                  : `${grid.monthNameFr} ${grid.year}`}
              </h2>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goToNext}
                aria-label={viewMode === "week" ? "Semaine suivante" : "Mois suivant"}
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
          {absenceError ? (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-medium"
              title={absenceError}
            >
              <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <span>Absences indisponibles</span>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {approvedCount} absence{approvedCount > 1 ? "s" : ""} validée{approvedCount > 1 ? "s" : ""}
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>{pendingCount} en attente</span>
              </div>
            </>
          )}

          {holidayError ? (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-medium"
              title={holidayError}
            >
              <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <span>Jours fériés indisponibles</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {visibleHolidaysCount} jour{visibleHolidaysCount > 1 ? "s" : ""} férié{visibleHolidaysCount > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {isLoading && (
            <span className="text-xs text-muted-foreground ml-auto animate-pulse flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Actualisation...
            </span>
          )}
        </div>
      </div>

      {/* 3. Filter Bar with Search and Multi-criteria filters */}
      <div className="bg-card border border-border rounded-xl p-3.5 sm:p-4 shadow-xs">
        <FilterBar
          searchValue={filters.search}
          onSearchChange={(val) => applyFilterUpdates({ search: val })}
          searchPlaceholder="Rechercher par collaborateur, matricule..."
          activeFilters={activeFilters}
          onRemoveFilter={handleRemoveFilter}
          onResetFilters={handleResetFilters}
          totalResults={absences.length}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {/* Employee Selector */}
            <div className="w-48 sm:w-56">
              <Select
                value={filters.employeeId}
                onChange={(e) => applyFilterUpdates({ employeeId: e.target.value })}
                className="text-xs h-9"
                aria-label="Filtrer par collaborateur"
              >
                <option value="all">Tous les collaborateurs</option>
                {filteredEmployeesForSelect.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.fullName} ({emp.employeeId})
                  </option>
                ))}
              </Select>
            </div>

            {/* Site Selector */}
            <div className="w-36 sm:w-44">
              <Select
                value={filters.siteId}
                onChange={(e) => applyFilterUpdates({ siteId: e.target.value })}
                className="text-xs h-9"
                aria-label="Filtrer par site"
              >
                <option value="all">Tous les sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Absence Type Selector */}
            <div className="w-44 sm:w-48">
              <Select
                value={filters.typeId}
                onChange={(e) => applyFilterUpdates({ typeId: e.target.value })}
                className="text-xs h-9"
                aria-label="Filtrer par type d'absence"
              >
                <option value="all">Tous les types d&apos;absence</option>
                {types.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Status Selector */}
            <div className="w-36">
              <Select
                value={filters.status}
                onChange={(e) =>
                  applyFilterUpdates({
                    status: e.target.value as AbsenceStatus | "ALL",
                  })
                }
                className="text-xs h-9"
                aria-label="Filtrer par statut"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="APPROVED">Validé</option>
                <option value="PENDING">En attente</option>
                <option value="REJECTED">Refusé</option>
                <option value="CANCELLED">Annulé</option>
              </Select>
            </div>
          </div>
        </FilterBar>
      </div>

      {/* Error Alert (if absence or holiday fetch failed) */}
      {(absenceError || holidayError) && (
        <div className="p-3.5 sm:p-4 rounded-xl border border-destructive/20 bg-rose-500/10 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-semibold">Erreur de chargement : </span>
              <span>{[absenceError, holidayError].filter(Boolean).join(" • ")}</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            className="h-8 text-xs shrink-0 bg-background/80 hover:bg-background"
          >
            Réessayer
          </Button>
        </div>
      )}

      {/* Contextual Empty State Banner (if no absences match period or filters, and not loading or error) */}
      {!isLoading && !absenceError && absences.length === 0 && (
        <div className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              {activeFilters.length > 0 ? (
                <>
                  Aucune absence ne correspond aux filtres sélectionnés pour{" "}
                  <strong className="text-foreground">
                    {grid.monthNameFr} {grid.year}
                  </strong>
                  .
                  {holidays.length > 0 &&
                    " Les jours fériés légaux restent visibles dans la grille."}
                </>
              ) : (
                <>
                  Aucune absence enregistrée pour{" "}
                  <strong className="text-foreground">
                    {grid.monthNameFr} {grid.year}
                  </strong>
                  .
                  {holidays.length > 0 &&
                    " Les jours fériés légaux sont affichés ci-dessous."}
                </>
              )}
            </span>
          </div>

          {activeFilters.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 text-xs font-medium shrink-0 self-start sm:self-auto"
            >
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      )}

      {/* 4. Calendar Views: Month vs Weekly Team Timeline vs Agenda */}
      {viewMode === "agenda" ? (
        <CalendarAgendaView
          cells={grid.cells}
          eventsLookup={eventsLookup}
          monthNameFr={grid.monthNameFr}
          year={grid.year}
          isLoading={isLoading}
          onSelectAbsence={setSelectedAbsence}
          onSelectHoliday={setSelectedHoliday}
        />
      ) : viewMode === "week" ? (
        <CalendarWeeklyTimeline
          days={weekInfo.days}
          employees={timelineEmployees}
          absences={absences}
          holidays={holidays}
          isLoading={isLoading}
          onSelectAbsence={setSelectedAbsence}
          onSelectHoliday={setSelectedHoliday}
        />
      ) : (
        <>
          {/* Desktop & Large Screen View: Full expanded 7-column CalendarGrid with cell pills */}
          <div className="hidden lg:block">
            <CalendarGrid
              cells={grid.cells}
              eventsLookup={eventsLookup}
              isLoading={isLoading}
              absenceError={absenceError}
            />
          </div>

          {/* Mobile & Tablet Responsive View: Touch-friendly Compact Grid + Selected Day Inspector */}
          <div className="lg:hidden flex flex-col md:grid md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <CalendarCompactGrid
                cells={grid.cells}
                eventsLookup={eventsLookup}
                selectedDateKey={selectedDateKey}
                onSelectDate={setSelectedDateKey}
                isLoading={isLoading}
              />
            </div>
            <div className="md:col-span-7">
              <CalendarDaySelectedView
                dateKey={selectedDateKey}
                formattedDateFr={selectedDayCell?.formattedDateFr || selectedDateKey}
                isToday={selectedDayCell?.isToday}
                events={selectedDayEvents}
                isLoading={isLoading}
                onSelectAbsence={setSelectedAbsence}
                onSelectHoliday={setSelectedHoliday}
              />
            </div>
          </div>
        </>
      )}

      {/* 5. Focused Modals for Absence and Holiday Inspection */}
      {selectedAbsence && (
        <CalendarAbsenceDetailModal
          isOpen={Boolean(selectedAbsence)}
          onClose={() => setSelectedAbsence(null)}
          event={selectedAbsence}
        />
      )}

      {selectedHoliday && (
        <CalendarHolidayDetailModal
          isOpen={Boolean(selectedHoliday)}
          onClose={() => setSelectedHoliday(null)}
          holiday={selectedHoliday}
        />
      )}

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
