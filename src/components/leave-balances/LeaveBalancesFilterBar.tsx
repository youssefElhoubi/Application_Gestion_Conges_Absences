"use client";

import * as React from "react";
import { FilterBar, ActiveFilter } from "@/src/components/shared/FilterBar";
import { Select } from "@/src/components/ui/select";
import type { SiteItem } from "@/src/lib/api/employee-client";

export interface LeaveBalancesFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  sites: SiteItem[];
  selectedSiteId: string;
  onSiteChange: (siteId: string) => void;
  selectedActive: string;
  onActiveChange: (active: string) => void;
  activeFilters: ActiveFilter[];
  onRemoveFilter: (filterId: string) => void;
  onResetFilters: () => void;
  totalResults: number;
}

export const LeaveBalancesFilterBar: React.FC<LeaveBalancesFilterBarProps> = ({
  searchValue,
  onSearchChange,
  sites,
  selectedSiteId,
  onSiteChange,
  selectedActive,
  onActiveChange,
  activeFilters,
  onRemoveFilter,
  onResetFilters,
  totalResults,
}) => {
  return (
    <FilterBar
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder="Rechercher par collaborateur ou matricule..."
      activeFilters={activeFilters}
      onRemoveFilter={onRemoveFilter}
      onResetFilters={onResetFilters}
      totalResults={totalResults}
    >
      {/* Site Filter */}
      <div className="w-full sm:w-44">
        <Select
          value={selectedSiteId}
          aria-label="Filtrer par site"
          onChange={(e) => onSiteChange(e.target.value)}
          options={[
            { value: "all", label: "Tous les sites" },
            ...sites.map((s) => ({ value: String(s.id), label: s.name })),
          ]}
        />
      </div>

      {/* Status Filter */}
      <div className="w-full sm:w-40">
        <Select
          value={selectedActive}
          aria-label="Filtrer par statut actif ou inactif"
          onChange={(e) => onActiveChange(e.target.value)}
          options={[
            { value: "true", label: "Actifs uniquement" },
            { value: "false", label: "Inactifs uniquement" },
            { value: "all", label: "Tous les statuts" },
          ]}
        />
      </div>
    </FilterBar>
  );
};
