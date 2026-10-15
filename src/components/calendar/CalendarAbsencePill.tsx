"use client";

import * as React from "react";
import { CheckCircle2, Clock, XCircle, Ban, Sun, Moon } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { CalendarAbsenceEvent } from "@/src/lib/calendar/calendar-events";

export interface CalendarAbsencePillProps {
  event: CalendarAbsenceEvent;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function CalendarAbsencePill({
  event,
  onClick,
  className,
}: CalendarAbsencePillProps) {
  const { status, spanningPosition, fraction } = event;

  // Status-specific visual tokens (distinguishable by icon, border pattern, AND text, not color alone)
  const isApproved = status === "APPROVED";
  const isPending = status === "PENDING";
  const isRejected = status === "REJECTED";
  const isCancelled = status === "CANCELLED";

  const StatusIcon = isApproved
    ? CheckCircle2
    : isPending
    ? Clock
    : isRejected
    ? XCircle
    : Ban;

  // Rounded corners based on spanning position for continuous multi-day ribbon appearance
  const roundingClasses =
    spanningPosition === "single"
      ? "rounded-md"
      : spanningPosition === "start"
      ? "rounded-l-md rounded-r-none border-r-0"
      : spanningPosition === "end"
      ? "rounded-r-md rounded-l-none border-l-0"
      : spanningPosition === "week_continuation"
      ? "rounded-l-md rounded-r-none border-r-0"
      : "rounded-none border-x-0"; // middle

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(e as any);
        }
      }}
      title={`${event.employeeName} — ${event.typeName} (${event.statusLabelFr})`}
      className={cn(
        "group/pill flex items-center gap-1.5 px-1.5 py-1 text-[11px] font-medium transition-all cursor-pointer select-none border shadow-2xs",
        roundingClasses,
        // Status border styling & backgrounds (color + border style)
        isApproved && "bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 border-solid border-emerald-500/40 hover:bg-emerald-500/20",
        isPending && "bg-amber-500/10 text-amber-950 dark:text-amber-100 border-dashed border-amber-500/60 hover:bg-amber-500/20",
        isRejected && "bg-rose-500/10 text-rose-950 dark:text-rose-100 border-solid border-rose-500/40 line-through opacity-75 hover:bg-rose-500/20",
        isCancelled && "bg-muted text-muted-foreground border-dotted border-border line-through opacity-60 hover:bg-muted/80",
        className
      )}
    >
      {/* 1. Status Icon (Structural indicator 1) */}
      <StatusIcon
        className={cn(
          "h-3 w-3 shrink-0",
          isApproved && "text-emerald-600 dark:text-emerald-400",
          isPending && "text-amber-600 dark:text-amber-400",
          isRejected && "text-rose-600 dark:text-rose-400",
          isCancelled && "text-muted-foreground"
        )}
        aria-hidden="true"
      />

      {/* 2. Main Content according to Spanning Position */}
      {spanningPosition === "single" || spanningPosition === "start" ? (
        <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
          <span className="font-semibold truncate">{event.employeeName}</span>
          <span className="text-[10px] text-muted-foreground/80 shrink-0 font-normal">
            • {event.typeCode || event.typeName}
          </span>
        </div>
      ) : spanningPosition === "week_continuation" ? (
        <div className="flex items-center gap-1 min-w-0 flex-1 truncate text-muted-foreground">
          <span className="text-[10px] font-medium truncate">
            ↳ {event.employeeName} <span className="text-[9px] italic">(suite)</span>
          </span>
        </div>
      ) : spanningPosition === "end" ? (
        <div className="flex items-center gap-1 min-w-0 flex-1 truncate text-muted-foreground">
          <span className="text-[10px] font-medium truncate">
            Fin • {event.employeeName.split(" ")[0]}
          </span>
        </div>
      ) : (
        // Middle continuing day of multi-day absence: subtle connector to avoid duplicate visual noise
        <div className="flex items-center gap-1 min-w-0 flex-1 truncate opacity-70">
          <span className="text-[10px] italic truncate">
            ↳ {event.employeeName.split(" ")[0]}
          </span>
        </div>
      )}

      {/* 3. Compact Half-Day Badge (if applicable) */}
      {event.isHalfDay && (
        <span
          className={cn(
            "shrink-0 inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold uppercase",
            fraction === "HALF_DAY_MORNING"
              ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
              : "bg-indigo-500/20 text-indigo-800 dark:text-indigo-200"
          )}
        >
          {fraction === "HALF_DAY_MORNING" ? (
            <Sun className="h-2.5 w-2.5" />
          ) : (
            <Moon className="h-2.5 w-2.5" />
          )}
          <span>{event.fractionLabelFr}</span>
        </span>
      )}

      {/* 4. Textual Status Tag (Structural indicator 2 - strictly not color alone) */}
      <span
        className={cn(
          "hidden xl:inline-block shrink-0 text-[9px] font-semibold uppercase px-1 py-0.2 rounded border",
          isApproved && "border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
          isPending && "border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10",
          isRejected && "border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/10",
          isCancelled && "border-border text-muted-foreground bg-muted"
        )}
      >
        {event.statusLabelFr}
      </span>
    </div>
  );
}
