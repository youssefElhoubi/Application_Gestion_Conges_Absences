"use client";

import * as React from "react";
import { Briefcase, CalendarDays, Clock, Sparkles } from "lucide-react";
import { StatCard } from "@/src/components/shared/StatCard";
import { formatLeaveDays } from "@/src/lib/utils";
import type { EmployeeCounterItem } from "@/src/lib/leave-balances/leave-balance.types";

export interface LeaveBalanceKpiGridProps {
  counter: EmployeeCounterItem;
}

export function LeaveBalanceKpiGrid({ counter }: LeaveBalanceKpiGridProps) {
  const isEligible = counter.isEligibleForAnnualLeave;
  const isNegative = counter.netAvailableBalance < 0;
  const breakdown = counter.calculationBreakdown;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Solde Net Disponible (Primary Metric) */}
      <StatCard
        title="Solde Net Disponible"
        value={formatLeaveDays(counter.netAvailableBalance, { mode: "full" })}
        description={
          isEligible
            ? "Disponible immédiatement à la pose"
            : "Verrouillé statutairement (< 6 mois)"
        }
        icon={<Briefcase className="h-5 w-5" />}
        valueColor={
          !isEligible ? "warning" : isNegative ? "destructive" : "primary"
        }
      />

      {/* Droits Acquis (Statutaire) */}
      <StatCard
        title="Droits Acquis (Statutaire)"
        value={formatLeaveDays(counter.statutoryAccruedDays, { mode: "full" })}
        description={`${breakdown.monthlyRateApplied} j / mois • ${counter.serviceYears} an(s) d'ancienneté`}
        icon={<CalendarDays className="h-5 w-5" />}
        valueColor="default"
      />

      {/* Congés Consommés */}
      <StatCard
        title="Congés Consommés"
        value={formatLeaveDays(counter.totalApprovedDeductions, { mode: "full" })}
        description="Total des déductions approuvées"
        icon={<Clock className="h-5 w-5" />}
        valueColor="default"
      />

      {/* Crédits Récupération (Fériés Travaillés) */}
      <StatCard
        title="Crédits Récupération"
        value={formatLeaveDays(counter.activeRecoveryCreditDays, { mode: "full" })}
        description={`${breakdown.unconsumedHolidayCreditsCount} jour(s) férié(s) non expiré(s)`}
        icon={<Sparkles className="h-5 w-5" />}
        valueColor="default"
      />
    </div>
  );
}
