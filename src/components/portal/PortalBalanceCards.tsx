"use client";

import * as React from "react";
import {
  Sparkles,
  CalendarCheck,
  Clock,
  Briefcase,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { EmployeeBalances } from "@/src/lib/api/employee-client";

export interface PortalBalanceCardsProps {
  balances?: EmployeeBalances | null;
  isLoading?: boolean;
}

export function PortalBalanceCards({ balances, isLoading }: PortalBalanceCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-muted/60 animate-pulse rounded-2xl border border-border" />
        ))}
      </div>
    );
  }

  const availablePaid = Number(balances?.remainingPaidBalance ?? 0);
  const accrued = Number(balances?.accruedDays ?? 0);
  const taken = Number(balances?.takenApprovedDays ?? 0);
  const pending = Number(balances?.pendingDays ?? 0);
  const recoveryCredits = Number(balances?.recoveryCreditsRemaining ?? 0);

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          Vos soldes de congés en direct
        </h2>
        <span className="text-xs text-muted-foreground">
          Calculé selon le Code du Travail marocain (Loi 65-99)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Main Available Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Solde Annuel Disponible
            </span>
            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-3xl sm:text-4xl font-extrabold text-foreground">
              {availablePaid}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">jours ouvrés</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Jours payés immédiatement utilisables pour vos demandes.
          </p>
        </div>

        {/* Accrued / Droits Acquis */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Droits Acquis Cumulés
            </span>
            <div className="p-2 rounded-full bg-muted text-muted-foreground">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl sm:text-3xl font-bold text-foreground">
              {accrued}
            </span>
            <span className="text-xs font-medium text-muted-foreground">jours</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Acquisition statutaire de 1.5 jour par mois de travail effectif.
          </p>
        </div>

        {/* Consumed / Congés Pris */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Congés Déjà Pris
            </span>
            <div className="p-2 rounded-full bg-muted text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl sm:text-3xl font-bold text-foreground">
              {taken}
            </span>
            <span className="text-xs font-medium text-muted-foreground">jours</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Jours d&apos;absence déjà validés et décomptés de votre solde.
          </p>
        </div>

        {/* Pending / En attente + Recovery Credits */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                En Attente / Récupération
              </span>
              <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-xs text-muted-foreground">En cours d&apos;approbation :</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 text-base">
                {pending} j
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">Crédits fériés récupérables :</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                {recoveryCredits} j
              </span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
            <HelpCircle className="h-3 w-3" /> Les crédits de récupération n&apos;expirent jamais.
          </div>
        </div>
      </div>
    </div>
  );
}
