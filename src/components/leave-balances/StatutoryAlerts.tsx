"use client";

import * as React from "react";
import { Alert } from "@/src/components/feedback/Alert";
import { formatLeaveDays } from "@/src/lib/utils";
import { LEGAL_STATUTORY_LABELS } from "@/src/lib/leave-balances/leave-balance.constants";
import type { EmployeeCounterItem } from "@/src/lib/leave-balances/leave-balance.types";

export interface StatutoryAlertsProps {
  counter: EmployeeCounterItem;
}

export function StatutoryAlerts({ counter }: StatutoryAlertsProps) {
  const isEligible = counter.isEligibleForAnnualLeave;
  const isNegative = counter.netAvailableBalance < 0;

  if (isEligible && !isNegative) {
    return null;
  }

  return (
    <>
      {/* Explicit Backend Warning 1: 6-Month Statutory Gate Alert (Art. 231) */}
      {!isEligible && (
        <Alert
          variant="warning"
          title={LEGAL_STATUTORY_LABELS.SIX_MONTH_GATE_TITLE}
          className="shadow-xs"
        >
          Ce collaborateur cumule statutairement ses droits à congés payés (
          {formatLeaveDays(counter.statutoryAccruedDays, { mode: "full" })} acquis),
          mais son ancienneté continue de {counter.serviceMonths} mois est inférieure au
          seuil légal de 6 mois continus requis pour l&apos;ouverture des droits à
          jouissance. Le solde consommable est verrouillé statutairement à{" "}
          {formatLeaveDays(0, { mode: "full" })}.
        </Alert>
      )}

      {/* Explicit Backend Warning 2: Deficit Balance Alert */}
      {isEligible && isNegative && (
        <Alert
          variant="destructive"
          title={LEGAL_STATUTORY_LABELS.DEFICIT_BALANCE_TITLE}
          className="shadow-xs"
        >
          Le solde net disponible de ce collaborateur est négatif (
          {formatLeaveDays(counter.netAvailableBalance, { mode: "full" })}). Les déductions
          validées excèdent le total des droits cumulés statutaires et crédits de
          récupération.
        </Alert>
      )}
    </>
  );
}
