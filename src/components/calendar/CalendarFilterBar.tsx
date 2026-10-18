"use client";

import * as React from "react";
import { FilterBar, ActiveFilter } from "@/src/components/shared/FilterBar";
import { Select } from "@/src/components/ui/select";
import { AbsenceStatus, AbsenceTypeItem } from "@/src/lib/api/absence-client";
import { SiteItem, EmployeeListItem } from "@/src/lib/api/employee-client";
import { cn } from "@/src/lib/utils";

export interface CalendarFilterBarProps {
  search: string;
  onSearchChange: (search: string) => void;
  activeFilters: ActiveFilter[];
  onRemoveFilter: (filterId: string) => void;
  onResetFilters: () => void;
  totalResults: number;
  selectedEmployeeId: string;
  onEmployeeChange: (employeeId: string) => void;
  employees: EmployeeListItem[];
  selectedSiteId: string;
  onSiteChange: (siteId: string) => void;
  sites: SiteItem[];
  selectedTypeId: string;
  onTypeChange: (typeId: string) => void;
  types: AbsenceTypeItem[];
  selectedStatus: AbsenceStatus | "ALL";
  onStatusChange: (status: AbsenceStatus | "ALL") => void;
  className?: string;
}

export function CalendarFilterBar({
  search,
  onSearchChange,
  activeFilters,
  onRemoveFilter,
  onResetFilters,
  totalResults,
  selectedEmployeeId,
  onEmployeeChange,
  employees,
  selectedSiteId,
  onSiteChange,
  sites,
  selectedTypeId,
  onTypeChange,
  types,
  selectedStatus,
  onStatusChange,
  className,
}: CalendarFilterBarProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-3.5 sm:p-4 shadow-xs",
        className
      )}
    >
      <FilterBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Rechercher par collaborateur, matricule..."
        activeFilters={activeFilters}
        onRemoveFilter={onRemoveFilter}
        onResetFilters={onResetFilters}
        totalResults={totalResults}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Employee Selector */}
          <div className="w-48 sm:w-56">
            <Select
              value={selectedEmployeeId}
              onChange={(e) => onEmployeeChange(e.target.value)}
              className="text-xs h-9"
              aria-label="Filtrer par collaborateur"
            >
              <option value="all">Tous les collaborateurs</option>
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.fullName} ({emp.employeeId})
                </option>
              ))}
            </Select>
          </div>

          {/* Site Selector */}
          <div className="w-36 sm:w-44">
            <Select
              value={selectedSiteId}
              onChange={(e) => onSiteChange(e.target.value)}
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
              value={selectedTypeId}
              onChange={(e) => onTypeChange(e.target.value)}
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
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value as AbsenceStatus | "ALL")}
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
  );
}
