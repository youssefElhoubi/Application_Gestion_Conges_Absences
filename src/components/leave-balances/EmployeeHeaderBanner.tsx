"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Layers,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { formatDate } from "@/src/lib/utils";
import type { EmployeeDetail } from "@/src/lib/leave-balances/leave-balance.types";

export interface EmployeeHeaderBannerProps {
  employee: EmployeeDetail;
}

export function EmployeeHeaderBanner({ employee }: EmployeeHeaderBannerProps) {
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-extrabold text-lg border border-primary/25 shadow-xs">
              {employee.fullName
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-card flex items-center justify-center ${
                employee.active
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-400 text-white"
              }`}
              title={employee.active ? "Salarié actif" : "Salarié inactif"}
            >
              <span className="sr-only">
                {employee.active ? "Salarié actif" : "Salarié inactif"}
              </span>
              {employee.active ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
            </span>
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-foreground truncate">
                {employee.fullName}
              </h2>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                {employee.employeeId}
              </span>
              <StatusBadge
                status={employee.active ? "ACTIVE" : "INACTIVE"}
                size="sm"
              />
            </div>

            <div className="flex items-center gap-x-4 gap-y-1 text-xs text-muted-foreground flex-wrap">
              {employee.jobTitle && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                  <span>{employee.jobTitle}</span>
                </span>
              )}
              {employee.department && (
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                  <span>{employee.department}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                <span>{employee.site?.name || "Casablanca"}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                <span>Embauché le {formatDate(employee.hireDate)}</span>
              </span>
              {employee.cin && (
                <span className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded border border-border/80">
                  CIN: {employee.cin}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action: Link to full employee profile & calendar */}
        <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto md:self-center flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/calendar?employeeId=${encodeURIComponent(employee.employeeId)}`
              )
            }
            className="text-xs group w-full sm:w-auto min-h-[40px] sm:min-h-[36px]"
            aria-label={`Voir le planning des absences de ${employee.fullName}`}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5 text-primary group-hover:scale-110 transition-transform" />
            <span>Planning des congés</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/employees/${encodeURIComponent(employee.employeeId)}`
              )
            }
            className="text-xs group w-full sm:w-auto min-h-[40px] sm:min-h-[36px]"
            aria-label={`Voir le profil collaborateur de ${employee.fullName}`}
          >
            <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span>Voir le profil collaborateur</span>
            <ExternalLink className="h-3 w-3 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </Button>
        </div>
      </div>
    </div>
  );
}
