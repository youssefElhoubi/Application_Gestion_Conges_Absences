"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { CalendarHolidayEvent } from "@/src/lib/calendar/calendar-events";

export interface CalendarHolidayBannerProps {
  holiday: CalendarHolidayEvent;
  onClick?: (e?: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
}

export function CalendarHolidayBanner({
  holiday,
  onClick,
  className,
}: CalendarHolidayBannerProps) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      role="button"
      tabIndex={0}
      aria-label={`Jour férié légal: ${holiday.label}, ${holiday.isReligious ? "Religieux" : "Civil"}. Cliquez ou appuyez sur Entrée pour inspecter.`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick?.(e);
        }
      }}
      title={`Jour férié légal: ${holiday.label}${holiday.isReligious ? " (Religieux)" : " (Civil)"}`}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer select-none",
        "bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 shadow-2xs",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        className
      )}
    >
      <Sparkles className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
      <span className="truncate flex-1 tracking-tight">{holiday.label}</span>
      {holiday.isReligious && (
        <span className="hidden md:inline-block shrink-0 text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-primary/20 text-primary">
          Religieux
        </span>
      )}
    </div>
  );
}
