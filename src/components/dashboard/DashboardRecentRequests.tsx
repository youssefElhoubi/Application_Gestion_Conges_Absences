"use client";

import * as React from "react";
import Link from "next/link";
import { History, ArrowRight, ExternalLink, CalendarDays, RotateCcw } from "lucide-react";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { AbsenceListItem } from "@/src/lib/api/absence-client";
import { formatDate } from "@/src/lib/utils";

export interface DashboardRecentRequestsProps {
  recentAbsences: AbsenceListItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  siteId?: number;
}

export function DashboardRecentRequests({
  recentAbsences,
  isLoading = false,
  error = null,
  onRetry,
  siteId,
}: DashboardRecentRequestsProps) {
  const siteParam = siteId ? `?siteId=${siteId}` : "";

  return (
    <Card className="rounded-2xl border border-border shadow-xs overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-border/70 flex items-center justify-between gap-3 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Dernières Demandes d&apos;Absence
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Journal d&apos;activité récent des collaborateurs
            </p>
          </div>
        </div>

        <Link
          href={`/absences${siteParam}`}
          className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          <span>Registre complet</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="p-0">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
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
        ) : recentAbsences.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <p className="text-xs text-muted-foreground">
              Aucune demande d&apos;absence enregistrée pour le moment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/60">
                <tr>
                  <th className="py-3 px-4">Collaborateur</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4 text-center">Jours</th>
                  <th className="py-3 px-4">Demandé le</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentAbsences.map((item) => (
                  <tr
                    key={String(item.id)}
                    className="hover:bg-muted/10 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/absences/${item.id}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors hover:underline block"
                      >
                        {item.employee.fullName}
                      </Link>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {item.employee.employeeId}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border"
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
                    </td>

                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>
                          {formatDate(item.startDate)} → {formatDate(item.endDate)}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-foreground">
                      {item.calculatedWorkingDays} j
                    </td>

                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(item.requestDate)}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/absences/${item.id}`}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Consulter les détails"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="sr-only">Détails de la demande</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
