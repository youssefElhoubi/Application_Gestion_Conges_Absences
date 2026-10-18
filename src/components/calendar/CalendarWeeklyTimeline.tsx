"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Sun,
  Moon,
  User,
  ExternalLink,
  Info,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
  CalendarGridCell,
  WEEKDAYS_SHORT_FR,
} from "@/src/lib/calendar/calendar-grid";
import {
  CalendarAbsenceEvent,
  CalendarHolidayEvent,
  extractDateKey,
  mapAbsenceToCellEvent,
  mapHolidayToCellEvent,
} from "@/src/lib/calendar/calendar-events";
import { AbsenceListItem } from "@/src/lib/api/absence-client";
import { PublicHolidayItem } from "@/src/lib/api/holiday-client";
import { EmployeeListItem } from "@/src/lib/api/employee-client";

export interface CalendarWeeklyTimelineProps {
  days: CalendarGridCell[];
  employees: EmployeeListItem[];
  absences: AbsenceListItem[];
  holidays: PublicHolidayItem[];
  isLoading?: boolean;
  onSelectAbsence?: (event: CalendarAbsenceEvent) => void;
  onSelectHoliday?: (holiday: CalendarHolidayEvent) => void;
  className?: string;
}

export function CalendarWeeklyTimeline({
  days,
  employees,
  absences,
  holidays,
  isLoading = false,
  onSelectAbsence,
  onSelectHoliday,
  className,
}: CalendarWeeklyTimelineProps) {
  const weekStart = days[0]?.dateKey;
  const weekEnd = days[6]?.dateKey;

  // Map of public holidays in this week keyed by dateKey
  const holidaysByDate = React.useMemo(() => {
    const map = new Map<string, PublicHolidayItem>();
    holidays.forEach((h) => {
      const key = extractDateKey(h.date);
      if (weekStart && weekEnd && key >= weekStart && key <= weekEnd) {
        map.set(key, h);
      }
    });
    return map;
  }, [holidays, weekStart, weekEnd]);

  // Group absences by employeeId for this week
  const absencesByEmployee = React.useMemo(() => {
    const map = new Map<string, AbsenceListItem[]>();
    absences.forEach((a) => {
      const start = extractDateKey(a.startDate);
      const end = extractDateKey(a.endDate);
      // Check overlap with week [weekStart, weekEnd]
      if (weekStart && weekEnd && start <= weekEnd && end >= weekStart) {
        const list = map.get(a.employeeId) || [];
        list.push(a);
        map.set(a.employeeId, list);
      }
    });
    return map;
  }, [absences, weekStart, weekEnd]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "w-full rounded-xl border border-border bg-card p-4 space-y-4 animate-pulse",
          className
        )}
      >
        <div className="h-10 bg-muted/60 rounded-lg" />
        {[1, 2, 3, 4, 5].map((idx) => (
          <div key={idx} className="flex gap-4 items-center">
            <Skeleton className="h-12 w-48 rounded-lg shrink-0" />
            <Skeleton className="h-12 flex-1 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div
        className={cn(
          "w-full rounded-xl border border-border bg-card p-8 text-center flex flex-col items-center justify-center gap-2",
          className
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          Aucun collaborateur trouvé
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Aucun collaborateur ne correspond aux critères et filtres de recherche sélectionnés.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border bg-card shadow-xs overflow-hidden select-none",
        className
      )}
      role="region"
      aria-label="Planning hebdomadaire des absences de l'équipe"
    >
      {/* Scrollable Container with sticky employee column */}
      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          {/* 1. Header Row */}
          <div className="grid grid-cols-12 border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground">
            {/* Left Header: Collaborateur */}
            <div
              className="col-span-4 sm:col-span-3 p-3 border-r border-border/60 flex items-center justify-between"
              role="columnheader"
            >
              <span className="font-bold text-foreground">Collaborateur</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {employees.length} affiché{employees.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Right Header: 7 Weekday Columns */}
            <div className="col-span-8 sm:col-span-9 grid grid-cols-7 divide-x divide-border/60">
              {days.map((day, idx) => {
                const holiday = holidaysByDate.get(day.dateKey);
                const isSunday = day.dayOfWeek === 0;
                const isSaturday = day.dayOfWeek === 6;

                return (
                  <div
                    key={day.dateKey}
                    role="columnheader"
                    className={cn(
                      "p-2 text-center flex flex-col items-center justify-between min-h-[58px]",
                      day.isToday && "bg-primary/[0.06] font-bold",
                      holiday && "bg-amber-500/[0.08] dark:bg-amber-500/[0.12]",
                      (isSunday || isSaturday) && !day.isToday && !holiday && "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {WEEKDAYS_SHORT_FR[idx]}
                      </span>
                    </div>

                    <div className="flex items-center justify-center my-0.5">
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-bold flex h-6 w-6 items-center justify-center rounded-full",
                          day.isToday
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "text-foreground"
                        )}
                      >
                        {day.dayOfMonth}
                      </span>
                    </div>

                    {/* Holiday Indicator */}
                    {holiday ? (
                      <button
                        type="button"
                        onClick={() => onSelectHoliday?.(mapHolidayToCellEvent(holiday))}
                        className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 inline-flex items-center gap-0.5 truncate max-w-[85px] hover:underline"
                        title={`${holiday.label} (Jour férié)`}
                      >
                        <Sparkles className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{holiday.label}</span>
                      </button>
                    ) : (
                      <span className="text-[9px] text-muted-foreground/50">
                        {isSunday ? "Repos" : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Employee Rows */}
          <div className="divide-y divide-border/60">
            {employees.map((emp) => {
              const empAbsences = absencesByEmployee.get(emp.employeeId) || [];
              const hasAbsence = empAbsences.length > 0;

              return (
                <div
                  key={emp.employeeId}
                  className="grid grid-cols-12 transition-colors hover:bg-muted/10 group"
                  role="row"
                >
                  {/* Left Column: Employee Identity */}
                  <div
                    className="col-span-4 sm:col-span-3 p-3 border-r border-border/60 flex items-center justify-between gap-2 bg-card group-hover:bg-muted/20 transition-colors"
                    role="rowheader"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                        {emp.fullName
                          ? emp.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()
                          : "CO"}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/employees/${encodeURIComponent(emp.employeeId)}`}
                          className="text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
                          title={`Voir la fiche de ${emp.fullName}`}
                        >
                          {emp.fullName}
                        </Link>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                          <span>{emp.employeeId}</span>
                          {emp.site?.name && (
                            <>
                              <span>•</span>
                              <span className="truncate">{emp.site.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/employees/${encodeURIComponent(emp.employeeId)}`}
                      className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      aria-label={`Accéder à la fiche de ${emp.fullName}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Right Columns: 7 Day Timeline Slots & Spanning Absence Bars */}
                  <div className="col-span-8 sm:col-span-9 relative min-h-[56px] flex flex-col justify-center">
                    {/* Background Column Slots (fills full row height dynamically) */}
                    <div className="absolute inset-0 grid grid-cols-7 divide-x divide-border/40 pointer-events-none">
                      {days.map((day) => {
                        const holiday = holidaysByDate.get(day.dateKey);
                        const isSunday = day.dayOfWeek === 0;
                        const isSaturday = day.dayOfWeek === 6;

                        return (
                          <div
                            key={day.dateKey}
                            className={cn(
                              "h-full w-full pointer-events-none",
                              day.isToday && "bg-primary/[0.02]",
                              holiday && "bg-amber-500/[0.04]",
                              (isSunday || isSaturday) && "bg-muted/10"
                            )}
                          />
                        );
                      })}
                    </div>

                    {/* Spanning Absence Bars: In-flow grid allowing natural vertical expansion for multi-absence rows */}
                    {hasAbsence ? (
                      <div className="relative z-10 grid grid-cols-7 gap-1.5 p-1.5 w-full pointer-events-none">
                        {empAbsences.map((absence) => {
                          const absStart = extractDateKey(absence.startDate);
                          const absEnd = extractDateKey(absence.endDate);

                          if (!weekStart || !weekEnd) return null;

                          // Clamp absence boundaries to the current week
                          const clampedStart = absStart < weekStart ? weekStart : absStart;
                          const clampedEnd = absEnd > weekEnd ? weekEnd : absEnd;

                          const startIdx = days.findIndex((d) => d.dateKey === clampedStart);
                          const endIdx = days.findIndex((d) => d.dateKey === clampedEnd);

                          if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return null;

                          const colSpan = endIdx - startIdx + 1;
                          const mappedEvent = mapAbsenceToCellEvent(absence, clampedStart, startIdx);

                          const isApproved = absence.status === "APPROVED";
                          const isPending = absence.status === "PENDING";
                          const isRejected = absence.status === "REJECTED";
                          const isHalfDay = absence.fraction !== "FULL_DAY";
                          const colorHex = absence.type?.colorHex || "#3b82f6";

                          return (
                            <button
                              key={absence.id}
                              type="button"
                              tabIndex={0}
                              role="button"
                              onClick={() => onSelectAbsence?.(mappedEvent)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onSelectAbsence?.(mappedEvent);
                                }
                              }}
                              style={{
                                gridColumnStart: startIdx + 1,
                                gridColumnEnd: startIdx + 1 + colSpan,
                                backgroundColor: `${colorHex}18`,
                                borderColor: `${colorHex}60`,
                              }}
                              aria-label={`${emp.fullName}, ${absence.type?.name}, du ${absStart} au ${absEnd}, ${mappedEvent.statusLabelFr}`}
                              className={cn(
                                "pointer-events-auto flex items-center justify-between px-2 py-1 rounded-lg border text-left transition-all overflow-hidden cursor-pointer shadow-2xs group/bar",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 hover:brightness-95",
                                isApproved && "border-solid",
                                isPending && "border-dashed",
                                isRejected && "opacity-60"
                              )}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: colorHex }}
                                />
                                <span
                                  className="text-[11px] font-bold truncate"
                                  style={{ color: colorHex }}
                                >
                                  {absence.type?.name || "Absence"}
                                </span>

                                {isHalfDay && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-1 rounded shrink-0">
                                    {absence.fraction === "HALF_DAY_MORNING" ? (
                                      <>
                                        <Sun className="h-2.5 w-2.5 text-amber-500" />
                                        <span>Matin</span>
                                      </>
                                    ) : (
                                      <>
                                        <Moon className="h-2.5 w-2.5 text-indigo-500" />
                                        <span>Après-midi</span>
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Status Badge Mini */}
                              <div className="shrink-0 ml-1">
                                {isApproved && (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                )}
                                {isPending && (
                                  <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                )}
                                {isRejected && (
                                  <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="min-h-[52px]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Info Bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-muted/20 border-t border-border text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            {absences.length} absence{absences.length > 1 ? "s" : ""} active{absences.length > 1 ? "s" : ""} cette semaine
            sur {employees.length} collaborateur{employees.length > 1 ? "s" : ""}.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300 text-[11px]">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Validé (Plein)
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300 text-[11px]">
            <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            En attente (Tireté)
          </span>
        </div>
      </div>
    </div>
  );
}
