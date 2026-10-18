"use client";

import * as React from "react";
import { ActiveFilter } from "@/src/components/shared/FilterBar";
import {
  CalendarFilterState,
  deriveActiveFilters,
} from "@/src/lib/calendar/calendar-filters";
import { AbsenceTypeItem } from "@/src/lib/api/absence-client";
import { SiteItem, EmployeeListItem } from "@/src/lib/api/employee-client";

export interface UseCalendarFiltersResult {
  activeFilters: ActiveFilter[];
  filteredEmployeesForSelect: EmployeeListItem[];
  timelineEmployees: EmployeeListItem[];
  handleRemoveFilter: (filterId: string) => void;
  handleResetFilters: () => void;
}

export function useCalendarFilters(
  filters: CalendarFilterState,
  applyFilterUpdates: (updates: Partial<CalendarFilterState>) => void,
  types: AbsenceTypeItem[],
  sites: SiteItem[],
  employees: EmployeeListItem[]
): UseCalendarFiltersResult {
  // Individual filter removal handler
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

  // Reset all filters restoring unfiltered view without resetting active month/year
  const handleResetFilters = React.useCallback(() => {
    applyFilterUpdates({
      search: "",
      employeeId: "all",
      siteId: "all",
      typeId: "all",
      status: "ALL",
    });
  }, [applyFilterUpdates]);

  // Active filter indicators for FilterBar
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

  // Employees filtered by active site selection if applicable
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

  return {
    activeFilters,
    filteredEmployeesForSelect,
    timelineEmployees,
    handleRemoveFilter,
    handleResetFilters,
  };
}
