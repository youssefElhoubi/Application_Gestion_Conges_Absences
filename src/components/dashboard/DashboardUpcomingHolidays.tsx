"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, Calendar, Info, ArrowRight, RotateCcw } from "lucide-react";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { PublicHolidayItem } from "@/src/lib/api/dashboard-client";
import { formatDate } from "@/src/lib/utils";

export interface DashboardUpcomingHolidaysProps {
  holidays: PublicHolidayItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function DashboardUpcomingHolidays({
  holidays,
  isLoading = false,
  error = null,
  onRetry,
}: DashboardUpcomingHolidaysProps) {
  return (
    <Card className="rounded-2xl border border-border shadow-xs overflow-hidden h-full flex flex-col justify-between">
      <div className="p-5 sm:p-6 border-b border-border/70 flex items-center justify-between gap-3 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Prochains Jours Fériés Légaux
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Calendrier marocain chômé et payé (Loi 65-99)
            </p>
          </div>
        </div>

        <Link
          href="/calendar"
          className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1.5"
        >
          <span>Calendrier</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry} className="gap-2 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
                Réessayer
              </Button>
            )}
          </div>
        ) : holidays.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl border border-dashed border-border/80 bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Aucun jour férié à venir dans l&apos;immédiat.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {holidays.map((h) => (
              <Link
                key={String(h.id)}
                href={`/calendar?date=${h.date}`}
                className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card hover:bg-primary/5 hover:border-primary/40 transition-all text-xs group"
                title={`Afficher ${h.label} au calendrier`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0 group-hover:scale-105 transition-transform">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{h.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {h.isReligious ? "Fête religieuse" : "Fête civile légale"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-foreground font-mono group-hover:text-primary transition-colors">
                    {formatDate(h.date)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            En vertu du droit du travail marocain, les jours fériés légaux ne sont jamais décomptés du solde de congé annuel des salariés.
          </span>
        </div>
      </div>
    </Card>
  );
}
