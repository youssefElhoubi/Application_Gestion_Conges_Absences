"use client";

import * as React from "react";
import { Info, ShieldCheck } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/src/components/ui/card";
import { formatDate, formatLeaveDays } from "@/src/lib/utils";
import { LEGAL_STATUTORY_LABELS } from "@/src/lib/leave-balances/leave-balance.constants";
import type { EmployeeCounterItem } from "@/src/lib/leave-balances/leave-balance.types";

export interface StatutoryEntitlementCardProps {
  counter: EmployeeCounterItem;
}

export function StatutoryEntitlementCard({
  counter,
}: StatutoryEntitlementCardProps) {
  const breakdown = counter.calculationBreakdown;
  const isEligible = counter.isEligibleForAnnualLeave;

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3 border-b border-border/70">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-bold">
            Cadre Statutaire et Acquisition
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          Paramètres d&apos;acquisition selon le Code du Travail marocain
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-3.5 text-xs">
        <div className="flex items-center justify-between py-1 border-b border-border/50">
          <span className="text-muted-foreground">Taux mensuel appliqué</span>
          <span className="font-semibold text-foreground font-mono">
            {formatLeaveDays(breakdown.monthlyRateApplied, { mode: "short" })} / mois
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-border/50">
          <span className="text-muted-foreground">Régime d&apos;âge</span>
          <Badge variant="outline" className="text-[11px] font-medium">
            {breakdown.isMinorRate
              ? "Salarié mineur (2 j/m)"
              : "Salarié adulte (1.5 j/m)"}
          </Badge>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-border/50">
          <span className="text-muted-foreground">Ancienneté continue</span>
          <span className="font-semibold text-foreground">
            {counter.serviceYears} an
            {counter.serviceYears > 1 ? "s" : ""} • {counter.serviceMonths} mois
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-border/50">
          <span className="text-muted-foreground">
            Éligibilité légale (Art. 231)
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${
              isEligible
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
            }`}
          >
            {isEligible
              ? "Droit ouvert (≥ 6 mois)"
              : "Acquisition (< 6 mois)"}
          </Badge>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-border/50">
          <span className="text-muted-foreground">
            Plafond légal 30 jours (Art. 232)
          </span>
          <span className="font-medium text-foreground">
            {breakdown.maxYearlyCapEnforced ? (
              <Badge
                variant="outline"
                className="text-[10px] bg-rose-500/10 text-rose-700 border-rose-500/30"
              >
                Plafond atteint (30 j)
              </Badge>
            ) : (
              <span className="text-muted-foreground">Non atteint</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-muted-foreground">
            Date d&apos;arrêté du calcul
          </span>
          <span className="font-medium text-foreground font-mono text-[11px]">
            {formatDate(counter.referenceDate)}
          </span>
        </div>

        {/* Informational Statutory Note */}
        <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border/70 text-[11px] text-muted-foreground leading-relaxed space-y-1">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <Info className="h-3 w-3 text-primary" />
            {LEGAL_STATUTORY_LABELS.SENIORITY_BONUS_TITLE}
          </span>
          <p>
            {LEGAL_STATUTORY_LABELS.SENIORITY_BONUS_DESCRIPTION}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
