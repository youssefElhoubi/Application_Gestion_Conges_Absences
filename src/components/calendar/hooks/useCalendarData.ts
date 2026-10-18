"use client";

import * as React from "react";
import {
  AbsenceApiClient,
  AbsenceListItem,
  AbsenceTypeItem,
} from "@/src/lib/api/absence-client";
import {
  EmployeeApiClient,
  EmployeeListItem,
  SiteItem,
} from "@/src/lib/api/employee-client";
import { HolidayApiClient, PublicHolidayItem } from "@/src/lib/api/holiday-client";
import {
  buildEventsLookup,
  DayEventsMap,
} from "@/src/lib/calendar/calendar-events";
import { MonthGridResult } from "@/src/lib/calendar/calendar-types";
import { CalendarFilterState } from "@/src/lib/calendar/calendar-filters";

export interface UseCalendarDataResult {
  absences: AbsenceListItem[];
  holidays: PublicHolidayItem[];
  types: AbsenceTypeItem[];
  sites: SiteItem[];
  employees: EmployeeListItem[];
  isLoading: boolean;
  absenceError: string | null;
  holidayError: string | null;
  refreshKey: number;
  retryFetch: () => void;
  eventsLookup: Map<string, DayEventsMap>;
  approvedCount: number;
  pendingCount: number;
  visibleHolidaysCount: number;
}

export function useCalendarData(
  grid: MonthGridResult,
  year: number,
  month: number,
  filters: CalendarFilterState
): UseCalendarDataResult {
  // Data State
  const [absences, setAbsences] = React.useState<AbsenceListItem[]>([]);
  const [holidays, setHolidays] = React.useState<PublicHolidayItem[]>([]);
  const [types, setTypes] = React.useState<AbsenceTypeItem[]>([]);
  const [sites, setSites] = React.useState<SiteItem[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [absenceError, setAbsenceError] = React.useState<string | null>(null);
  const [holidayError, setHolidayError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const retryFetch = React.useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // 1. Load reference data (Absence Types, Sites, Employees) on mount
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

  // 2. Fetch verified absence and public holiday data with decoupled error handling
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

  // 3. Build Events Lookup Dictionary
  const eventsLookup = React.useMemo(() => {
    const dateKeys = grid.cells.map((c) => c.dateKey);
    return buildEventsLookup(dateKeys, absences, holidays);
  }, [grid.cells, absences, holidays]);

  // 4. Summary Metrics for currently visible month
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

  return {
    absences,
    holidays,
    types,
    sites,
    employees,
    isLoading,
    absenceError,
    holidayError,
    refreshKey,
    retryFetch,
    eventsLookup,
    approvedCount,
    pendingCount,
    visibleHolidaysCount,
  };
}
