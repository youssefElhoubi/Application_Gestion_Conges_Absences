"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sun,
  Moon,
  User,
  ExternalLink,
  MapPin,
  Tag,
  FileText,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import {
  CalendarAbsenceEvent,
  CalendarHolidayEvent,
  DayEventsMap,
} from "@/src/lib/calendar/calendar-events";

export interface CalendarDaySelectedViewProps {
  dateKey: string;
  formattedDateFr: string;
  isToday?: boolean;
  events?: DayEventsMap;
  onSelectAbsence?: (event: CalendarAbsenceEvent) => void;
  onSelectHoliday?: (holiday: CalendarHolidayEvent) => void;
  isLoading?: boolean;
  className?: string;
}

export function CalendarDaySelectedView({
  dateKey,
  formattedDateFr,
  isToday = false,
  events,
  onSelectAbsence,
  onSelectHoliday,
  isLoading = false,
  className,
}: CalendarDaySelectedViewProps) {
  const holidays = events?.holidays || [];
  const absences = events?.absences || [];
  const totalEvents = holidays.length + absences.length;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col gap-4 transition-all",
        className
      )}
      role="region"
      aria-label={`Événements du ${formattedDateFr}`}
    >
      {/* 1. Header Bar: Selected Date & Stats */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground capitalize">
              {formattedDateFr}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {totalEvents > 0
                ? `${totalEvents} événement${totalEvents > 1 ? "s" : ""} enregistré${totalEvents > 1 ? "s" : ""}`
                : "Aucun événement prévu"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {isToday && (
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
      </div>

      {/* 2. Loading State */}
      {isLoading ? (
        <div className="flex flex-col gap-3 py-2 animate-pulse">
          <div className="h-16 rounded-lg bg-muted/60" />
          <div className="h-24 rounded-lg bg-muted/40" />
        </div>
      ) : totalEvents === 0 ? (
        /* 3. Empty Day State */
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2 border border-dashed border-border/80 rounded-lg bg-muted/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground/80">
            <Calendar className="h-5 w-5" />
          </div>
          <p className="text-xs font-medium text-foreground">
            Aucune absence ni jour férié prévu
          </p>
          <p className="text-[11px] text-muted-foreground max-w-xs">
            Sélectionnez une date avec des puces colorées dans le calendrier ou consultez la vue Agenda.
          </p>
        </div>
      ) : (
        /* 4. Event Lists (Holidays & Absences) */
        <div className="flex flex-col gap-3">
          {/* Public Holidays */}
          {holidays.map((h) => (
            <div
              key={h.id}
              className="rounded-lg border border-primary/30 bg-primary/[0.04] dark:bg-primary/[0.08] p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary mt-0.5">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex flex-col gap-0.5">
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
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Jour férié légal officiel chômé et payé (Loi n° 65-99)
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
                  "rounded-lg border p-3 sm:p-3.5 flex flex-col gap-2.5 transition-colors bg-background/60 hover:bg-muted/15 shadow-2xs",
                  isApproved
                    ? "border-emerald-500/30 hover:border-emerald-500/50"
                    : isPending
                    ? "border-amber-500/30 border-dashed hover:border-amber-500/50"
                    : isRejected
                    ? "border-destructive/30 hover:border-destructive/50"
                    : "border-border/80"
                )}
              >
                {/* Absence Header: Employee Name & Status Badge */}
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

                  {/* Status Indicator */}
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

                {/* Absence Metadata Details */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground pt-1 border-t border-border/40">
                  {/* Type Badge */}
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

                  {/* Half-Day Badge */}
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

                  {/* Multi-day date span */}
                  {a.isMultiDay && (
                    <span className="text-[11px] text-muted-foreground">
                      Du {a.startDateKey} au {a.endDateKey}
                    </span>
                  )}

                  {/* Reason if available */}
                  {a.reasonName && (
                    <span className="text-[11px] text-muted-foreground/80 italic">
                      ({a.reasonName})
                    </span>
                  )}

                  {/* Deductible status */}
                  <span className="text-[10px] text-muted-foreground/70 ml-auto">
                    {a.isDeductible ? "Déductible" : "Non déductible"}
                  </span>
                </div>

                {/* Action Links */}
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
      )}
    </div>
  );
}
