"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Users, ArrowUpRight, RotateCcw } from "lucide-react";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { SiteEmployeeDistribution } from "@/src/lib/api/dashboard-client";

export interface DashboardSiteDistributionProps {
  sites: SiteEmployeeDistribution[];
  totalEmployees: number;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  selectedSiteId?: number;
  onSelectSite?: (siteId: number | undefined) => void;
}

export function DashboardSiteDistribution({
  sites,
  totalEmployees,
  isLoading = false,
  error = null,
  onRetry,
  selectedSiteId,
  onSelectSite,
}: DashboardSiteDistributionProps) {
  return (
    <Card className="rounded-2xl border border-border shadow-xs overflow-hidden h-full flex flex-col justify-between">
      <div className="p-5 sm:p-6 border-b border-border/70 flex items-center justify-between gap-3 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Répartition par Site
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Effectifs actifs répartis sur les implantations
            </p>
          </div>
        </div>

        <Link
          href="/employees"
          className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1.5"
        >
          <span>Tous les effectifs</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
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
        ) : sites.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2">
            <p className="text-xs text-muted-foreground">
              Aucun site configuré dans l&apos;application.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => {
              const count = site.activeEmployeesCount;
              const pct = totalEmployees > 0 ? (count / totalEmployees) * 100 : 0;
              const isSelected = selectedSiteId === site.siteId;

              return (
                <div
                  key={site.siteId}
                  onClick={() => onSelectSite?.(isSelected ? undefined : site.siteId)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border/70 bg-card hover:bg-muted/10 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {site.siteName}
                      </span>
                      <span className="text-[11px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                        {site.city}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{count} actif(s)</span>
                      <span className="text-muted-foreground font-normal">
                        ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>Effectif total consolidé</span>
          <span className="font-bold text-foreground">{totalEmployees} salariés</span>
        </div>
      </div>
    </Card>
  );
}
