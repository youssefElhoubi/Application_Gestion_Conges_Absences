"use client";

import * as React from "react";
import { cn } from "@/src/lib/utils";
import {
  CalendarGridCell,
  WEEKDAYS_FR,
  WEEKDAYS_SHORT_FR,
} from "@/src/lib/calendar/calendar-grid";
import {
  DayEventsMap,
  CalendarAbsenceEvent,
  CalendarHolidayEvent,
} from "@/src/lib/calendar/calendar-events";
import { CalendarAbsencePill } from "./CalendarAbsencePill";
import { CalendarHolidayBanner } from "./CalendarHolidayBanner";
import { CalendarDayDetailModal } from "./CalendarDayDetailModal";

export interface CalendarGridProps {
  cells: CalendarGridCell[];
  eventsLookup?: Map<string, DayEventsMap>;
  onSelectDate?: (cell: CalendarGridCell) => void;
  className?: string;
}

export function CalendarGrid({
  cells,
  eventsLookup,
  onSelectDate,
  className,
}: CalendarGridProps) {
  // Modal state for day details preview
  const [activeModalCell, setActiveModalCell] = React.useState<CalendarGridCell | null>(null);

  const handleCellClick = (cell: CalendarGridCell) => {
    setActiveModalCell(cell);
    onSelectDate?.(cell);
  };

  const activeDayEvents: DayEventsMap = React.useMemo(() => {
    if (!activeModalCell || !eventsLookup) {
      return { holidays: [], absences: [] };
    }
    return eventsLookup.get(activeModalCell.dateKey) || { holidays: [], absences: [] };
  }, [activeModalCell, eventsLookup]);

  return (
    <>
      <div
        className={cn(
          "w-full rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden select-none",
          className
        )}
        role="region"
        aria-label="Grille du calendrier mensuel des absences"
      >
        {/* 1. Weekday Column Headers (Monday to Sunday) */}
        <div
          className="grid grid-cols-7 border-b border-border bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          role="row"
        >
          {WEEKDAYS_FR.map((weekday, idx) => {
            const isSunday = idx === 6;
            const isSaturday = idx === 5;
            return (
              <div
                key={weekday}
                role="columnheader"
                aria-label={weekday}
                className={cn(
                  "py-3 text-center border-r last:border-r-0 border-border/40",
                  (isSunday || isSaturday) && "text-muted-foreground/80 font-bold"
                )}
              >
                <span className="hidden sm:inline">{weekday}</span>
                <span className="sm:hidden">{WEEKDAYS_SHORT_FR[idx]}</span>
              </div>
            );
          })}
        </div>

        {/* 2. Calendar Date Cells Matrix */}
        <div
          className="grid grid-cols-7 divide-x divide-y divide-border/60"
          role="grid"
        >
          {cells.map((cell) => {
            const dayEvents = eventsLookup?.get(cell.dateKey) || { holidays: [], absences: [] };
            const { holidays, absences } = dayEvents;
            const hasHoliday = holidays.length > 0;
            const totalEvents = holidays.length + absences.length;

            // Maximum visible events before collapsing into "+N autres" badge
            const MAX_VISIBLE_EVENTS = 2;
            const visibleAbsencesCount = Math.max(0, MAX_VISIBLE_EVENTS - holidays.length);
            const visibleAbsences = absences.slice(0, visibleAbsencesCount);
            const hiddenEventsCount = Math.max(0, totalEvents - MAX_VISIBLE_EVENTS);

            return (
              <div
                key={cell.dateKey}
                role="gridcell"
                tabIndex={0}
                aria-label={`${cell.formattedDateFr}. ${totalEvents} événement(s)`}
                aria-current={cell.isToday ? "date" : undefined}
                onClick={() => handleCellClick(cell)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCellClick(cell);
                  }
                }}
                className={cn(
                  "group relative min-h-[105px] sm:min-h-[120px] lg:min-h-[135px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors cursor-pointer",
                  // Current month vs adjacent month
                  cell.isCurrentMonth
                    ? "bg-card text-foreground hover:bg-muted/20"
                    : "bg-muted/20 text-muted-foreground/50 opacity-60 hover:opacity-90",
                  // Weekend subtle background differentiation
                  cell.isWeekend && cell.isCurrentMonth && "bg-muted/10",
                  // Public Holiday subtle festive background tint
                  hasHoliday && cell.isCurrentMonth && "bg-primary/[0.03] dark:bg-primary/[0.06]",
                  // Today distinct focus highlight
                  cell.isToday &&
                    "ring-2 ring-primary ring-inset bg-primary/[0.04] dark:bg-primary/[0.08]"
                )}
              >
                {/* Cell Header: Day of month & badges */}
                <div className="flex items-center justify-between gap-1 w-full shrink-0">
                  <div
                    className={cn(
                      "text-xs sm:text-sm font-semibold transition-transform",
                      cell.isToday
                        ? "flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-xs scale-105"
                        : cell.isCurrentMonth
                        ? "text-foreground group-hover:text-primary"
                        : "text-muted-foreground/60"
                    )}
                  >
                    {cell.dayOfMonth}
                  </div>

                  {/* Today Badge on larger screens */}
                  {cell.isToday && (
                    <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      Aujourd&apos;hui
                    </span>
                  )}

                  {/* Adjacent month indicators */}
                  {!cell.isCurrentMonth && (
                    <span className="hidden lg:inline text-[10px] text-muted-foreground/50 italic font-normal">
                      {cell.isPrevMonth ? "préc." : "suiv."}
                    </span>
                  )}
                </div>

                {/* Cell Body: Render Public Holidays & Absences */}
                <div className="flex-1 my-1 flex flex-col gap-1 overflow-hidden">
                  {/* Public Holidays Banners */}
                  {holidays.map((h) => (
                    <CalendarHolidayBanner
                      key={h.id}
                      holiday={h}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCellClick(cell);
                      }}
                    />
                  ))}

                  {/* Absence Event Pills */}
                  {visibleAbsences.map((a) => (
                    <CalendarAbsencePill
                      key={a.id}
                      event={a}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCellClick(cell);
                      }}
                    />
                  ))}

                  {/* Overflow badge if more events exist */}
                  {hiddenEventsCount > 0 && (
                    <div className="pt-0.5">
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border/80 hover:bg-muted/80 hover:text-foreground transition-colors"
                        title="Voir tous les événements de cette journée"
                      >
                        +{hiddenEventsCount} autre{hiddenEventsCount > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Cell Footer: Rest day indicator or subtle notes */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/50 shrink-0 font-medium">
                  {totalEvents > 0 && (
                    <span className="text-[9px] text-muted-foreground/60 hidden sm:inline">
                      {totalEvents} {totalEvents > 1 ? "évts" : "évt"}
                    </span>
                  )}

                  {cell.isWeekend && cell.isCurrentMonth && (
                    <span className="text-[10px] text-muted-foreground/60 ml-auto font-normal">
                      {cell.dayOfWeek === 0 ? "Repos" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Day Detail Preview Modal */}
      {activeModalCell && (
        <CalendarDayDetailModal
          isOpen={Boolean(activeModalCell)}
          onClose={() => setActiveModalCell(null)}
          dateKey={activeModalCell.dateKey}
          formattedDateFr={activeModalCell.formattedDateFr}
          holidays={activeDayEvents.holidays}
          absences={activeDayEvents.absences}
        />
      )}
    </>
  );
}
