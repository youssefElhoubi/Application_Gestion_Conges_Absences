"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  CalendarDays,
  ExternalLink,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Sun,
  Moon,
} from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import {
  CalendarAbsenceEvent,
  CalendarHolidayEvent,
} from "@/src/lib/calendar/calendar-events";
import { formatDate } from "@/src/lib/utils";

export interface CalendarDayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string;
  formattedDateFr: string;
  holidays: CalendarHolidayEvent[];
  absences: CalendarAbsenceEvent[];
}

export function CalendarDayDetailModal({
  isOpen,
  onClose,
  dateKey,
  formattedDateFr,
  holidays,
  absences,
}: CalendarDayDetailModalProps) {
  const hasEvents = holidays.length > 0 || absences.length > 0;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="capitalize">{formattedDateFr}</DialogTitle>
            <DialogDescription>
              Détail des jours fériés légaux et absences pour cette journée.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {/* 1. Public Holidays Section */}
        {holidays.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Jour férié officiel ({holidays.length})</span>
            </h3>

            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="p-3 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {holiday.label}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                      {holiday.isReligious ? "Férié Religieux" : "Férié Civil"}
                    </span>
                  </div>
                  {holiday.comment && (
                    <p className="text-xs text-muted-foreground">{holiday.comment}</p>
                  )}
                </div>

                {holiday.holidayId && (
                  <Link
                    href={`/holidays/${holiday.holidayId}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    <span>Détails</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 2. Absences Section */}
        {absences.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Absences & Congés enregistrés ({absences.length})
            </h3>

            <div className="space-y-2">
              {absences.map((event) => {
                const StatusIcon =
                  event.status === "APPROVED"
                    ? CheckCircle2
                    : event.status === "PENDING"
                    ? Clock
                    : event.status === "REJECTED"
                    ? XCircle
                    : Ban;

                return (
                  <div
                    key={event.id}
                    className="p-3.5 rounded-lg border border-border bg-card space-y-2.5 shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    {/* Top Row: Employee & Status Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <Link
                            href={`/employees/${event.employeeId}`}
                            className="font-bold text-sm text-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                          >
                            <span>{event.employeeName}</span>
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                          <p className="text-[11px] text-muted-foreground">
                            Matricule: {event.employeeId}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={event.status} label={event.statusLabelFr} />
                      </div>
                    </div>

                    {/* Middle Row: Absence Type, Fraction & Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50 text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Type: </span>
                        <span>{event.typeName}</span>
                        {event.isDeductible ? (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            (Déductible)
                          </span>
                        ) : (
                          <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                            (Non déductible)
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="font-medium text-foreground">Période: </span>
                        <span>
                          {formatDate(event.startDateKey)} au {formatDate(event.endDateKey)}
                        </span>
                      </div>

                      <div>
                        <span className="font-medium text-foreground">Fraction: </span>
                        {event.isHalfDay ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            {event.fraction === "HALF_DAY_MORNING" ? (
                              <Sun className="h-3 w-3 text-amber-500" />
                            ) : (
                              <Moon className="h-3 w-3 text-indigo-500" />
                            )}
                            Demi-journée ({event.fractionLabelFr})
                          </span>
                        ) : (
                          <span>Journée complète</span>
                        )}
                      </div>

                      <div>
                        <span className="font-medium text-foreground">Jours retenus: </span>
                        <span className="font-bold text-foreground">
                          {String(event.retainedDays || event.calculatedWorkingDays || event.enteredDays)} j
                        </span>
                      </div>
                    </div>

                    {/* Comment (if any) */}
                    {event.comment && (
                      <p className="text-xs italic bg-muted/40 p-2 rounded text-muted-foreground">
                        « {event.comment} »
                      </p>
                    )}

                    {/* Action link */}
                    <div className="flex justify-end pt-1">
                      <Link
                        href={`/absences/${event.absenceId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <span>Voir la demande complète</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasEvents && (
          <div className="p-8 text-center text-muted-foreground space-y-1">
            <p className="font-medium text-sm">Aucun événement enregistré</p>
            <p className="text-xs">
              Il n&apos;y a aucun congé validé, demande en attente ou jour férié pour cette date.
            </p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Fermer
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
