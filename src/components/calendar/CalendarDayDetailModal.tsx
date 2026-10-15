"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  CalendarDays,
  ExternalLink,
  User,
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Sun,
  Moon,
  Tag,
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
  onSelectAbsence?: (event: CalendarAbsenceEvent) => void;
  onSelectHoliday?: (holiday: CalendarHolidayEvent) => void;
}

export function CalendarDayDetailModal({
  isOpen,
  onClose,
  dateKey,
  formattedDateFr,
  holidays,
  absences,
  onSelectAbsence,
  onSelectHoliday,
}: CalendarDayDetailModalProps) {
  const hasEvents = holidays.length > 0 || absences.length > 0;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <DialogHeader>
        <div className="flex items-center gap-2 pr-6">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="capitalize text-base font-bold">
              {formattedDateFr}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Récapitulatif des jours fériés légaux et congés enregistrés pour cette date.
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
                className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">
                      {holiday.label}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                      {holiday.isReligious ? "Férié Légal Religieux" : "Férié Légal Civil"}
                    </span>
                  </div>
                  {holiday.comment && (
                    <p className="text-xs text-muted-foreground italic">{holiday.comment}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {onSelectHoliday && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectHoliday(holiday)}
                      className="text-xs h-8 text-primary hover:text-primary"
                    >
                      Aperçu
                    </Button>
                  )}
                  {holiday.holidayId && (
                    <Link href={`/holidays/${holiday.holidayId}`}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        rightIcon={<ExternalLink className="h-3 w-3" />}
                        className="text-xs h-8 font-medium"
                      >
                        Fiche du Jour Férié
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. Absences Section */}
        {absences.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Absences & Congés ({absences.length})
            </h3>

            <div className="space-y-2.5">
              {absences.map((event) => {
                const retainedWorkingDays = Number(
                  event.retainedDays || event.calculatedWorkingDays || event.enteredDays || 0
                );

                return (
                  <div
                    key={event.id}
                    className="p-3.5 rounded-xl border border-border bg-card space-y-3 shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    {/* Top Row: Employee & Status Badge */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <Link
                            href={`/employees/${encodeURIComponent(event.employeeId)}`}
                            className="font-bold text-sm text-foreground hover:text-primary transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                          >
                            <span>{event.employeeName}</span>
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span className="font-mono">{event.employeeId}</span>
                            {event.employeeSiteName && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {event.employeeSiteName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <StatusBadge status={event.status} label={event.statusLabelFr} />
                    </div>

                    {/* Middle Row: Absence Type, Fraction & Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50 text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Type: </span>
                        <span className="font-semibold text-foreground">{event.typeName}</span>
                        {event.isDeductible ? (
                          <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            (Déductible)
                          </span>
                        ) : (
                          <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            (Non déductible)
                          </span>
                        )}
                      </div>

                      {event.reasonName && (
                        <div>
                          <span className="font-medium text-foreground">Motif: </span>
                          <span className="font-semibold text-foreground">{event.reasonName}</span>
                        </div>
                      )}

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
                          {retainedWorkingDays} jour{retainedWorkingDays > 1 ? "s" : ""}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          ({String(event.enteredDays)} j. cal.)
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                      {onSelectAbsence && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectAbsence(event)}
                          className="text-xs h-7.5"
                        >
                          Aperçu
                        </Button>
                      )}

                      <Link href={`/employees/${encodeURIComponent(event.employeeId)}`}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          leftIcon={<User className="h-3 w-3" />}
                          className="text-xs h-7.5 font-medium"
                        >
                          Fiche Collaborateur
                        </Button>
                      </Link>

                      <Link href={`/absences/${event.absenceId}`}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          leftIcon={<FileText className="h-3 w-3" />}
                          rightIcon={<ExternalLink className="h-3 w-3" />}
                          className="text-xs h-7.5 font-semibold text-primary border-primary/30 hover:bg-primary/5"
                        >
                          Voir la Demande
                        </Button>
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
        <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
          Fermer
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
