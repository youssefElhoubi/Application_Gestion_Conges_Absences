"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, RotateCcw, Sparkles } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { formatDate, formatLeaveDays, toSafeNumber } from "@/src/lib/utils";
import { LEGAL_STATUTORY_LABELS } from "@/src/lib/leave-balances/leave-balance.constants";
import type { HolidayWorkCreditItem } from "@/src/lib/leave-balances/leave-balance.types";

export interface RecoveryCreditsSectionProps {
  employeeId: string;
  credits: HolidayWorkCreditItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  activeRecoveryCreditDays: number;
}

export function RecoveryCreditsSection({
  employeeId,
  credits,
  isLoading,
  error,
  onRetry,
  activeRecoveryCreditDays,
}: RecoveryCreditsSectionProps) {

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3 border-b border-border/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-sm font-bold">
                Crédits de Récupération (Jours Fériés Travaillés)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Compensation des jours fériés légaux chômés et payés travaillés (Art. 241, validité permanente, consommation FIFO)
            </CardDescription>
          </div>

          {/* Authoritative Recovery Balance & Navigation */}
          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">
                Solde statutaire
              </span>
              <span className="font-extrabold text-sm text-purple-700 dark:text-purple-300">
                {formatLeaveDays(activeRecoveryCreditDays, { mode: "full" })}
              </span>
            </div>
            <Link
              href={`/recovery-credits?search=${encodeURIComponent(
                employeeId
              )}&employeeId=${encodeURIComponent(employeeId)}`}
              className="inline-flex items-center justify-center font-medium transition-all select-none border border-border bg-card text-foreground hover:bg-muted shadow-xs h-7 px-2.5 text-xs rounded-sm gap-1 group"
            >
              <span>Grand livre</span>
              <ExternalLink className="h-3 w-3 ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Section Loading Skeleton */}
        {isLoading && (
          <div className="space-y-3 py-2">
            <div className="h-10 bg-muted/40 rounded-lg animate-pulse" />
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
                Échec du chargement des crédits de récupération
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
        {!isLoading && !error && credits.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border space-y-2">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="font-medium text-foreground">
              Aucun crédit de récupération n&apos;a été accordé à ce collaborateur.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Les crédits attribués suite à une permanence lors d&apos;un jour férié
              légal apparaîtront ici.
            </p>
          </div>
        )}

        {/* Section Content: Mobile Cards (< 768px) and Accessible Tabular View (≥ 768px) */}
        {!isLoading && !error && credits.length > 0 && (
          <div>
            {/* Mobile Card List (< 768px) */}
            <div className="space-y-3 block md:hidden" role="list" aria-label="Liste des crédits de récupération">
              {credits.map((c) => {
                const credited = toSafeNumber(c.creditedDays || 0);
                const consumed = toSafeNumber(c.consumedDays || 0);
                const remaining = Math.max(0, credited - consumed);
                const isConsumed =
                  c.isFullyConsumed || consumed >= credited;

                return (
                  <div
                    key={String(c.id)}
                    role="listitem"
                    className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {c.publicHoliday?.label || "Jour férié officiel"}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isConsumed
                            ? "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
                            : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                        }`}
                      >
                        {isConsumed ? "Épuisé" : "Actif"}
                      </Badge>
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      Date du férié :{" "}
                      <strong className="text-foreground">
                        {c.publicHoliday?.date ? formatDate(c.publicHoliday.date) : "—"}
                      </strong>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-muted/40 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          Crédité
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatLeaveDays(credited, { mode: "short" })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          Consommé
                        </span>
                        <span className="font-medium text-muted-foreground">
                          {formatLeaveDays(consumed, { mode: "short" })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          Restant
                        </span>
                        <span className="font-bold text-purple-700 dark:text-purple-300">
                          {formatLeaveDays(remaining, { mode: "short" })}
                        </span>
                      </div>
                    </div>

                    {c.comment && (
                      <div className="text-[11px] text-muted-foreground italic truncate bg-muted/30 p-2 rounded-md">
                        « {c.comment} »
                      </div>
                    )}

                    {c.publicHolidayId && (
                      <div className="pt-1">
                        <Link
                          href={`/holidays/${c.publicHolidayId}`}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border text-xs font-medium text-primary hover:bg-muted/50 transition-colors min-h-[40px]"
                        >
                          <span>Détail du jour férié</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop / Tablet Tabular View (≥ 768px) */}
            <div
              className="overflow-x-auto hidden md:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              tabIndex={0}
              role="region"
              aria-label="Tableau des crédits de récupération"
            >
              <table className="w-full text-xs text-left" aria-label="Crédits de récupération">
                <caption className="sr-only">
                  Crédits de récupération accordés pour jours fériés travaillés
                </caption>
                <thead className="border-b border-border text-muted-foreground uppercase text-[10px] font-semibold bg-muted/30">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">Jour férié officiel</th>
                    <th scope="col" className="py-2.5 px-3">Date du férié</th>
                    <th scope="col" className="py-2.5 px-3 text-center">Crédité</th>
                    <th scope="col" className="py-2.5 px-3 text-center">Consommé</th>
                    <th scope="col" className="py-2.5 px-3 text-center">Restant</th>
                    <th scope="col" className="py-2.5 px-3">Statut</th>
                    <th scope="col" className="py-2.5 px-3">Commentaire / Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {credits.map((c) => {
                    const credited = toSafeNumber(c.creditedDays || 0);
                    const consumed = toSafeNumber(c.consumedDays || 0);
                    const remaining = Math.max(0, credited - consumed);
                    const isConsumed =
                      c.isFullyConsumed || consumed >= credited;

                    return (
                      <tr
                        key={String(c.id)}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {/* Holiday Label with Safe Link to Public Holiday Details */}
                        <td className="py-3 px-3 font-medium text-foreground">
                          {c.publicHolidayId ? (
                            <Link
                              href={`/holidays/${encodeURIComponent(String(c.publicHolidayId))}`}
                              className="inline-flex items-center gap-1.5 hover:text-primary hover:underline group"
                            >
                              <span className="font-semibold">
                                {c.publicHoliday?.label || "Jour férié officiel"}
                              </span>
                              <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          ) : (
                            <span className="font-semibold text-foreground">
                              {c.publicHoliday?.label || "Jour férié officiel"}
                            </span>
                          )}
                        </td>

                        {/* Holiday Date */}
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                          {c.publicHoliday?.date
                            ? formatDate(c.publicHoliday.date)
                            : "—"}
                        </td>

                        {/* Credited Days */}
                        <td className="py-3 px-3 text-center font-medium text-foreground whitespace-nowrap">
                          {formatLeaveDays(credited, { mode: "short" })}
                        </td>

                        {/* Consumed Days */}
                        <td className="py-3 px-3 text-center text-muted-foreground whitespace-nowrap">
                          {formatLeaveDays(consumed, { mode: "short" })}
                        </td>

                        {/* Remaining Days */}
                        <td className="py-3 px-3 text-center font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">
                          {formatLeaveDays(remaining, { mode: "short" })}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isConsumed ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
                            >
                              Épuisé
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                            >
                              Actif
                            </Badge>
                          )}
                        </td>

                        {/* Comment or Description */}
                        <td className="py-3 px-3 text-muted-foreground max-w-xs">
                          {c.comment ? (
                            <span className="italic text-[11px] truncate block" title={c.comment}>
                              « {c.comment} »
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
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
            {LEGAL_STATUTORY_LABELS.RECOVERY_CREDITS_NOTE}
          </span>
          <span className="font-semibold text-purple-700 dark:text-purple-300">
            Solde calculé par le moteur : {formatLeaveDays(activeRecoveryCreditDays, { mode: "full" })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
