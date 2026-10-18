"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  CalendarFilterState,
  CalendarViewMode,
  CalendarUrlState,
  parseCalendarUrlState,
  buildFilterQueryString,
} from "@/src/lib/calendar/calendar-filters";
import {
  getWeekDays,
  getAdjacentWeek,
  getAdjacentMonth,
  parseDateKey,
  WeekInfoResult,
} from "@/src/lib/calendar/calendar-grid";

export interface UseCalendarUrlStateResult {
  now: Date;
  currentYear: number;
  currentMonth: number;
  urlState: CalendarUrlState;
  year: number;
  month: number;
  viewMode: CalendarViewMode;
  filters: CalendarFilterState;
  todayDateKey: string;
  defaultSelectedDate: string;
  selectedDateKey: string;
  setSelectedDateKey: (key: string | null) => void;
  weekInfo: WeekInfoResult;
  applyFilterUpdates: (updates: Partial<CalendarFilterState>) => void;
  handleViewModeChange: (newMode: CalendarViewMode) => void;
  updatePeriod: (newYear: number, newMonth: number, newDate?: string) => void;
  goToPrev: () => void;
  goToNext: () => void;
  goToToday: () => void;
}

export function useCalendarUrlState(): UseCalendarUrlStateResult {
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

  const todayDateKey = React.useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [now]);

  // Default selected date: deep-linked urlState.date if provided and matches active month/year, else today if viewing current month, else 1st of active month
  const defaultSelectedDate = React.useMemo(() => {
    if (urlState.date) {
      const p = parseDateKey(urlState.date);
      if (p.year === year && p.month === month) {
        return urlState.date;
      }
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

  // Synchronize filter updates into URL search params (supporting Back/Forward history)
  const applyFilterUpdates = React.useCallback(
    (updates: Partial<CalendarFilterState>) => {
      const queryString = buildFilterQueryString(searchParams, updates);
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // View mode switcher updating the URL without full-page reloads
  const handleViewModeChange = React.useCallback(
    (newMode: CalendarViewMode) => {
      const queryString = buildFilterQueryString(searchParams, { view: newMode });
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Synchronize month/year/date navigation into URL search params preserving active filters and view
  const updatePeriod = React.useCallback(
    (newYear: number, newMonth: number, newDate?: string) => {
      const updates: { year: number; month: number; date?: string | null } = {
        year: newYear,
        month: newMonth,
        date: newDate ?? null,
      };
      const queryString = buildFilterQueryString(searchParams, updates);
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Navigation Actions (Month or Week)
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

  return {
    now,
    currentYear,
    currentMonth,
    urlState,
    year,
    month,
    viewMode,
    filters,
    todayDateKey,
    defaultSelectedDate,
    selectedDateKey,
    setSelectedDateKey,
    weekInfo,
    applyFilterUpdates,
    handleViewModeChange,
    updatePeriod,
    goToPrev,
    goToNext,
    goToToday,
  };
}
