"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  Clock,
  ExternalLink,
  FileCheck2,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { formatDate, formatLeaveDays, toSafeNumber } from "@/src/lib/utils";
import {
  LEGAL_STATUTORY_LABELS,
  ABSENCE_FILTER_TABS,
} from "@/src/lib/leave-balances/leave-balance.constants";
import type {
  AbsenceListItem,
  AbsenceFilterTab,
} from "@/src/lib/leave-balances/leave-balance.types";

export interface AbsenceHistorySectionProps {
  employeeId: string;
  absences: AbsenceListItem[];
  filteredAbsences: AbsenceListItem[];
  activeTab: AbsenceFilterTab;
  onTabChange: (tab: AbsenceFilterTab) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  totalApprovedDeductions: number;
}

export function AbsenceHistorySection({
  employeeId,
  absences,
  filteredAbsences,
  activeTab,
  onTabChange,
  isLoading,
  error,
  onRetry,
  totalApprovedDeductions,
}: AbsenceHistorySectionProps) {
  const tabCounts = React.useMemo(() => {
    return {
      all: absences.length,
      approved: absences.filter((a) => a.status === "APPROVED").length,
      pending: absences.filter((a) => a.status === "PENDING").length,
      other: absences.filter(
        (a) => a.status === "REJECTED" || a.status === "CANCELLED"
      ).length,
    };
  }, [absences]);

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (index + 1) % ABSENCE_FILTER_TABS.length;
      const nextTab = ABSENCE_FILTER_TABS[nextIndex];
      onTabChange(nextTab.id);
      document.getElementById(`tab-${nextTab.id}-absences`)?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex =
        (index - 1 + ABSENCE_FILTER_TABS.length) % ABSENCE_FILTER_TABS.length;
      const prevTab = ABSENCE_FILTER_TABS[prevIndex];
      onTabChange(prevTab.id);
      document.getElementById(`tab-${prevTab.id}-absences`)?.focus();
    }
  };

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3 border-b border-border/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold">
                Historique et Décomptes des Absences
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Demandes enregistrées, décomptes retenus et statuts de traitement
            </CardDescription>
          </div>

          {/* View All Absences Action (Filtered by Employee) */}
          <Link
            href={`/absences?search=${encodeURIComponent(
              employeeId
            )}&employeeId=${encodeURIComponent(employeeId)}`}
            className="inline-flex items-center justify-center font-medium transition-all select-none border border-border bg-card text-foreground hover:bg-muted shadow-xs h-7 px-2.5 text-xs rounded-sm gap-1 group self-start sm:self-center"
          >
            <CalendarDays className="h-3.5 w-3.5 mr-0.5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span>Voir toutes les absences</span>
            <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>

        {/* Tabs for filtering display */}
        {!isLoading && !error && absences.length > 0 && (
          <div
            className="flex items-center gap-1.5 pt-3 overflow-x-auto text-[11px]"
            role="tablist"
            aria-label="Filtrer l'historique des absences par statut"
          >
            {ABSENCE_FILTER_TABS.map((tab, idx) => {
              const isSelected = activeTab === tab.id;
              const count = tabCounts[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}-absences`}
                  aria-selected={isSelected}
                  aria-controls="absence-history-panel"
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => onTabChange(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? tab.activeClass
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        {/* Section Loading Skeleton */}
        {isLoading && (
          <div className="space-y-3 py-2">
            <div className="h-10 bg-muted/40 rounded-lg animate-pulse" />
            <div className="h-14 bg-muted/30 rounded-lg animate-pulse" />
            <div className="h-14 bg-muted/30 rounded-lg animate-pulse" />
            <div className="h-14 bg-muted/30 rounded-lg animate-pulse" />
          </div>
        )}

        {/* Independent Section Error State with Meaningful Retry */}
        {!isLoading && error && (
          <div className="p-6 text-center space-y-3 rounded-xl border border-destructive/30 bg-destructive/5">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">
                Échec du chargement des absences
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {error}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Réessayer
            </Button>
          </div>
        )}

        {/* Section Empty State */}
        {!isLoading && !error && filteredAbsences.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border space-y-2">
            <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="font-medium text-foreground">
              {activeTab === "all"
                ? "Aucune absence enregistrée pour ce collaborateur."
                : "Aucune absence correspondant au filtre sélectionné."}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Les nouvelles demandes soumises apparaîtront automatiquement dans
              ce registre.
            </p>
          </div>
        )}

        {/* Section Content: Mobile Cards (< 768px) and Accessible Tabular View (≥ 768px) */}
        {!isLoading && !error && filteredAbsences.length > 0 && (
          <div
            id="absence-history-panel"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}-absences`}
            tabIndex={0}
          >
            {/* Mobile Card List (< 768px) */}
            <div className="space-y-3 block md:hidden" role="list" aria-label="Liste des absences">
              {filteredAbsences.map((abs) => {
                const retainedVal = toSafeNumber(
                  abs.retainedDays ?? abs.calculatedWorkingDays ?? 0
                );
                const isHalfDay = abs.fraction !== "FULL_DAY";

                return (
                  <div
                    key={String(abs.id)}
                    role="listitem"
                    className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              abs.type?.colorHex || "var(--primary)",
                          }}
                        />
                        <span>{abs.type?.name || "Congé"}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 ml-1 ${
                            abs.type?.isDeductible
                              ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                              : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
                          }`}
                        >
                          {abs.type?.isDeductible ? "Déductible" : "Non déductible"}
                        </Badge>
                      </div>
                      <StatusBadge status={abs.status} size="sm" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <div>
                        <span className="font-medium text-foreground block">
                          {formatDate(abs.startDate)} au {formatDate(abs.endDate)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatLeaveDays(abs.enteredDays, { mode: "full" })} calendaires
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-foreground block">
                          {formatLeaveDays(retainedVal, { mode: "short" })} retenus
                        </span>
                        {isHalfDay && (
                          <span className="text-[10px] text-primary font-medium block">
                            {abs.fraction === "HALF_DAY_MORNING"
                              ? "½ j (Matin)"
                              : "½ j (Après-midi)"}
                          </span>
                        )}
                      </div>
                    </div>

                    {(abs.reason?.name || abs.comment || abs.rejectionReason) && (
                      <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg space-y-0.5">
                        {abs.reason?.name && (
                          <span className="font-medium text-foreground block">
                            Motif : {abs.reason.name}
                          </span>
                        )}
                        {abs.comment && (
                          <span className="italic block truncate">
                            « {abs.comment} »
                          </span>
                        )}
                        {abs.status === "REJECTED" && abs.rejectionReason && (
                          <span className="text-rose-600 dark:text-rose-400 font-medium block">
                            Refus : {abs.rejectionReason}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="pt-1">
                      <Link
                        href={`/absences/${abs.id}`}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border text-xs font-medium text-primary hover:bg-muted/50 transition-colors min-h-[40px]"
                      >
                        <span>Consulter l&apos;absence</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop / Tablet Tabular View (≥ 768px) */}
            <div
              className="overflow-x-auto hidden md:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              tabIndex={0}
              role="region"
              aria-label="Tableau de l'historique des absences"
            >
              <table className="w-full text-xs text-left" aria-label="Historique des absences">
                <caption className="sr-only">
                  Historique des demandes d&apos;absence et décomptes retenus
                </caption>
                <thead className="border-b border-border text-muted-foreground uppercase text-[10px] font-semibold bg-muted/30">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">Type d&apos;absence</th>
                    <th scope="col" className="py-2.5 px-3">Période</th>
                    <th scope="col" className="py-2.5 px-3 text-center">Jours retenus</th>
                    <th scope="col" className="py-2.5 px-3">Statut</th>
                    <th scope="col" className="py-2.5 px-3">Motif & Justification</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Détail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAbsences.map((abs) => {
                    const retainedVal = toSafeNumber(
                      abs.retainedDays ?? abs.calculatedWorkingDays ?? 0
                    );
                    const isHalfDay = abs.fraction !== "FULL_DAY";

                    return (
                      <tr
                        key={String(abs.id)}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {/* Absence Type */}
                        <td className="py-3 px-3 font-medium text-foreground">
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    abs.type?.colorHex || "var(--primary)",
                                }}
                              />
                              <span>{abs.type?.name || "Congé"}</span>
                            </span>
                            <div>
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 py-0 ${
                                  abs.type?.isDeductible
                                    ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                                    : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
                                }`}
                              >
                                {abs.type?.isDeductible
                                  ? "Déductible"
                                  : "Non déductible"}
                              </Badge>
                            </div>
                          </div>
                        </td>

                        {/* Period */}
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                          <div className="font-medium text-foreground">
                            {formatDate(abs.startDate)} au{" "}
                            {formatDate(abs.endDate)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatLeaveDays(abs.enteredDays, { mode: "full" })} calendaires
                          </div>
                        </td>

                        {/* Retained Days (Authoritative when provided) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="font-bold text-sm text-foreground">
                            {formatLeaveDays(retainedVal, { mode: "short" })}
                          </span>
                          {isHalfDay && (
                            <span className="block text-[10px] text-primary font-medium">
                              {abs.fraction === "HALF_DAY_MORNING"
                                ? "½ j (Matin)"
                                : "½ j (Après-midi)"}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <StatusBadge status={abs.status} size="sm" />
                        </td>

                        {/* Motif, Comment & Rejection details */}
                        <td className="py-3 px-3 text-muted-foreground max-w-xs">
                          <div className="space-y-0.5">
                            {abs.reason?.name && (
                              <div className="font-medium text-foreground text-[11px]">
                                {abs.reason.name}
                              </div>
                            )}
                            {abs.comment && (
                              <div className="text-[11px] truncate" title={abs.comment}>
                                « {abs.comment} »
                              </div>
                            )}
                            {abs.status === "REJECTED" && abs.rejectionReason && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                Motif refus : {abs.rejectionReason}
                              </div>
                            )}
                            {abs.supportingDocumentProvided && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <FileCheck2 className="h-3 w-3" /> Justificatif fourni
                              </span>
                            )}
                            {!abs.reason?.name &&
                              !abs.comment &&
                              !abs.rejectionReason && (
                                <span className="text-muted-foreground/60">—</span>
                              )}
                          </div>
                        </td>

                        {/* Action Link to Absence Details */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Link
                            href={`/absences/${abs.id}`}
                            className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <span>Consulter</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Informative Rule Footnote */}
        <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>
            {LEGAL_STATUTORY_LABELS.APPROVED_DEDUCTIONS_NOTE}
          </span>
          <span className="font-medium text-foreground">
            Total approuvé décompté : {formatLeaveDays(totalApprovedDeductions, { mode: "full" })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
