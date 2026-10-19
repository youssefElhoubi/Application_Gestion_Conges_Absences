import * as React from "react";
import { Users, Briefcase, CalendarCheck, Sparkles } from "lucide-react";
import { StatCard } from "@/src/components/shared/StatCard";
import { formatLeaveDays } from "@/src/lib/utils";
import type { AggregateLeaveMetrics } from "@/src/lib/leave-balances/leave-balance.types";

export interface LeaveBalancesKpiCardsProps {
  totalItems: number;
  metrics: AggregateLeaveMetrics;
  isLoading?: boolean;
}

export const LeaveBalancesKpiCards: React.FC<LeaveBalancesKpiCardsProps> = ({
  totalItems,
  metrics,
  isLoading = false,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Effectif Répertorié"
        value={totalItems}
        description="Collaborateurs suivis au registre"
        icon={<Users className="h-5 w-5" />}
        isLoading={isLoading}
        valueColor="default"
      />
      <StatCard
        title="Moyenne Disponible"
        value={formatLeaveDays(metrics.avgAvailable, { mode: "full" })}
        description="Moyenne nette par collaborateur"
        icon={<Briefcase className="h-5 w-5" />}
        isLoading={isLoading}
        valueColor="primary"
      />
      <StatCard
        title="Droits Acquis (Page)"
        value={formatLeaveDays(metrics.totalAccrued, { mode: "full" })}
        description="Cumul statutaire sur l'affichage actuel"
        icon={<CalendarCheck className="h-5 w-5" />}
        isLoading={isLoading}
        valueColor="default"
      />
      <StatCard
        title="Crédits Récupération"
        value={formatLeaveDays(metrics.totalRecovery, { mode: "full" })}
        description="Droits fériés sans date d'expiration"
        icon={<Sparkles className="h-5 w-5" />}
        isLoading={isLoading}
        valueColor="default"
      />
    </div>
  );
};
