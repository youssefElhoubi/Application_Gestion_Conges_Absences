"use client";

import * as React from "react";
import { Layers } from "lucide-react";
import { formatDate, formatLeaveDays } from "@/src/lib/utils";
import type {
  EmployeeCounterItem,
  BalanceProgressMetrics,
} from "@/src/lib/leave-balances/leave-balance.types";
import { computeBalanceProgressMetrics } from "@/src/lib/leave-balances/balance-metrics";

export interface BalanceCompositionBarProps {
  counter: EmployeeCounterItem;
  metrics?: BalanceProgressMetrics;
}

export function BalanceCompositionBar({
  counter,
  metrics,
}: BalanceCompositionBarProps) {
  const m = metrics ?? computeBalanceProgressMetrics(counter);
  const {
    isEligible,
    isNegative,
    totalAcquiredRights,
    consumedPercent,
    availablePercent,
    lockedPercent,
  } = m;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Équilibre et Décomposition du Solde
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Formule légale : Droits Acquis ({formatLeaveDays(counter.statutoryAccruedDays, { mode: "short" })}) + Crédits Fériés ({formatLeaveDays(counter.activeRecoveryCreditDays, { mode: "short" })}) − Congés Consommés ({formatLeaveDays(counter.totalApprovedDeductions, { mode: "short" })}) = Solde Net ({formatLeaveDays(counter.netAvailableBalance, { mode: "short" })})
          </p>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted text-foreground border border-border self-start sm:self-center">
          Droits cumulés ouverts : <strong>{formatLeaveDays(totalAcquiredRights, { mode: "full" })}</strong>
        </div>
      </div>

      {/* Stacked Proportional Bar */}
      <div className="space-y-1.5">
        <div
          role="progressbar"
          aria-label="Répartition du solde de congés (Consommé vs Solde Disponible)"
          aria-valuenow={availablePercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={
            !isEligible
              ? `Solde disponible : 0% (droits verrouillés Art. 231 : ${lockedPercent}%), Congés consommés : ${consumedPercent}%`
              : `Solde restant disponible : ${availablePercent}%, Congés consommés : ${consumedPercent}%`
          }
          className="h-3 w-full rounded-full bg-muted/60 overflow-hidden flex"
        >
          {totalAcquiredRights > 0 ? (
            <>
              {consumedPercent > 0 && (
                <div
                  className="h-full bg-slate-500 transition-all"
                  style={{ width: `${consumedPercent}%` }}
                  title={`Consommé : ${formatLeaveDays(counter.totalApprovedDeductions, { mode: "full" })} (${consumedPercent}%)`}
                />
              )}
              {!isEligible && lockedPercent > 0 && (
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${lockedPercent}%` }}
                  title={`En cours d'acquisition (Art. 231 - non disponible) : ${formatLeaveDays(counter.statutoryAccruedDays, { mode: "full" })} (${lockedPercent}%)`}
                />
              )}
              {isEligible && availablePercent > 0 && (
                <div
                  className={`h-full transition-all ${
                    isNegative ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${availablePercent}%` }}
                  title={`Solde net disponible : ${formatLeaveDays(counter.netAvailableBalance, { mode: "full" })} (${availablePercent}%)`}
                />
              )}
            </>
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500 shrink-0" />
              <span className="text-muted-foreground">Consommé :</span>
              <span className="font-semibold text-foreground">
                {formatLeaveDays(counter.totalApprovedDeductions, { mode: "full" })}
              </span>
              <span className="text-[11px] text-muted-foreground">({consumedPercent}%)</span>
            </div>

            {!isEligible && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-muted-foreground">Droits en cours (Art. 231) :</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {formatLeaveDays(counter.statutoryAccruedDays, { mode: "full" })}
                </span>
                <span className="text-[11px] text-muted-foreground">({lockedPercent}%)</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  !isEligible
                    ? "bg-zinc-400"
                    : isNegative
                    ? "bg-rose-500"
                    : "bg-emerald-500"
                }`}
              />
              <span className="text-muted-foreground">Solde Net Disponible :</span>
              <span className="font-bold text-foreground">
                {formatLeaveDays(counter.netAvailableBalance, { mode: "full" })}
              </span>
              <span className="text-[11px] text-muted-foreground">({availablePercent}%)</span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Date d&apos;arrêté légale : <strong>{formatDate(counter.referenceDate)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
