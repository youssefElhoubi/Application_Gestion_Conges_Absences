"use client";

import * as React from "react";
import { Sparkles, Info } from "lucide-react";
import { PortalUpcomingHoliday } from "@/src/lib/api/portal-client";
import { formatDate } from "@/src/lib/utils";

export interface PortalUpcomingHolidaysProps {
  holidays: PortalUpcomingHoliday[];
  isLoading?: boolean;
}

export function PortalUpcomingHolidays({ holidays, isLoading }: PortalUpcomingHolidaysProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="h-5 w-40 bg-muted/60 animate-pulse rounded" />
        <div className="h-20 bg-muted/40 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-foreground">
            Prochains jours fériés légaux
          </h3>
        </div>
        <span className="text-[11px] text-muted-foreground">Maroc</span>
      </div>

      {holidays.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">
          Aucun jour férié à venir dans l&apos;immédiat.
        </p>
      ) : (
        <div className="space-y-2">
          {holidays.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs"
            >
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span>{h.label}</span>
                  {h.isReligious && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Fête religieuse
                    </span>
                  )}
                </div>
                {h.comment && <div className="text-[11px] text-muted-foreground">{h.comment}</div>}
              </div>
              <div className="font-medium text-foreground bg-background px-2.5 py-1 rounded border border-border/60">
                {formatDate(h.date)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <span>
          Conformément au Code du Travail marocain, les jours fériés légaux sont chômés et payés et ne sont jamais décomptés de votre solde annuel.
        </span>
      </div>
    </div>
  );
}
