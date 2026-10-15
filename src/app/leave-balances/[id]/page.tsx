"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Sparkles,
  Building2,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  User,
  History,
  CalendarDays,
  BadgeAlert,
  ChevronRight,
  Layers,
  RotateCcw,
  FileCheck2,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import { StatCard } from "@/src/components/shared/StatCard";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/src/components/ui/card";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import { Alert } from "@/src/components/feedback/Alert";
import { TableSkeleton } from "@/src/components/feedback/LoadingSkeleton";
import {
  CounterApiClient,
  EmployeeCounterItem,
} from "@/src/lib/api/counter-client";
import {
  EmployeeApiClient,
  EmployeeDetail,
} from "@/src/lib/api/employee-client";
import {
  AbsenceApiClient,
  AbsenceListItem,
} from "@/src/lib/api/absence-client";
import {
  HolidayApiClient,
  HolidayWorkCreditItem,
} from "@/src/lib/api/holiday-client";
import { formatDate, formatLeaveDays, toSafeNumber } from "@/src/lib/utils";

function LeaveBalanceDetailContent() {
  const params = useParams();
  const router = useRouter();

  // Safely extract employee identifier from URL parameter
  const rawId = params?.id;
  const employeeId = React.useMemo(() => {
    if (!rawId) return "";
    return Array.isArray(rawId)
      ? decodeURIComponent(rawId[0])
      : decodeURIComponent(rawId);
  }, [rawId]);

  // 1. Core State: Employee identity & Authoritative dynamic counters
  const [employee, setEmployee] = React.useState<EmployeeDetail | null>(null);
  const [counter, setCounter] = React.useState<EmployeeCounterItem | null>(null);
  const [isLoadingCore, setIsLoadingCore] = React.useState(true);
  const [coreError, setCoreError] = React.useState<string | null>(null);

  // 2. Absence History State: Independent loading and error isolation
  const [absences, setAbsences] = React.useState<AbsenceListItem[]>([]);
  const [isLoadingAbsences, setIsLoadingAbsences] = React.useState(true);
  const [absencesError, setAbsencesError] = React.useState<string | null>(null);
  const [absenceFilterTab, setAbsenceFilterTab] = React.useState<
    "all" | "approved" | "pending" | "other"
  >("all");

  // 3. Recovery Credits State: Independent loading and error isolation
  const [credits, setCredits] = React.useState<HolidayWorkCreditItem[]>([]);
  const [isLoadingCredits, setIsLoadingCredits] = React.useState(true);
  const [creditsError, setCreditsError] = React.useState<string | null>(null);

  // --- Independent Data Fetchers ---

  // Fetch Core Data (Employee profile + Counter balances)
  const fetchCore = React.useCallback(async () => {
    if (!employeeId) {
      setCoreError("Identifiant collaborateur manquant.");
      setIsLoadingCore(false);
      return;
    }
    setIsLoadingCore(true);
    setCoreError(null);
    try {
      const [empData, counterData] = await Promise.all([
        EmployeeApiClient.getEmployee(employeeId),
        CounterApiClient.getEmployeeCounters(employeeId),
      ]);
      setEmployee(empData);
      setCounter(counterData);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Impossible de charger les compteurs de congés du collaborateur.";
      setCoreError(msg);
    } finally {
      setIsLoadingCore(false);
    }
  }, [employeeId]);

  // Fetch Absence History independently
  const fetchAbsences = React.useCallback(async () => {
    if (!employeeId) return;
    setIsLoadingAbsences(true);
    setAbsencesError(null);
    try {
      const res = await AbsenceApiClient.listAbsences({
        employeeId,
        pageSize: 50,
      });
      setAbsences(res.data || []);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Impossible de charger l'historique des absences.";
      setAbsencesError(msg);
    } finally {
      setIsLoadingAbsences(false);
    }
  }, [employeeId]);

  // Fetch Recovery Credits independently
  const fetchCredits = React.useCallback(async () => {
    if (!employeeId) return;
    setIsLoadingCredits(true);
    setCreditsError(null);
    try {
      const res = await HolidayApiClient.listCredits({
        employeeId,
        pageSize: 50,
      });
      setCredits(res.data || []);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Impossible de charger les crédits de récupération.";
      setCreditsError(msg);
    } finally {
      setIsLoadingCredits(false);
    }
  }, [employeeId]);

  // Initial concurrent trigger
  React.useEffect(() => {
    fetchCore();
    fetchAbsences();
    fetchCredits();
  }, [fetchCore, fetchAbsences, fetchCredits]);

  // Pending requests summary for informational notice badge
  const pendingAbsences = React.useMemo(
    () => absences.filter((a) => a.status === "PENDING"),
    [absences]
  );

  const pendingDays = React.useMemo(
    () =>
      pendingAbsences.reduce((sum, a) => {
        const val = toSafeNumber(a.retainedDays ?? a.calculatedWorkingDays ?? 0);
        return sum + val;
      }, 0),
    [pendingAbsences]
  );

  // Filtered absences according to selected tab
  const filteredAbsences = React.useMemo(() => {
    if (absenceFilterTab === "approved") {
      return absences.filter((a) => a.status === "APPROVED");
    }
    if (absenceFilterTab === "pending") {
      return absences.filter((a) => a.status === "PENDING");
    }
    if (absenceFilterTab === "other") {
      return absences.filter(
        (a) => a.status === "REJECTED" || a.status === "CANCELLED"
      );
    }
    return absences;
  }, [absences, absenceFilterTab]);

  // 1. Core Loading View
  if (isLoadingCore) {
    return (
      <PageContainer>
        <div className="space-y-6 animate-pulse">
          <div className="h-28 bg-muted/50 rounded-2xl border border-border" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-muted/40 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 h-80 bg-muted/30 rounded-2xl" />
            <div className="lg:col-span-2 h-80 bg-muted/30 rounded-2xl" />
          </div>
        </div>
      </PageContainer>
    );
  }

  // 2. Core Error View (renders only if employee or counters cannot be retrieved)
  if (coreError || !employee || !counter) {
    return (
      <PageContainer>
        <ErrorState
          title="Fiche solde collaborateur introuvable"
          message={
            coreError ||
            `Aucune donnée de solde disponible pour le matricule « ${employeeId} ».`
          }
          onRetry={fetchCore}
          secondaryActionLabel="Retour aux soldes de congés"
          onSecondaryAction={() => router.push("/leave-balances")}
        />
      </PageContainer>
    );
  }

  const breakdown = counter.calculationBreakdown;
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
    <PageContainer>
      {/* 1. Page Header & Back Navigation */}
      <PageHeader
        title="Détail des Soldes et Compteurs"
        description="Situation statutaire, acquisition annuelle et historique des congés selon le Code du Travail marocain (Loi 65-99)."
        breadcrumbs={
          <Link
            href="/leave-balances"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retour aux soldes de congés</span>
          </Link>
        }
        badge={
          <Badge
            variant="outline"
            className="text-xs bg-primary/10 text-primary border-primary/20 flex items-center gap-1 font-semibold"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Loi n° 65-99 (Art. 231 & 232)
          </Badge>
        }
      />

      {/* 2. Employee Header (Identity & Employment Context) */}
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

          {/* Action: Link to full employee profile */}
          <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto md:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/employees/${encodeURIComponent(employee.employeeId)}`)
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

      {/* Explicit Backend Warning 1: 6-Month Statutory Gate Alert (Art. 231) */}
      {!isEligible && (
        <Alert
          variant="warning"
          title="Acquisition en cours — Consommation bloquée statutairement (Art. 231)"
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
          title="Solde Débiteur — Dépassement des droits autorisés"
          className="shadow-xs"
        >
          Le solde net disponible de ce collaborateur est négatif (
          {formatLeaveDays(counter.netAvailableBalance, { mode: "full" })}). Les déductions
          validées excèdent le total des droits cumulés statutaires et crédits de
          récupération.
        </Alert>
      )}

      {/* 3. Balance Summary (Authoritative KPI StatCards with High Visual Hierarchy) */}
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

      {/* 4. Simple Balance Breakdown Visualization (Authoritative Moroccan Law Composition) */}
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

      {/* Auxiliary Notice: Pending Requests (Isolated clearly from confirmed balance) */}
      {pendingDays > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <BadgeAlert className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-amber-900 dark:text-amber-300">
                Demandes en attente de validation hiérarchique : {formatLeaveDays(pendingDays, { mode: "full" })} (
                {pendingAbsences.length} demande
                {pendingAbsences.length > 1 ? "s" : ""})
              </span>
              <p className="text-amber-800/80 dark:text-amber-400/80 mt-0.5">
                Attention : Ce volume n&apos;est PAS encore décompté du Solde Net Disponible (
                {formatLeaveDays(counter.netAvailableBalance, { mode: "full" })}). Les jours ne seront
                imputés sur le solde qu&apos;après validation formelle.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="xs"
            onClick={() =>
              router.push(
                `/absences?search=${encodeURIComponent(
                  employee.employeeId
                )}&employeeId=${encodeURIComponent(
                  employee.employeeId
                )}&status=PENDING`
              )
            }
            className="shrink-0 bg-card border-amber-500/30 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20"
          >
            Examiner les demandes
          </Button>
        </div>
      )}

      {/* 5. Main Body: Statutory Entitlement, Absence History & Recovery Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Statutory Entitlement & Navigation */}
        <div className="lg:col-span-1 space-y-6">
          {/* Statutory Framework Card */}
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
                  Règle d&apos;Ancienneté (Art. 232)
                </span>
                <p>
                  Majoration de 1.5 jour par période entière de 5 ans de service,
                  sans que le cumul annuel n&apos;excède 30 jours ouvrables.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Useful Navigation Actions */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <CardTitle className="text-sm font-bold">Actions et Navigation</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-1.5 text-xs">
              <Link
                href={`/employees/${encodeURIComponent(employee.employeeId)}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors text-foreground font-medium group"
              >
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  Consulter le dossier collaborateur
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href={`/absences?search=${encodeURIComponent(
                  employee.employeeId
                )}&employeeId=${encodeURIComponent(employee.employeeId)}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors text-foreground font-medium group"
              >
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  Toutes les absences du collaborateur
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href={`/recovery-credits?search=${encodeURIComponent(
                  employee.employeeId
                )}&employeeId=${encodeURIComponent(employee.employeeId)}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors text-foreground font-medium group"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  Grand livre des crédits de récupération
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/leave-balances"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors text-foreground font-medium group"
              >
                <span className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  Retour à la vue consolidée des soldes
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Absence History & Recovery Credits Ledger */}
        <div className="lg:col-span-2 space-y-6">
          {/* 6. Absence History Section (Independent Loading & Error Handling) */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-bold">
                      Historique et Décomptes des Absences
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Demandes enregistrées, décomptes retenus et statuts de traitement
                  </CardDescription>
                </div>

                {/* View All Absences Action (Filtered by Employee) */}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    router.push(
                      `/absences?search=${encodeURIComponent(
                        employee.employeeId
                      )}&employeeId=${encodeURIComponent(employee.employeeId)}`
                    )
                  }
                  className="self-start sm:self-center text-xs group"
                >
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Voir toutes les absences</span>
                  <ExternalLink className="h-3 w-3 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </Button>
              </div>

              {/* Tabs for filtering display */}
              {!isLoadingAbsences && !absencesError && absences.length > 0 && (
                <div
                  className="flex items-center gap-1.5 pt-3 overflow-x-auto text-[11px]"
                  role="tablist"
                  aria-label="Filtrer l'historique des absences par statut"
                >
                  <button
                    role="tab"
                    id="tab-all-absences"
                    aria-selected={absenceFilterTab === "all"}
                    aria-controls="absence-history-panel"
                    onClick={() => setAbsenceFilterTab("all")}
                    className={`min-h-[36px] px-3 py-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      absenceFilterTab === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    Toutes ({absences.length})
                  </button>
                  <button
                    role="tab"
                    id="tab-approved-absences"
                    aria-selected={absenceFilterTab === "approved"}
                    aria-controls="absence-history-panel"
                    onClick={() => setAbsenceFilterTab("approved")}
                    className={`min-h-[36px] px-3 py-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      absenceFilterTab === "approved"
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    Approuvées / Décomptées (
                    {absences.filter((a) => a.status === "APPROVED").length})
                  </button>
                  <button
                    role="tab"
                    id="tab-pending-absences"
                    aria-selected={absenceFilterTab === "pending"}
                    aria-controls="absence-history-panel"
                    onClick={() => setAbsenceFilterTab("pending")}
                    className={`min-h-[36px] px-3 py-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      absenceFilterTab === "pending"
                        ? "bg-amber-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    En attente (
                    {absences.filter((a) => a.status === "PENDING").length})
                  </button>
                  <button
                    role="tab"
                    id="tab-other-absences"
                    aria-selected={absenceFilterTab === "other"}
                    aria-controls="absence-history-panel"
                    onClick={() => setAbsenceFilterTab("other")}
                    className={`min-h-[36px] px-3 py-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      absenceFilterTab === "other"
                        ? "bg-zinc-700 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    Refusées / Annulées (
                    {
                      absences.filter(
                        (a) => a.status === "REJECTED" || a.status === "CANCELLED"
                      ).length
                    }
                    )
                  </button>
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-4">
              {/* Section Loading Skeleton */}
              {isLoadingAbsences && (
                <div className="space-y-3 py-2">
                  <div className="h-10 bg-muted/40 rounded-lg animate-pulse" />
                  <div className="h-14 bg-muted/30 rounded-lg animate-pulse" />
                  <div className="h-14 bg-muted/30 rounded-lg animate-pulse" />
                  <div className="h-14 bg-muted/30 rounded-lg animate-pulse" />
                </div>
              )}

              {/* Independent Section Error State with Meaningful Retry */}
              {!isLoadingAbsences && absencesError && (
                <div className="p-6 text-center space-y-3 rounded-xl border border-destructive/30 bg-destructive/5">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      Échec du chargement des absences
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      {absencesError}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchAbsences}
                    className="text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Réessayer
                  </Button>
                </div>
              )}

              {/* Section Empty State */}
              {!isLoadingAbsences && !absencesError && filteredAbsences.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border space-y-2">
                  <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/60" />
                  <p className="font-medium text-foreground">
                    {absenceFilterTab === "all"
                      ? "Aucune absence enregistrée pour ce collaborateur."
                      : "Aucune absence correspondant au filtre sélectionné."}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Les nouvelles demandes soumises apparaîtront automatiquement dans
                    ce registre.
                  </p>
                </div>
              )}

              {/* Section Content: Mobile Cards (< 768px) and Accessible Tabular View (≥ 768px) */}
              {!isLoadingAbsences && !absencesError && filteredAbsences.length > 0 && (
                <div id="absence-history-panel" role="tabpanel" aria-labelledby="tab-all-absences">
                  {/* Mobile Card List (< 768px) */}
                  <div className="space-y-3 block md:hidden" role="list" aria-label="Liste des absences">
                    {filteredAbsences.map((abs) => {
                      const retainedVal = toSafeNumber(
                        abs.retainedDays ?? abs.calculatedWorkingDays ?? 0
                      );
                      const isHalfDay = abs.fraction !== "FULL_DAY";

                      return (
                        <div
                          key={String(abs.id)}
                          role="listitem"
                          className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    abs.type?.colorHex || "var(--primary)",
                                }}
                              />
                              <span>{abs.type?.name || "Congé"}</span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1 py-0 ml-1 ${
                                  abs.type?.isDeductible
                                    ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                                    : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
                                }`}
                              >
                                {abs.type?.isDeductible ? "Déductible" : "Non déductible"}
                              </Badge>
                            </div>
                            <StatusBadge status={abs.status} size="sm" />
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                            <div>
                              <span className="font-medium text-foreground block">
                                {formatDate(abs.startDate)} au {formatDate(abs.endDate)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatLeaveDays(abs.enteredDays, { mode: "full" })} calendaires
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-sm text-foreground block">
                                {formatLeaveDays(retainedVal, { mode: "short" })} retenus
                              </span>
                              {isHalfDay && (
                                <span className="text-[10px] text-primary font-medium block">
                                  {abs.fraction === "HALF_DAY_MORNING"
                                    ? "½ j (Matin)"
                                    : "½ j (Après-midi)"}
                                </span>
                              )}
                            </div>
                          </div>

                          {(abs.reason?.name || abs.comment || abs.rejectionReason) && (
                            <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg space-y-0.5">
                              {abs.reason?.name && (
                                <span className="font-medium text-foreground block">
                                  Motif : {abs.reason.name}
                                </span>
                              )}
                              {abs.comment && (
                                <span className="italic block truncate">
                                  « {abs.comment} »
                                </span>
                              )}
                              {abs.status === "REJECTED" && abs.rejectionReason && (
                                <span className="text-rose-600 dark:text-rose-400 font-medium block">
                                  Refus : {abs.rejectionReason}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="pt-1">
                            <Link
                              href={`/absences/${abs.id}`}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border text-xs font-medium text-primary hover:bg-muted/50 transition-colors min-h-[40px]"
                            >
                              <span>Consulter l&apos;absence</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop / Tablet Tabular View (≥ 768px) */}
                  <div
                    className="overflow-x-auto hidden md:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                    tabIndex={0}
                    role="region"
                    aria-label="Tableau de l'historique des absences"
                  >
                    <table className="w-full text-xs text-left" aria-label="Historique des absences">
                      <caption className="sr-only">
                        Historique des demandes d&apos;absence et décomptes retenus
                      </caption>
                      <thead className="border-b border-border text-muted-foreground uppercase text-[10px] font-semibold bg-muted/30">
                        <tr>
                          <th scope="col" className="py-2.5 px-3">Type d&apos;absence</th>
                          <th scope="col" className="py-2.5 px-3">Période</th>
                          <th scope="col" className="py-2.5 px-3 text-center">Jours retenus</th>
                          <th scope="col" className="py-2.5 px-3">Statut</th>
                          <th scope="col" className="py-2.5 px-3">Motif & Justification</th>
                          <th scope="col" className="py-2.5 px-3 text-right">Détail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredAbsences.map((abs) => {
                          const retainedVal = toSafeNumber(
                            abs.retainedDays ?? abs.calculatedWorkingDays ?? 0
                          );
                          const isHalfDay = abs.fraction !== "FULL_DAY";

                          return (
                            <tr
                              key={String(abs.id)}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              {/* Absence Type */}
                              <td className="py-3 px-3 font-medium text-foreground">
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1.5 font-semibold">
                                    <span
                                      className="h-2 w-2 rounded-full shrink-0"
                                      style={{
                                        backgroundColor:
                                          abs.type?.colorHex || "var(--primary)",
                                      }}
                                    />
                                    <span>{abs.type?.name || "Congé"}</span>
                                  </span>
                                  <div>
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] px-1.5 py-0 ${
                                        abs.type?.isDeductible
                                          ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                                          : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
                                      }`}
                                    >
                                      {abs.type?.isDeductible
                                        ? "Déductible"
                                        : "Non déductible"}
                                    </Badge>
                                  </div>
                                </div>
                              </td>

                              {/* Period */}
                              <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                                <div className="font-medium text-foreground">
                                  {formatDate(abs.startDate)} au{" "}
                                  {formatDate(abs.endDate)}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {formatLeaveDays(abs.enteredDays, { mode: "full" })} calendaires
                                </div>
                              </td>

                              {/* Retained Days (Authoritative when provided) */}
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className="font-bold text-sm text-foreground">
                                  {formatLeaveDays(retainedVal, { mode: "short" })}
                                </span>
                                {isHalfDay && (
                                  <span className="block text-[10px] text-primary font-medium">
                                    {abs.fraction === "HALF_DAY_MORNING"
                                      ? "½ j (Matin)"
                                      : "½ j (Après-midi)"}
                                  </span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <StatusBadge status={abs.status} size="sm" />
                              </td>

                              {/* Motif, Comment & Rejection details */}
                              <td className="py-3 px-3 text-muted-foreground max-w-xs">
                                <div className="space-y-0.5">
                                  {abs.reason?.name && (
                                    <div className="font-medium text-foreground text-[11px]">
                                      {abs.reason.name}
                                    </div>
                                  )}
                                  {abs.comment && (
                                    <div className="text-[11px] truncate" title={abs.comment}>
                                      « {abs.comment} »
                                    </div>
                                  )}
                                  {abs.status === "REJECTED" && abs.rejectionReason && (
                                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                      Motif refus : {abs.rejectionReason}
                                    </div>
                                  )}
                                  {abs.supportingDocumentProvided && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                      <FileCheck2 className="h-3 w-3" /> Justificatif fourni
                                    </span>
                                  )}
                                  {!abs.reason?.name &&
                                    !abs.comment &&
                                    !abs.rejectionReason && (
                                      <span className="text-muted-foreground/60">—</span>
                                    )}
                                </div>
                              </td>

                              {/* Action Link to Absence Details */}
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <Link
                                  href={`/absences/${abs.id}`}
                                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                                >
                                  <span>Consulter</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Informative Rule Footnote */}
              <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>
                  * Seules les absences approuvées et déductibles sont imputées sur
                  le solde par le moteur statutaire.
                </span>
                <span className="font-medium text-foreground">
                  Total approuvé décompté : {formatLeaveDays(counter.totalApprovedDeductions, { mode: "full" })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 7. Recovery Credits Section (Independent Loading & Error Handling) */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <CardTitle className="text-sm font-bold">
                      Crédits de Récupération (Jours Fériés Travaillés)
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Compensation des jours fériés légaux chômés et payés travaillés (Art. 241, validité permanente, consommation FIFO)
                  </CardDescription>
                </div>

                {/* Authoritative Recovery Balance & Navigation */}
                <div className="flex items-center gap-3 self-start sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">
                      Solde statutaire
                    </span>
                    <span className="font-extrabold text-sm text-purple-700 dark:text-purple-300">
                      {formatLeaveDays(counter.activeRecoveryCreditDays, { mode: "full" })}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      router.push(
                        `/recovery-credits?search=${encodeURIComponent(
                          employee.employeeId
                        )}&employeeId=${encodeURIComponent(employee.employeeId)}`
                      )
                    }
                    className="text-xs group"
                  >
                    <span>Grand livre</span>
                    <ExternalLink className="h-3 w-3 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Section Loading Skeleton */}
              {isLoadingCredits && (
                <div className="space-y-3 py-2">
                  <div className="h-10 bg-muted/40 rounded-lg animate-pulse" />
                  <div className="h-14 bg-muted/30 rounded-lg animate-pulse" />
                  <div className="h-14 bg-muted/30 rounded-lg animate-pulse" />
                </div>
              )}

              {/* Independent Section Error State with Meaningful Retry */}
              {!isLoadingCredits && creditsError && (
                <div className="p-6 text-center space-y-3 rounded-xl border border-destructive/30 bg-destructive/5">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      Échec du chargement des crédits de récupération
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      {creditsError}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchCredits}
                    className="text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Réessayer
                  </Button>
                </div>
              )}

              {/* Section Empty State */}
              {!isLoadingCredits && !creditsError && credits.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border space-y-2">
                  <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/60" />
                  <p className="font-medium text-foreground">
                    Aucun crédit de récupération n&apos;a été accordé à ce collaborateur.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Les crédits attribués suite à une permanence lors d&apos;un jour férié
                    légal apparaîtront ici.
                  </p>
                </div>
              )}

              {/* Section Content: Mobile Cards (< 768px) and Accessible Tabular View (≥ 768px) */}
              {!isLoadingCredits && !creditsError && credits.length > 0 && (
                <div>
                  {/* Mobile Card List (< 768px) */}
                  <div className="space-y-3 block md:hidden" role="list" aria-label="Liste des crédits de récupération">
                    {credits.map((c) => {
                      const credited = toSafeNumber(c.creditedDays || 0);
                      const consumed = toSafeNumber(c.consumedDays || 0);
                      const remaining = Math.max(0, credited - consumed);
                      const isConsumed =
                        c.isFullyConsumed || consumed >= credited;

                      return (
                        <div
                          key={String(c.id)}
                          role="listitem"
                          className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-xs text-foreground truncate">
                              {c.publicHoliday?.label || "Jour férié officiel"}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                isConsumed
                                  ? "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
                                  : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                              }`}
                            >
                              {isConsumed ? "Épuisé" : "Actif"}
                            </Badge>
                          </div>

                          <div className="text-[11px] text-muted-foreground">
                            Date du férié :{" "}
                            <strong className="text-foreground">
                              {c.publicHoliday?.date ? formatDate(c.publicHoliday.date) : "—"}
                            </strong>
                          </div>

                          <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-muted/40 text-center text-xs">
                            <div>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                Crédité
                              </span>
                              <span className="font-semibold text-foreground">
                                {formatLeaveDays(credited, { mode: "short" })}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                Consommé
                              </span>
                              <span className="font-medium text-muted-foreground">
                                {formatLeaveDays(consumed, { mode: "short" })}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                Restant
                              </span>
                              <span className="font-bold text-purple-700 dark:text-purple-300">
                                {formatLeaveDays(remaining, { mode: "short" })}
                              </span>
                            </div>
                          </div>

                          {c.comment && (
                            <div className="text-[11px] text-muted-foreground italic truncate bg-muted/30 p-2 rounded-md">
                              « {c.comment} »
                            </div>
                          )}

                          {c.publicHolidayId && (
                            <div className="pt-1">
                              <Link
                                href={`/holidays/${c.publicHolidayId}`}
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border text-xs font-medium text-primary hover:bg-muted/50 transition-colors min-h-[40px]"
                              >
                                <span>Détail du jour férié</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop / Tablet Tabular View (≥ 768px) */}
                  <div
                    className="overflow-x-auto hidden md:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                    tabIndex={0}
                    role="region"
                    aria-label="Tableau des crédits de récupération"
                  >
                    <table className="w-full text-xs text-left" aria-label="Crédits de récupération">
                      <caption className="sr-only">
                        Crédits de récupération accordés pour jours fériés travaillés
                      </caption>
                      <thead className="border-b border-border text-muted-foreground uppercase text-[10px] font-semibold bg-muted/30">
                        <tr>
                          <th scope="col" className="py-2.5 px-3">Jour férié officiel</th>
                          <th scope="col" className="py-2.5 px-3">Date du férié</th>
                          <th scope="col" className="py-2.5 px-3 text-center">Crédité</th>
                          <th scope="col" className="py-2.5 px-3 text-center">Consommé</th>
                          <th scope="col" className="py-2.5 px-3 text-center">Restant</th>
                          <th scope="col" className="py-2.5 px-3">Statut</th>
                          <th scope="col" className="py-2.5 px-3">Commentaire / Justification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {credits.map((c) => {
                          const credited = toSafeNumber(c.creditedDays || 0);
                          const consumed = toSafeNumber(c.consumedDays || 0);
                          const remaining = Math.max(0, credited - consumed);
                          const isConsumed =
                            c.isFullyConsumed || consumed >= credited;

                          return (
                            <tr
                              key={String(c.id)}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              {/* Holiday Label with Link to Public Holiday Details */}
                              <td className="py-3 px-3 font-medium text-foreground">
                                <Link
                                  href={`/holidays/${c.publicHolidayId}`}
                                  className="inline-flex items-center gap-1.5 hover:text-primary hover:underline group"
                                >
                                  <span className="font-semibold">
                                    {c.publicHoliday?.label || "Jour férié officiel"}
                                  </span>
                                  <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                                </Link>
                              </td>

                              {/* Holiday Date */}
                              <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                                {c.publicHoliday?.date
                                  ? formatDate(c.publicHoliday.date)
                                  : "—"}
                              </td>

                              {/* Credited Days */}
                              <td className="py-3 px-3 text-center font-medium text-foreground whitespace-nowrap">
                                {formatLeaveDays(credited, { mode: "short" })}
                              </td>

                              {/* Consumed Days */}
                              <td className="py-3 px-3 text-center text-muted-foreground whitespace-nowrap">
                                {formatLeaveDays(consumed, { mode: "short" })}
                              </td>

                              {/* Remaining Days */}
                              <td className="py-3 px-3 text-center font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">
                                {formatLeaveDays(remaining, { mode: "short" })}
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {isConsumed ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
                                  >
                                    Épuisé
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                                  >
                                    Actif
                                  </Badge>
                                )}
                              </td>

                              {/* Comment or Description */}
                              <td className="py-3 px-3 text-muted-foreground max-w-xs">
                                {c.comment ? (
                                  <span className="italic text-[11px] truncate block" title={c.comment}>
                                    « {c.comment} »
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/60">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Informative Rule Footnote */}
              <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>
                  * Les crédits acquis lors d&apos;un jour férié travaillé n&apos;expirent
                  jamais et sont consommés selon la règle FIFO.
                </span>
                <span className="font-semibold text-purple-700 dark:text-purple-300">
                  Solde calculé par le moteur : {formatLeaveDays(counter.activeRecoveryCreditDays, { mode: "full" })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

export default function LeaveBalanceDetailPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="space-y-6 animate-pulse">
            <div className="h-24 bg-muted/50 rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-muted/40 rounded-xl" />
              ))}
            </div>
            <div className="h-96 bg-muted/30 rounded-2xl" />
          </div>
        </PageContainer>
      }
    >
      <LeaveBalanceDetailContent />
    </React.Suspense>
  );
}
