"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Sun,
  Moon,
  User,
  ExternalLink,
  MapPin,
  FileText,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
import { CalendarGridCell } from "@/src/lib/calendar/calendar-grid";
import {
  CalendarAbsenceEvent,
  CalendarHolidayEvent,
  DayEventsMap,
} from "@/src/lib/calendar/calendar-events";

export interface CalendarAgendaViewProps {
  cells: CalendarGridCell[];
  eventsLookup?: Map<string, DayEventsMap>;
  monthNameFr: string;
  year: number;
  isLoading?: boolean;
  onSelectAbsence?: (event: CalendarAbsenceEvent) => void;
  onSelectHoliday?: (holiday: CalendarHolidayEvent) => void;
  className?: string;
}

export function CalendarAgendaView({
  cells,
  eventsLookup,
  monthNameFr,
  year,
  isLoading = false,
  onSelectAbsence,
  onSelectHoliday,
  className,
}: CalendarAgendaViewProps) {
  // Filter only current month cells that have at least one event
  const daysWithEvents = React.useMemo(() => {
    return cells
      .filter((cell) => cell.isCurrentMonth)
      .map((cell) => {
        const dayData = eventsLookup?.get(cell.dateKey) || {
          holidays: [],
          absences: [],
        };
        const total = dayData.holidays.length + dayData.absences.length;
        return {
          cell,
          ...dayData,
          totalEvents: total,
        };
      })
      .filter((day) => day.totalEvents > 0);
  }, [cells, eventsLookup]);

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border/70 bg-card p-4 space-y-3 animate-pulse"
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
            </div>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (daysWithEvents.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/80 bg-card p-8 text-center flex flex-col items-center justify-center gap-3",
          className
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          Aucun événement dans l&apos;agenda
        </h3>
        <p className="text-xs text-muted-foreground max-w-md">
          Aucune absence ni jour férié ne correspond aux filtres actifs pour{" "}
          <strong className="text-foreground">
            {monthNameFr} {year}
          </strong>
          .
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      role="feed"
      aria-label={`Agenda des absences pour ${monthNameFr} ${year}`}
    >
      {daysWithEvents.map(({ cell, holidays, absences, totalEvents }) => (
        <article
          key={cell.dateKey}
          className="rounded-xl border border-border bg-card shadow-xs overflow-hidden transition-all"
        >
          {/* Day Header Bar */}
          <header className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/40 border-b border-border/70">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs sm:text-sm",
                  cell.isToday
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background text-foreground border border-border"
                )}
              >
                {cell.dayOfMonth}
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-foreground capitalize">
                  {cell.formattedDateFr}
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {cell.dayNameFr} • Semaine {Math.ceil(cell.dayOfMonth / 7)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {cell.isToday && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold"
                >
                  Aujourd&apos;hui
                </Badge>
              )}
              <Badge variant="secondary" className="text-[11px] font-medium">
                {totalEvents} {totalEvents > 1 ? "événements" : "événement"}
              </Badge>
            </div>
          </header>

          {/* Events inside this Day */}
          <div className="p-3 sm:p-4 flex flex-col gap-2.5">
            {/* Public Holidays */}
            {holidays.map((h) => (
              <div
                key={h.id}
                className="rounded-lg border border-primary/30 bg-primary/[0.04] dark:bg-primary/[0.08] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        {h.label}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold"
                      >
                        {h.isReligious ? "Férié Religieux" : "Férié Civil"}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Jour férié chômé payé (Loi n° 65-99)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectHoliday?.(h)}
                    className="h-7 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                  >
                    Détails
                  </Button>
                  <Link
                    href={`/holidays/${h.holidayId}`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded hover:bg-muted/60 transition-colors"
                  >
                    <span>Fiche</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}

            {/* Employee Absences */}
            {absences.map((a) => {
              const isApproved = a.status === "APPROVED";
              const isPending = a.status === "PENDING";
              const isRejected = a.status === "REJECTED";

              return (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-lg border p-3 flex flex-col gap-2.5 transition-colors bg-background/60 hover:bg-muted/15 shadow-2xs",
                    isApproved
                      ? "border-emerald-500/30 hover:border-emerald-500/50"
                      : isPending
                      ? "border-amber-500/30 border-dashed hover:border-amber-500/50"
                      : isRejected
                      ? "border-destructive/30 hover:border-destructive/50"
                      : "border-border/80"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">
                        {a.employeeName
                          ? a.employeeName
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()
                          : "CO"}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-foreground">
                          {a.employeeName}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span>{a.employeeId}</span>
                          {a.employeeSiteName && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5 text-muted-foreground/70" />
                                {a.employeeSiteName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          Validé
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          En attente
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                          <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                          Refusé
                        </span>
                      )}
                      {!isApproved && !isPending && !isRejected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                          {a.statusLabelFr}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border"
                      style={{
                        backgroundColor: `${a.typeColor}15`,
                        color: a.typeColor,
                        borderColor: `${a.typeColor}30`,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: a.typeColor }}
                      />
                      {a.typeName}
                    </span>

                    {a.isHalfDay && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                        {a.fraction === "HALF_DAY_MORNING" ? (
                          <>
                            <Sun className="h-3 w-3 text-amber-500" />
                            <span>Matin (0,5j)</span>
                          </>
                        ) : (
                          <>
                            <Moon className="h-3 w-3 text-indigo-500" />
                            <span>Après-midi (0,5j)</span>
                          </>
                        )}
                      </span>
                    )}

                    {a.isMultiDay && (
                      <span className="text-[11px] text-muted-foreground">
                        Du {a.startDateKey} au {a.endDateKey}
                      </span>
                    )}

                    {a.reasonName && (
                      <span className="text-[11px] text-muted-foreground/80 italic">
                        ({a.reasonName})
                      </span>
                    )}

                    <span className="text-[10px] text-muted-foreground/70 ml-auto">
                      {a.isDeductible ? "Déductible" : "Non déductible"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectAbsence?.(a)}
                      className="h-7 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      Inspecter
                    </Button>

                    <Link
                      href={`/absences/${a.absenceId}`}
                      className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline px-2 py-1"
                    >
                      <FileText className="h-3 w-3" />
                      <span>Demande</span>
                    </Link>

                    <Link
                      href={`/employees/${encodeURIComponent(a.employeeId)}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded hover:bg-muted/60 transition-colors"
                    >
                      <User className="h-3 w-3" />
                      <span>Collaborateur</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
