"use client";

import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import { CalendarViewMode } from "@/src/lib/calendar";
import { cn } from "@/src/lib/utils";

export interface CalendarToolbarProps {
  viewMode: CalendarViewMode;
  periodHeading: string;
  month: number;
  year: number;
  monthOptions: { value: string; label: string }[];
  yearOptions: { value: string; label: string }[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onMonthChange: (newMonth: number) => void;
  onYearChange: (newYear: number) => void;
  className?: string;
}

export function CalendarToolbar({
  viewMode,
  periodHeading,
  month,
  year,
  monthOptions,
  yearOptions,
  onPrev,
  onNext,
  onToday,
  onMonthChange,
  onYearChange,
  className,
}: CalendarToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Navigation Controls: Today & Stepper */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between sm:justify-start w-full sm:w-auto">
        {/* Today Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToday}
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
            onClick={onPrev}
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
            {periodHeading}
          </h2>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onNext}
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
            onChange={(e) => onMonthChange(Number(e.target.value))}
            options={monthOptions}
            aria-label="Sélectionner le mois"
            className="h-8 text-xs font-medium"
          />
        </div>

        <div className="w-24">
          <Select
            value={String(year)}
            onChange={(e) => onYearChange(Number(e.target.value))}
            options={yearOptions}
            aria-label="Sélectionner l'année"
            className="h-8 text-xs font-medium"
          />
        </div>
      </div>
    </div>
  );
}
