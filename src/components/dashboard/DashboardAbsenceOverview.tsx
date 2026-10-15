"use client";

import * as React from "react";
import Link from "next/link";
import { PieChart, Layers, ArrowUpRight, Clock, RotateCcw } from "lucide-react";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import {
  AbsenceCategoryBreakdown,
  PendingRequestTypeBreakdown,
} from "@/src/lib/api/dashboard-client";

export interface DashboardAbsenceOverviewProps {
  categories: AbsenceCategoryBreakdown[];
  pendingBreakdown?: PendingRequestTypeBreakdown[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  siteId?: number;
}

export function DashboardAbsenceOverview({
  categories,
  pendingBreakdown = [],
  isLoading = false,
  error = null,
  onRetry,
  siteId,
}: DashboardAbsenceOverviewProps) {
  const totalDays = categories.reduce((sum, c) => sum + Number(c.totalDays), 0);
  const totalRequests = categories.reduce((sum, c) => sum + Number(c.requestsCount), 0);
  const siteParam = siteId ? `?siteId=${siteId}` : "";

  return (
    <Card className="rounded-2xl border border-border shadow-xs overflow-hidden h-full flex flex-col justify-between">
      <div className="p-5 sm:p-6 border-b border-border/70 flex items-center justify-between gap-3 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <PieChart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Répartition des Absences par Motif
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consommation réelle en jours ouvrés déduits par catégorie légale
            </p>
          </div>
        </div>

        <Link
          href={`/absences${siteParam}`}
          className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1.5"
        >
          <span>Registre complet</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-4 rounded-full bg-muted/50 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
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
        ) : categories.length === 0 || totalDays === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Layers className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              Aucune absence validée sur la période sélectionnée.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Visual stacked distribution bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Volume total consommé</span>
                <span className="font-bold text-foreground">
                  {totalDays} jour(s) ({totalRequests} demande(s))
                </span>
              </div>

              {/* Accessible segmented progress bar */}
              <div className="h-3.5 w-full rounded-full bg-muted/50 overflow-hidden flex shadow-inner">
                {categories.map((cat) => {
                  const pct = totalDays > 0 ? (Number(cat.totalDays) / totalDays) * 100 : 0;
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={cat.typeId}
                      className="h-full transition-all duration-300 relative group"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat.colorHex,
                      }}
                      title={`${cat.name}: ${cat.totalDays} jours (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Category breakdown cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => {
                const pct = totalDays > 0 ? (Number(cat.totalDays) / totalDays) * 100 : 0;
                return (
                  <Link
                    key={cat.typeId}
                    href={`/calendar?typeId=${cat.typeId}${siteParam}`}
                    className="p-3 rounded-xl border border-border/60 bg-muted/10 hover:bg-primary/5 hover:border-primary/40 transition-all flex items-center justify-between gap-3 group"
                    title={`Filtrer le calendrier par ${cat.name}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-3 w-3 rounded-full shrink-0 group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: cat.colorHex }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {cat.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {cat.requestsCount} demande(s)
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {cat.totalDays} j
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {pct.toFixed(0)}%
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Auxiliary: Pending requests breakdown */}
            {pendingBreakdown.length > 0 && (
              <div className="pt-3 border-t border-border/60 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>Demandes en attente ventilées par nature :</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {pendingBreakdown.map((p) => (
                    <span
                      key={p.typeCode}
                      className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-500/20"
                    >
                      {p.typeName} : <strong>{p.count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
