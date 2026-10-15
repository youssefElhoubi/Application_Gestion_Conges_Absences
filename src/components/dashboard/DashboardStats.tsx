"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  CalendarCheck,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

import { StatCard } from "@/src/components/shared/StatCard";
import { Button } from "@/src/components/ui/button";
import { DashboardMetricsResponse, DashboardKPIs } from "@/src/lib/api/dashboard-client";

export interface DashboardStatsProps {
  metrics: DashboardMetricsResponse | null;
  summaryKpis: DashboardKPIs | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  siteId?: number;
}

export function DashboardStats({
  metrics,
  summaryKpis,
  isLoading = false,
  error = null,
  onRetry,
  siteId,
}: DashboardStatsProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
        <p className="text-sm font-medium text-destructive">{error}</p>
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="gap-2 text-xs border-destructive/40 hover:bg-destructive/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réessayer de charger les indicateurs
          </Button>
        )}
      </div>
    );
  }

  // Derive consolidated values directly from backend data sources
  const pendingCount = metrics?.pendingLeaveRequests ?? summaryKpis?.pendingAbsenceRequests ?? 0;
  const pendingRequiringMe = summaryKpis?.pendingRequiringMyAction ?? 0;
  const activeEmployees = metrics?.activeEmployees ?? summaryKpis?.totalActiveEmployees ?? 0;
  const approvedDays = metrics?.validatedLeaveDays ?? summaryKpis?.totalApprovedDays ?? 0;
  const recoveryAvailable = metrics?.recoveryDaysAvailable ?? summaryKpis?.availableRecoveryCredits ?? 0;
  const recoveryReserved = metrics?.recoveryDaysReserved ?? 0;
  const unjustifiedDays = metrics?.nonJustifiedAbsenceDays ?? summaryKpis?.unjustifiedAbsenceDays ?? 0;
  const unjustifiedCount = metrics?.nonJustifiedAbsenceCount ?? 0;

  const siteParam = siteId ? `&siteId=${siteId}` : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          Indicateurs Clés & Performance RH
        </h2>
        <span className="text-xs text-muted-foreground">
          Données consolidées en temps réel
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Demandes en attente (High Priority - Action Required) */}
        <Link
          href={`/absences?status=PENDING${siteParam}`}
          className="group block rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
        >
          <StatCard
            title="Demandes en attente"
            value={pendingCount}
            valueColor={pendingCount > 0 ? "warning" : "default"}
            icon={<Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            description={
              pendingRequiringMe > 0
                ? `${pendingRequiringMe} nécessitant votre validation`
                : "Demandes soumises en attente d'approbation"
            }
            isLoading={isLoading}
            className={`transition-all duration-200 group-hover:border-amber-500/50 group-hover:shadow-md ${
              pendingCount > 0 ? "border-amber-500/30 bg-amber-500/5" : ""
            }`}
          />
        </Link>

        {/* 2. Collaborateurs Actifs */}
        <Link
          href="/employees"
          className="group block rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/40"
        >
          <StatCard
            title="Collaborateurs actifs"
            value={activeEmployees}
            valueColor="default"
            icon={<Users className="h-4 w-4 text-primary" />}
            description="Effectif sous contrat en activité"
            isLoading={isLoading}
            className="transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md"
          />
        </Link>

        {/* 3. Congés Payés Validés */}
        <Link
          href={`/absences?status=APPROVED${siteParam}`}
          className="group block rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/40"
        >
          <StatCard
            title="Congés validés"
            value={`${approvedDays} j`}
            valueColor="primary"
            icon={<CalendarCheck className="h-4 w-4 text-primary" />}
            description="Jours de congé annuel déduits"
            isLoading={isLoading}
            className="transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md"
          />
        </Link>

        {/* 4. Crédits de Récupération Disponibles */}
        <Link
          href="/employees"
          className="group block rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
        >
          <StatCard
            title="Récupérations dispo"
            value={`${recoveryAvailable} j`}
            valueColor="success"
            icon={<Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            description={
              recoveryReserved > 0
                ? `${recoveryReserved} j réservés en cours`
                : "Droits issus des jours fériés travaillés"
            }
            isLoading={isLoading}
            className="transition-all duration-200 group-hover:border-emerald-500/50 group-hover:shadow-md"
          />
        </Link>

        {/* 5. Absences Injustifiées */}
        <Link
          href={`/absences?status=APPROVED${siteParam}`}
          className="group block rounded-xl focus:outline-hidden focus:ring-2 focus:ring-destructive/40"
        >
          <StatCard
            title="Absences injustifiées"
            value={`${unjustifiedDays} j`}
            valueColor={unjustifiedDays > 0 ? "destructive" : "default"}
            icon={<AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
            description={
              unjustifiedCount > 0
                ? `${unjustifiedCount} dossier(s) à régulariser`
                : "Aucune absence non justifiée"
            }
            isLoading={isLoading}
            className={`transition-all duration-200 group-hover:border-rose-500/50 group-hover:shadow-md ${
              unjustifiedDays > 0 ? "border-rose-500/30 bg-rose-500/5" : ""
            }`}
          />
        </Link>
      </div>
    </div>
  );
}
