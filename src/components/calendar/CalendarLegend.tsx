"use client";

import * as React from "react";
import { CheckCircle2, Clock, Sparkles, Sun, Moon } from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface CalendarLegendProps {
  daysInMonth: number;
  totalWeeks: number;
  className?: string;
}

export function CalendarLegend({
  daysInMonth,
  totalWeeks,
  className,
}: CalendarLegendProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20 text-xs text-muted-foreground",
        className
      )}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-semibold text-foreground">Légende:</span>

        <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          Validé (Bordure continue)
        </span>

        <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
          <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          En attente (Bordure tiretée)
        </span>

        <span className="inline-flex items-center gap-1 font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          Jour férié officiel
        </span>

        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Sun className="h-3 w-3 text-amber-500" />
          <Moon className="h-3 w-3 text-indigo-500" />
          Demi-journées (Matin / Après-midi)
        </span>
      </div>

      <div className="font-medium shrink-0">
        {daysInMonth} jours • {totalWeeks} semaines affichées
      </div>
    </div>
  );
}
