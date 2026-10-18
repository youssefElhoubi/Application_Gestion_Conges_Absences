"use client";

import * as React from "react";
import Link from "next/link";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import {
  CalendarGrid,
  CalendarCompactGrid,
  CalendarDaySelectedView,
  CalendarAgendaView,
  CalendarWeeklyTimeline,
  CalendarAbsenceDetailModal,
  CalendarHolidayDetailModal,
  CalendarViewSwitcher,
  CalendarToolbar,
  CalendarMetricsSummary,
  CalendarFilterBar,
  CalendarErrorAlert,
  CalendarEmptyStateBanner,
  CalendarLegend,
  useCalendarUrlState,
  useCalendarFilters,
  useCalendarData,
} from "@/src/components/calendar";
import { buildMonthGrid } from "@/src/lib/calendar/calendar-grid";
import { MONTH_NAMES_FR } from "@/src/lib/calendar/calendar-constants";
import {
  CalendarAbsenceEvent,
  CalendarHolidayEvent,
} from "@/src/lib/calendar/calendar-types";

function CalendarPageContent() {
  const [selectedAbsence, setSelectedAbsence] = React.useState<CalendarAbsenceEvent | null>(null);
  const [selectedHoliday, setSelectedHoliday] = React.useState<CalendarHolidayEvent | null>(null);

  // 1. Authoritative URL state and date navigation
  const url = useCalendarUrlState();

  // 2. Build Month Grid with pure timezone-safe date math
  const grid = React.useMemo(() => {
    return buildMonthGrid(url.year, url.month, url.now);
  }, [url.year, url.month, url.now]);

  // 3. Reference data and period events data state
  const data = useCalendarData(grid, url.year, url.month, url.filters);

  // 4. Derived filter state and handlers
  const filter = useCalendarFilters(
    url.filters,
    url.applyFilterUpdates,
    data.types,
    data.sites,
    data.employees
  );

  // Selected day cell and events for Mobile/Tablet day inspector
  const selectedDayCell = React.useMemo(() => {
    return grid.cells.find((c) => c.dateKey === url.selectedDateKey) || grid.cells[0];
  }, [grid.cells, url.selectedDateKey]);

  const selectedDayEvents = React.useMemo(() => {
    return data.eventsLookup.get(url.selectedDateKey) || { holidays: [], absences: [] };
  }, [data.eventsLookup, url.selectedDateKey]);

  // Quick picker select options
  const monthOptions = React.useMemo(() => {
    return MONTH_NAMES_FR.map((name, idx) => ({
      value: String(idx + 1),
      label: name,
    }));
  }, []);

  const yearOptions = React.useMemo(() => {
    const startYear = url.currentYear - 3;
    const endYear = url.currentYear + 4;
    const options = [];
    for (let y = startYear; y <= endYear; y++) {
      options.push({ value: String(y), label: String(y) });
    }
    return options;
  }, [url.currentYear]);

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
          <CalendarViewSwitcher
            viewMode={url.viewMode}
            onViewModeChange={url.handleViewModeChange}
          />
        }
      />

      {/* 2. Month Navigation Toolbar & Quick Stats */}
      <div className="flex flex-col gap-3.5 p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-xs">
        <CalendarToolbar
          viewMode={url.viewMode}
          periodHeading={
            url.viewMode === "week"
              ? url.weekInfo.formattedWeekLabelFr
              : `${grid.monthNameFr} ${grid.year}`
          }
          month={url.month}
          year={url.year}
          monthOptions={monthOptions}
          yearOptions={yearOptions}
          onPrev={url.goToPrev}
          onNext={url.goToNext}
          onToday={url.goToToday}
          onMonthChange={(newMonth) => url.updatePeriod(url.year, newMonth)}
          onYearChange={(newYear) => url.updatePeriod(newYear, url.month)}
        />

        <CalendarMetricsSummary
          approvedCount={data.approvedCount}
          pendingCount={data.pendingCount}
          visibleHolidaysCount={data.visibleHolidaysCount}
          absenceError={data.absenceError}
          holidayError={data.holidayError}
          isLoading={data.isLoading}
        />
      </div>

      {/* 3. Filter Bar with Search and Multi-criteria filters */}
      <CalendarFilterBar
        search={url.filters.search}
        onSearchChange={(val) => url.applyFilterUpdates({ search: val })}
        activeFilters={filter.activeFilters}
        onRemoveFilter={filter.handleRemoveFilter}
        onResetFilters={filter.handleResetFilters}
        totalResults={data.absences.length}
        selectedEmployeeId={url.filters.employeeId}
        onEmployeeChange={(val) => url.applyFilterUpdates({ employeeId: val })}
        employees={filter.filteredEmployeesForSelect}
        selectedSiteId={url.filters.siteId}
        onSiteChange={(val) => url.applyFilterUpdates({ siteId: val })}
        sites={data.sites}
        selectedTypeId={url.filters.typeId}
        onTypeChange={(val) => url.applyFilterUpdates({ typeId: val })}
        types={data.types}
        selectedStatus={url.filters.status}
        onStatusChange={(val) => url.applyFilterUpdates({ status: val })}
      />

      {/* Error Alert (if absence or holiday fetch failed) */}
      <CalendarErrorAlert
        absenceError={data.absenceError}
        holidayError={data.holidayError}
        onRetry={data.retryFetch}
      />

      {/* Contextual Empty State Banner */}
      <CalendarEmptyStateBanner
        isVisible={!data.isLoading && !data.absenceError && data.absences.length === 0}
        monthNameFr={grid.monthNameFr}
        year={grid.year}
        hasActiveFilters={filter.activeFilters.length > 0}
        hasHolidays={data.holidays.length > 0}
        onResetFilters={filter.handleResetFilters}
      />

      {/* 4. Calendar Views: Month vs Weekly Team Timeline vs Agenda */}
      {url.viewMode === "agenda" ? (
        <CalendarAgendaView
          cells={grid.cells}
          eventsLookup={data.eventsLookup}
          monthNameFr={grid.monthNameFr}
          year={grid.year}
          isLoading={data.isLoading}
          onSelectAbsence={setSelectedAbsence}
          onSelectHoliday={setSelectedHoliday}
        />
      ) : url.viewMode === "week" ? (
        <CalendarWeeklyTimeline
          days={url.weekInfo.days}
          employees={filter.timelineEmployees}
          absences={data.absences}
          holidays={data.holidays}
          isLoading={data.isLoading}
          onSelectAbsence={setSelectedAbsence}
          onSelectHoliday={setSelectedHoliday}
        />
      ) : (
        <>
          {/* Desktop & Large Screen View: Full expanded 7-column CalendarGrid with cell pills */}
          <div className="hidden lg:block">
            <CalendarGrid
              cells={grid.cells}
              eventsLookup={data.eventsLookup}
              isLoading={data.isLoading}
              absenceError={data.absenceError}
            />
          </div>

          {/* Mobile & Tablet Responsive View: Touch-friendly Compact Grid + Selected Day Inspector */}
          <div className="lg:hidden flex flex-col md:grid md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <CalendarCompactGrid
                cells={grid.cells}
                eventsLookup={data.eventsLookup}
                selectedDateKey={url.selectedDateKey}
                onSelectDate={url.setSelectedDateKey}
                isLoading={data.isLoading}
              />
            </div>
            <div className="md:col-span-7">
              <CalendarDaySelectedView
                dateKey={url.selectedDateKey}
                formattedDateFr={selectedDayCell?.formattedDateFr || url.selectedDateKey}
                isToday={selectedDayCell?.isToday}
                events={selectedDayEvents}
                isLoading={data.isLoading}
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

      {/* 6. Legend & Work Week Note */}
      <CalendarLegend
        daysInMonth={grid.daysInMonth}
        totalWeeks={grid.totalWeeks}
      />
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
