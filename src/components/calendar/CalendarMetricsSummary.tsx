"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Clock, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface CalendarMetricsSummaryProps {
  approvedCount: number;
  pendingCount: number;
  visibleHolidaysCount: number;
  absenceError: string | null;
  holidayError: string | null;
  isLoading: boolean;
  className?: string;
}

export function CalendarMetricsSummary({
  approvedCount,
  pendingCount,
  visibleHolidaysCount,
  absenceError,
  holidayError,
  isLoading,
  className,
}: CalendarMetricsSummaryProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-4 flex-wrap pt-2 border-t border-border/50 text-xs",
        className
      )}
    >
      {absenceError ? (
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-medium"
          title={absenceError}
        >
          <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          <span>Absences indisponibles</span>
        </div>
      ) : (
        <>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>
              {approvedCount} absence{approvedCount > 1 ? "s" : ""} validée{approvedCount > 1 ? "s" : ""}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium">
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>{pendingCount} en attente</span>
          </div>
        </>
      )}

      {holidayError ? (
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-medium"
          title={holidayError}
        >
          <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          <span>Jours fériés indisponibles</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          <span>
            {visibleHolidaysCount} jour{visibleHolidaysCount > 1 ? "s" : ""} férié{visibleHolidaysCount > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {isLoading && (
        <span className="text-xs text-muted-foreground ml-auto animate-pulse flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Actualisation...
        </span>
      )}
    </div>
  );
}
