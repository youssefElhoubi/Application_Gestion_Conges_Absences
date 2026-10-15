"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { SearchInput } from "@/src/components/shared/SearchInput";
import { cn } from "@/src/lib/utils";

export interface ActiveFilter {
  id: string;
  label: string;
  valueLabel: string;
}

export interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (filterId: string) => void;
  onResetFilters?: () => void;
  totalResults?: number;
  className?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Rechercher...",
  children,
  activeFilters = [],
  onRemoveFilter,
  onResetFilters,
  totalResults,
  className,
}: FilterBarProps) {
  const hasActiveFilters = activeFilters.length > 0 || Boolean(searchValue);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px] max-w-lg">
          {onSearchChange && (
            <SearchInput
              value={searchValue}
              onSearch={onSearchChange}
              placeholder={searchPlaceholder}
            />
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {children}

          {hasActiveFilters && onResetFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Réinitialiser
            </Button>
          )}

          {totalResults !== undefined && (
            <span className="text-xs text-muted-foreground font-medium ml-1">
              {totalResults} résultat{totalResults > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-xs font-medium text-muted-foreground mr-1">Filtres actifs:</span>
          {activeFilters.map((filter) => (
            <span
              key={filter.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted text-foreground border border-border"
            >
              <span className="text-muted-foreground">{filter.label}:</span>
              <span className="font-medium">{filter.valueLabel}</span>
              {onRemoveFilter && (
                <button
                  type="button"
                  onClick={() => onRemoveFilter(filter.id)}
                  className="hover:text-destructive cursor-pointer ml-0.5 text-muted-foreground"
                  aria-label={`Supprimer filtre ${filter.label}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
