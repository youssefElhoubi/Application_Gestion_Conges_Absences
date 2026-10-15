"use client";

import * as React from "react";
import { cn } from "@/src/lib/utils";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
  CalendarGridCell,
  WEEKDAYS_SHORT_FR,
} from "@/src/lib/calendar/calendar-grid";
import { DayEventsMap } from "@/src/lib/calendar/calendar-events";

export interface CalendarCompactGridProps {
  cells: CalendarGridCell[];
  eventsLookup?: Map<string, DayEventsMap>;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function CalendarCompactGrid({
  cells,
  eventsLookup,
  selectedDateKey,
  onSelectDate,
  isLoading = false,
  className,
}: CalendarCompactGridProps) {
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border/80 bg-card p-3 shadow-xs select-none",
        className
      )}
      role="region"
      aria-label="Sélecteur de date compact"
    >
      {/* 1. Weekday Column Headers */}
      <div
        className="grid grid-cols-7 mb-1 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        role="row"
      >
        {WEEKDAYS_SHORT_FR.map((weekday, idx) => {
          const isSunday = idx === 6;
          return (
            <div
              key={weekday}
              role="columnheader"
              className={cn(
                "py-1.5 text-center text-[11px]",
                isSunday && "text-muted-foreground/80 font-bold"
              )}
            >
              {weekday}
            </div>
          );
        })}
      </div>

      {/* 2. Compact Grid of Date Buttons */}
      <div className="grid grid-cols-7 gap-1" role="grid">
        {cells.map((cell) => {
          const isSelected = cell.dateKey === selectedDateKey;
          const dayEvents = eventsLookup?.get(cell.dateKey) || {
            holidays: [],
            absences: [],
          };
          const { holidays, absences } = dayEvents;
          const totalEvents = holidays.length + absences.length;
          const hasHoliday = holidays.length > 0;
          const hasAbsence = absences.length > 0;

          // Status breakdown for indicator dots
          const hasApproved = absences.some((a) => a.status === "APPROVED");
          const hasPending = absences.some((a) => a.status === "PENDING");

          return (
            <button
              key={cell.dateKey}
              type="button"
              role="gridcell"
              tabIndex={0}
              aria-selected={isSelected}
              aria-current={cell.isToday ? "date" : undefined}
              aria-label={`${cell.formattedDateFr}, ${totalEvents} événement(s)${
                isSelected ? ", sélectionné" : ""
              }`}
              onClick={() => onSelectDate(cell.dateKey)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDate(cell.dateKey);
                }
              }}
              className={cn(
                "relative flex flex-col items-center justify-between p-1 rounded-xl transition-all min-h-[46px] sm:min-h-[50px] cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                // Current month vs adjacent month
                cell.isCurrentMonth
                  ? "text-foreground hover:bg-muted/40"
                  : "text-muted-foreground/40 opacity-50 hover:opacity-80",
                // Weekend subtle background
                cell.isWeekend && cell.isCurrentMonth && "bg-muted/15",
                // Holiday subtle tint
                hasHoliday && cell.isCurrentMonth && "bg-primary/[0.04]",
                // Selected state: prominent highlight
                isSelected &&
                  "bg-primary text-primary-foreground font-bold shadow-xs scale-105 hover:bg-primary z-10 ring-2 ring-primary ring-offset-2 ring-offset-background",
                // Today state (when not selected)
                cell.isToday &&
                  !isSelected &&
                  "ring-2 ring-primary ring-inset font-bold text-primary"
              )}
            >
              {/* Day Number */}
              <span
                className={cn(
                  "text-xs sm:text-sm leading-none mt-1 font-semibold",
                  isSelected
                    ? "text-primary-foreground"
                    : cell.isToday
                    ? "text-primary"
                    : cell.isCurrentMonth
                    ? "text-foreground"
                    : "text-muted-foreground/50"
                )}
              >
                {cell.dayOfMonth}
              </span>

              {/* Event Indicators Row */}
              <div className="flex items-center justify-center gap-0.5 min-h-[12px] mb-0.5">
                {isLoading ? (
                  <Skeleton className="h-1.5 w-4 rounded-full bg-muted-foreground/30" />
                ) : (
                  <>
                    {/* Public Holiday Indicator */}
                    {hasHoliday && (
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          isSelected ? "bg-amber-300" : "bg-amber-500 shadow-2xs"
                        )}
                        title="Jour férié légal"
                      />
                    )}

                    {/* Absence Indicators */}
                    {hasAbsence && (
                      <>
                        {absences.length <= 2 ? (
                          <>
                            {hasApproved && (
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full shrink-0",
                                  isSelected
                                    ? "bg-emerald-200"
                                    : "bg-emerald-500"
                                )}
                              />
                            )}
                            {hasPending && (
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full shrink-0",
                                  isSelected ? "bg-amber-200" : "bg-amber-500"
                                )}
                              />
                            )}
                            {!hasApproved && !hasPending && (
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full shrink-0",
                                  isSelected ? "bg-primary-foreground/70" : "bg-primary"
                                )}
                              />
                            )}
                          </>
                        ) : (
                          /* If > 2 absences, render compact count indicator */
                          <span
                            className={cn(
                              "text-[9px] font-bold px-1 rounded-full leading-none",
                              isSelected
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-primary/15 text-primary"
                            )}
                          >
                            {absences.length}
                          </span>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
