import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  XCircle,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { formatDate, formatLeaveDays } from "@/src/lib/utils";
import type { DataTableColumn } from "@/src/components/table/DataTable";
import type { EmployeeCounterItem } from "@/src/lib/api/counter-client";

export function getLeaveBalancesTableColumns(
  onNavigate: (employeeId: string) => void
): DataTableColumn<EmployeeCounterItem>[] {
  return [
    {
      id: "employeeId",
      header: "Matricule",
      sortable: true,
      className: "w-28",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
          {row.employeeId}
        </span>
      ),
    },
    {
      id: "fullName",
      header: "Collaborateur",
      sortable: true,
      cell: (row) => {
        const initials = row.fullName
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase();

        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
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
              <Link
                href={`/leave-balances/${encodeURIComponent(row.employeeId)}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-foreground hover:text-primary transition-colors hover:underline flex items-center gap-1 group text-sm truncate"
              >
                <span>{row.fullName}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
              {row.jobTitle && (
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {row.jobTitle}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "netAvailableBalance",
      header: "Solde Net Restant",
      align: "center",
      cell: (row) => {
        const balance = row.netAvailableBalance;
        const isEligible = row.isEligibleForAnnualLeave;
        const isNegative = balance < 0;

        return (
          <div className="flex flex-col items-center min-w-[130px]">
            <div
              className={`px-3 py-1.5 rounded-xl font-extrabold text-sm border shadow-2xs flex items-center gap-1.5 ${
                !isEligible
                  ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                  : isNegative
                  ? "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30"
                  : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
              }`}
            >
              <span className="sr-only">Solde net restant disponible : </span>
              <span>{formatLeaveDays(balance, { mode: "full" })}</span>
            </div>
            {!isEligible && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-0.5 font-medium">
                <AlertCircle className="h-2.5 w-2.5" /> Droit bloqué (&lt; 6 mois)
              </span>
            )}
            {isEligible && isNegative && (
              <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 flex items-center gap-0.5 font-medium">
                <AlertCircle className="h-2.5 w-2.5" /> Solde débiteur
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "site",
      header: "Site",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
          <span>{row.siteName || "Casablanca"}</span>
        </div>
      ),
    },
    {
      id: "hireDate",
      header: "Ancienneté & Éligibilité",
      sortable: true,
      cell: (row) => (
        <div className="space-y-1 min-w-[160px]">
          <div className="text-xs font-medium text-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>
              {row.serviceYears} an{row.serviceYears > 1 ? "s" : ""} • {row.serviceMonths} mois
            </span>
          </div>
          {row.hireDate && (
            <div className="text-[11px] text-muted-foreground">
              Embauche: {formatDate(row.hireDate)}
            </div>
          )}
          <div>
            {row.isEligibleForAnnualLeave ? (
              <Badge
                variant="outline"
                className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium"
              >
                Éligible (Loi 65-99)
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-medium"
              >
                Acquisition (&lt; 6 mois)
              </Badge>
            )}
            {row.calculationBreakdown.isMinorRate && (
              <Badge
                variant="outline"
                className="ml-1 text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20 font-medium"
              >
                Mineur (2 j/m)
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "statutoryAccruedDays",
      header: "Droits Acquis",
      align: "center",
      cell: (row) => (
        <div className="flex flex-col items-center min-w-[90px]">
          <span className="font-bold text-foreground text-sm">
            {formatLeaveDays(row.statutoryAccruedDays, { mode: "short" })}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {row.calculationBreakdown.monthlyRateApplied} j/mois
            {row.calculationBreakdown.maxYearlyCapEnforced && " (Plafonné)"}
          </span>
        </div>
      ),
    },
    {
      id: "totalApprovedDeductions",
      header: "Congés Consommés",
      align: "center",
      cell: (row) => (
        <div className="flex flex-col items-center min-w-[90px]">
          <span className="font-semibold text-muted-foreground text-sm">
            {formatLeaveDays(row.totalApprovedDeductions, { mode: "short" })}
          </span>
          <span className="text-[10px] text-muted-foreground">Décomptés</span>
        </div>
      ),
    },
    {
      id: "activeRecoveryCreditDays",
      header: "Crédits Récupération",
      align: "center",
      cell: (row) => (
        <div className="flex flex-col items-center min-w-[110px]">
          <div className="flex items-center gap-1 text-sm font-semibold text-purple-700 dark:text-purple-300">
            <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>{formatLeaveDays(row.activeRecoveryCreditDays, { mode: "short" })}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {row.calculationBreakdown.unconsumedHolidayCreditsCount} férié(s) travaillé(s)
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Action",
      align: "right",
      cell: (row) => (
        <Button
          variant="outline"
          size="xs"
          aria-label={`Consulter le détail du solde de ${row.fullName}`}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(row.employeeId);
          }}
          className="text-xs group"
        >
          <span>Détail</span>
          <ExternalLink className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      ),
    },
  ];
}
