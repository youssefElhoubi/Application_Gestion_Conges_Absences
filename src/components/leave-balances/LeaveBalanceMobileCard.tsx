import * as React from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  XCircle,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { formatLeaveDays } from "@/src/lib/utils";
import type { EmployeeCounterItem } from "@/src/lib/api/counter-client";

export interface LeaveBalanceMobileCardProps {
  row: EmployeeCounterItem;
  onClick?: (row: EmployeeCounterItem) => void;
}

export const LeaveBalanceMobileCard: React.FC<LeaveBalanceMobileCardProps> = ({
  row,
  onClick,
}) => {
  const initials = row.fullName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const balance = row.netAvailableBalance;
  const isEligible = row.isEligibleForAnnualLeave;
  const isNegative = balance < 0;

  const handleClick = () => {
    onClick?.(row);
  };

  return (
    <div
      onClick={handleClick}
      className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3 cursor-pointer hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Détail du solde de ${row.fullName}`}
    >
      {/* Top row: Employee Identity & Action */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
              {initials}
            </div>
            {row.active !== undefined && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card flex items-center justify-center ${
                  row.active ? "bg-emerald-500 text-white" : "bg-zinc-400 text-white"
                }`}
                title={row.active ? "Actif" : "Inactif"}
              >
                <span className="sr-only">
                  {row.active ? "Collaborateur actif" : "Collaborateur inactif"}
                </span>
                {row.active ? (
                  <CheckCircle2 className="h-2.5 w-2.5" />
                ) : (
                  <XCircle className="h-2.5 w-2.5" />
                )}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground text-sm truncate flex items-center gap-1.5">
              <span>{row.fullName}</span>
              <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-foreground border border-border shrink-0">
                {row.employeeId}
              </span>
            </div>
            {row.jobTitle && (
              <div className="text-xs text-muted-foreground truncate">{row.jobTitle}</div>
            )}
          </div>
        </div>

        <span className="text-xs text-primary font-medium flex items-center gap-1 shrink-0">
          <span>Détail</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Featured Authoritative Balance Badge */}
      <div
        className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
          !isEligible
            ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
            : isNegative
            ? "bg-rose-500/15 border-rose-500/30 text-rose-900 dark:text-rose-200"
            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
        }`}
      >
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">
            Solde Net Disponible
          </span>
          <span className="text-base font-extrabold">
            {formatLeaveDays(balance, { mode: "full" })}
          </span>
        </div>
        <div className="text-right">
          {!isEligible ? (
            <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40">
              Bloqué (&lt; 6 mois)
            </Badge>
          ) : isNegative ? (
            <Badge variant="outline" className="text-[10px] bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40">
              Solde débiteur
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40">
              Disponible
            </Badge>
          )}
        </div>
      </div>

      {/* Sub-metrics Grid */}
      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/40 text-center text-xs">
        <div>
          <span className="text-[10px] text-muted-foreground block truncate">Acquis</span>
          <span className="font-bold text-foreground">
            {formatLeaveDays(row.statutoryAccruedDays, { mode: "short" })}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block truncate">Consommé</span>
          <span className="font-semibold text-muted-foreground">
            {formatLeaveDays(row.totalApprovedDeductions, { mode: "short" })}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block truncate">Récup. Fériés</span>
          <span className="font-bold text-purple-700 dark:text-purple-300">
            {formatLeaveDays(row.activeRecoveryCreditDays, { mode: "short" })}
          </span>
        </div>
      </div>

      {/* Footer context */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
        <span className="flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          <span>{row.siteName || "Casablanca"}</span>
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>
            {row.serviceYears} an{row.serviceYears > 1 ? "s" : ""} • {row.serviceMonths} mois
          </span>
        </span>
      </div>
    </div>
  );
};
