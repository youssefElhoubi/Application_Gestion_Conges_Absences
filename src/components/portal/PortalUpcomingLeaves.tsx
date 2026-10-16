"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, ArrowRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { AbsenceListItem } from "@/src/lib/api/absence-client";
import { formatDate } from "@/src/lib/utils";

export interface PortalUpcomingLeavesProps {
  absences: AbsenceListItem[];
  onSelectAbsence?: (absence: AbsenceListItem) => void;
  isLoading?: boolean;
}

export function PortalUpcomingLeaves({
  absences,
  onSelectAbsence,
  isLoading,
}: PortalUpcomingLeavesProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="h-6 w-48 bg-muted/60 animate-pulse rounded" />
        <div className="h-24 bg-muted/40 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h3 className="text-base font-bold text-foreground">
            Vos prochains congés validés
          </h3>
        </div>
        <Link
          href="/portal/requests"
          className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          <span>Toutes mes demandes</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {absences.length === 0 ? (
        <div className="py-8 text-center space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Aucun congé à venir programmé
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Vous n&apos;avez actuellement aucun congé validé pour les prochaines semaines. Vous pouvez planifier votre prochaine absence à tout moment.
            </p>
          </div>
          <Link href="/portal/requests/new">
            <Button size="sm" variant="outline" className="text-xs">
              Planifier un congé
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {absences.map((absence) => {
            const start = formatDate(absence.startDate);
            const end = formatDate(absence.endDate);
            const days = Number(absence.retainedDays || absence.calculatedWorkingDays);
            const isSingleDay = start === end;

            return (
              <div
                key={absence.id}
                onClick={() => onSelectAbsence?.(absence)}
                className="group flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer gap-2"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: absence.type.colorHex || "#10b981" }}
                  />
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground font-semibold">#{absence.id}</span>
                      <span>{absence.type.name}</span>
                      {absence.reason && (
                        <span className="text-xs font-normal text-muted-foreground">
                          • {absence.reason.name}
                        </span>
                      )}
                      <StatusBadge status={absence.status} size="sm" />
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{isSingleDay ? `Le ${start}` : `Du ${start} au ${end}`}</span>
                      <span>({absence.fraction === "FULL_DAY" ? "Journée entière" : "Demi-journée"})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    {days} {days > 1 ? "jours ouvrés" : "jour ouvré"}
                  </span>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    Détails →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
