"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

export interface CalendarEmptyStateBannerProps {
  isVisible: boolean;
  monthNameFr: string;
  year: number;
  hasActiveFilters: boolean;
  hasHolidays: boolean;
  onResetFilters: () => void;
  className?: string;
}

export function CalendarEmptyStateBanner({
  isVisible,
  monthNameFr,
  year,
  hasActiveFilters,
  hasHolidays,
  onResetFilters,
  className,
}: CalendarEmptyStateBannerProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "p-3.5 sm:p-4 rounded-xl border border-border/80 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <span>
          {hasActiveFilters ? (
            <>
              Aucune absence ne correspond aux filtres sélectionnés pour{" "}
              <strong className="text-foreground">
                {monthNameFr} {year}
              </strong>
              .
              {hasHolidays &&
                " Les jours fériés légaux restent visibles dans la grille."}
            </>
          ) : (
            <>
              Aucune absence enregistrée pour{" "}
              <strong className="text-foreground">
                {monthNameFr} {year}
              </strong>
              .
              {hasHolidays &&
                " Les jours fériés légaux sont affichés ci-dessous."}
            </>
          )}
        </span>
      </div>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onResetFilters}
          className="h-7 text-xs font-medium shrink-0 self-start sm:self-auto"
        >
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
}
