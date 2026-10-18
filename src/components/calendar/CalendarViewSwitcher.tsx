"use client";

import * as React from "react";
import { CalendarRange, Calendar, CalendarDays } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { CalendarViewMode } from "@/src/lib/calendar";

export interface CalendarViewSwitcherProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (newMode: CalendarViewMode) => void;
  className?: string;
}

export function CalendarViewSwitcher({
  viewMode,
  onViewModeChange,
  className,
}: CalendarViewSwitcherProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border",
        className
      )}
      role="group"
      aria-label="Modes d'affichage du calendrier"
    >
      <button
        type="button"
        onClick={() => onViewModeChange("grid")}
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
        onClick={() => onViewModeChange("week")}
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
        onClick={() => onViewModeChange("agenda")}
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
  );
}
