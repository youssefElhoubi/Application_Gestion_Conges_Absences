"use client";

import * as React from "react";
import { Layers } from "lucide-react";
import { formatDate, formatLeaveDays } from "@/src/lib/utils";
import type { EmployeeCounterItem } from "@/src/lib/leave-balances/leave-balance.types";

export interface BalanceCompositionBarProps {
  counter: EmployeeCounterItem;
}

export function BalanceCompositionBar({ counter }: BalanceCompositionBarProps) {
  const isEligible = counter.isEligibleForAnnualLeave;
  const isNegative = counter.netAvailableBalance < 0;

  // Authoritative balance composition totals under Moroccan Labor Code (Loi 65-99)
  const totalAcquiredRights =
    counter.statutoryAccruedDays + counter.activeRecoveryCreditDays;
  const consumedPercent =
    totalAcquiredRights > 0
      ? Math.min(
          100,
          Math.round(
            (counter.totalApprovedDeductions / totalAcquiredRights) * 100
          )
        )
      : 0;
  const availablePercent =
    totalAcquiredRights > 0 ? Math.max(0, 100 - consumedPercent) : 0;

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
          aria-valuetext={`Solde restant disponible : ${availablePercent}%, Congés consommés : ${consumedPercent}%`}
          className="h-3 w-full rounded-full bg-muted/60 overflow-hidden flex"
        >
          {totalAcquiredRights > 0 ? (
            <>
              <div
                className="h-full bg-slate-500 transition-all"
                style={{ width: `${consumedPercent}%` }}
                title={`Consommé : ${formatLeaveDays(counter.totalApprovedDeductions, { mode: "full" })} (${consumedPercent}%)`}
              />
              <div
                className={`h-full transition-all ${
                  !isEligible
                    ? "bg-amber-500"
                    : isNegative
                    ? "bg-rose-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${availablePercent}%` }}
                title={`Solde restant : ${formatLeaveDays(counter.netAvailableBalance, { mode: "full" })} (${availablePercent}%)`}
              />
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
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  !isEligible
                    ? "bg-amber-500"
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
