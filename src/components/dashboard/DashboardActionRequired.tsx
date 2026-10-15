"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  CalendarDays,
  FileCheck2,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Card } from "@/src/components/ui/card";
import { AbsenceListItem } from "@/src/lib/api/absence-client";
import { formatDate } from "@/src/lib/utils";

export interface DashboardActionRequiredProps {
  pendingAbsences: AbsenceListItem[];
  totalPending: number;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  siteId?: number;
}

export function DashboardActionRequired({
  pendingAbsences,
  totalPending,
  isLoading = false,
  error = null,
  onRetry,
  siteId,
}: DashboardActionRequiredProps) {
  const siteParam = siteId ? `&siteId=${siteId}` : "";

  return (
    <Card className="rounded-2xl border border-border shadow-xs overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Demandes en attente de validation
              </h3>
              {totalPending > 0 && (
                <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold px-2 py-0.5">
                  {totalPending} à traiter
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Demandes de congés et d&apos;absences nécessitant un arbitrage RH ou managérial
            </p>
          </div>
        </div>

        {totalPending > 0 && (
          <Link
            href={`/absences?status=PENDING${siteParam}`}
            className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Voir tout ({totalPending})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-18 rounded-xl bg-muted/40 animate-pulse" />
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
        ) : pendingAbsences.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2.5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">
              Toutes les demandes sont à jour !
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Aucune demande de congé n&apos;est actuellement en attente d&apos;approbation dans votre périmètre.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAbsences.map((item) => (
              <div
                key={String(item.id)}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/10 transition-colors gap-4"
              >
                {/* Employee & Type */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs shrink-0">
                    {item.employee.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/absences/${item.id}`}
                        className="font-semibold text-sm text-foreground hover:text-primary transition-colors hover:underline"
                      >
                        {item.employee.fullName}
                      </Link>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({item.employee.employeeId})
                      </span>
                      {item.employee.site?.name && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                          {item.employee.site.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border"
                        style={{
                          backgroundColor: `${item.type.colorHex}15`,
                          color: item.type.colorHex,
                          borderColor: `${item.type.colorHex}30`,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: item.type.colorHex }}
                        />
                        {item.type.name}
                      </span>

                      {item.supportingDocumentProvided && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          <FileCheck2 className="h-3 w-3" />
                          Justificatif joint
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dates & Working days */}
                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-border/60">
                  <div className="space-y-0.5 text-left md:text-right">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {formatDate(item.startDate)} → {formatDate(item.endDate)}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      <strong className="text-foreground font-semibold">
                        {item.calculatedWorkingDays} jour(s) ouvré(s)
                      </strong>
                      <span className="mx-1.5">•</span>
                      <span>Demandé le {formatDate(item.requestDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} size="sm" />
                    <Link
                      href={`/absences/${item.id}`}
                      className="inline-flex items-center justify-center font-medium border border-border bg-card text-foreground hover:bg-muted shadow-xs h-8 px-2.5 text-xs rounded-md gap-1 transition-all"
                    >
                      <span>Examiner</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
