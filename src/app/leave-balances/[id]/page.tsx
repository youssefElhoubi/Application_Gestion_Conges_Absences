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
  FileText,
  BadgeAlert,
  ChevronRight,
  TrendingUp,
  MapPin,
  Mail,
  Shield,
  Layers,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { PageHeader } from "@/src/components/shared/PageHeader";
import { StatCard } from "@/src/components/shared/StatCard";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/src/components/ui/card";
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
  EmployeeAbsenceItem,
  EmployeeCreditItem,
} from "@/src/lib/api/employee-client";
import { formatDate } from "@/src/lib/utils";

function LeaveBalanceDetailContent() {
  const params = useParams();
  const router = useRouter();

  // Safely extract employee identifier from URL parameter
  const rawId = params?.id;
  const employeeId = React.useMemo(() => {
    if (!rawId) return "";
    return Array.isArray(rawId) ? decodeURIComponent(rawId[0]) : decodeURIComponent(rawId);
  }, [rawId]);

  // Data states
  const [employee, setEmployee] = React.useState<EmployeeDetail | null>(null);
  const [counter, setCounter] = React.useState<EmployeeCounterItem | null>(null);
  const [absences, setAbsences] = React.useState<EmployeeAbsenceItem[]>([]);
  const [credits, setCredits] = React.useState<EmployeeCreditItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Fetch all authoritative employee data concurrently
  React.useEffect(() => {
    let isMounted = true;
    if (!employeeId) {
      setError("Identifiant collaborateur manquant.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    Promise.all([
      EmployeeApiClient.getEmployee(employeeId),
      CounterApiClient.getEmployeeCounters(employeeId),
      EmployeeApiClient.getEmployeeAbsences(employeeId).catch(() => ({ data: [] })),
      EmployeeApiClient.getEmployeeCredits(employeeId).catch(() => ({ data: [] })),
    ])
      .then(([empData, counterData, absencesRes, creditsRes]) => {
        if (isMounted) {
          setEmployee(empData);
          setCounter(counterData);
          setAbsences(absencesRes.data || []);
          setCredits(creditsRes.data || []);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg =
            err instanceof Error
              ? err.message
              : "Impossible de charger les compteurs de congés du collaborateur.";
          setError(msg);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [employeeId, refreshKey]);

  // Derived summaries from authoritative data sources
  const pendingAbsences = React.useMemo(
    () => absences.filter((a) => a.status === "PENDING"),
    [absences]
  );

  const pendingDays = React.useMemo(
    () =>
      pendingAbsences.reduce((sum, a) => {
        const val = Number(a.retainedDays ?? a.calculatedWorkingDays ?? 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0),
    [pendingAbsences]
  );

  const approvedAbsences = React.useMemo(
    () => absences.filter((a) => a.status === "APPROVED"),
    [absences]
  );

  const recentAbsences = React.useMemo(() => absences.slice(0, 5), [absences]);

  if (isLoading) {
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
            <div className="lg:col-span-2 h-72 bg-muted/30 rounded-2xl" />
            <div className="h-72 bg-muted/30 rounded-2xl" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !employee || !counter) {
    return (
      <PageContainer>
        <ErrorState
          title="Fiche solde collaborateur introuvable"
          message={error || `Aucune donnée de solde disponible pour le matricule « ${employeeId} ».`}
          onRetry={() => setRefreshKey((k) => k + 1)}
          secondaryActionLabel="Retour aux soldes de congés"
          onSecondaryAction={() => router.push("/leave-balances")}
        />
      </PageContainer>
    );
  }

  const breakdown = counter.calculationBreakdown;
  const isHealthy = counter.netAvailableBalance >= 5;
  const isPositive = counter.netAvailableBalance > 0;

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

      {/* 2. Employee Header (Identity & Coordinates Card) */}
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
                  employee.active ? "bg-emerald-500 text-white" : "bg-zinc-400 text-white"
                }`}
                title={employee.active ? "Salarié actif" : "Salarié inactif"}
              >
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
                <StatusBadge status={employee.active ? "ACTIVE" : "INACTIVE"} size="sm" />
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

          {/* Action: View full employee profile */}
          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/employees/${encodeURIComponent(employee.employeeId)}`)}
              className="text-xs group"
            >
              <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span>Voir le profil collaborateur</span>
              <ExternalLink className="h-3 w-3 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        </div>
      </div>

      {/* 6-Month Statutory Gate Warning Banner (if applicable) */}
      {!counter.isEligibleForAnnualLeave && (
        <Alert
          variant="warning"
          title="Acquisition en cours — Consommation bloquée légalement (Art. 231)"
          className="shadow-xs"
        >
          Ce collaborateur cumule statutairement ses droits à congés payés ({counter.statutoryAccruedDays.toFixed(1)} jours acquis), mais son ancienneté de {counter.serviceMonths} mois est inférieure au seuil légal de 6 mois continus requis pour l&apos;ouverture des droits à jouissance. Le solde disponible est verrouillé à 0.0 jour.
        </Alert>
      )}

      {/* 3. Balance Summary (Authoritative KPI StatCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Solde Net Disponible */}
        <StatCard
          title="Solde Net Disponible"
          value={`${counter.netAvailableBalance.toFixed(1)} j`}
          description={
            counter.isEligibleForAnnualLeave
              ? "Prêt à être consommé ou posé"
              : "Verrouillé statutairement (< 6 mois)"
          }
          icon={<Briefcase className="h-5 w-5" />}
          valueColor={isHealthy ? "success" : isPositive ? "warning" : "destructive"}
        />

        {/* Droits Acquis (Congé Payé Annuel) */}
        <StatCard
          title="Droits Acquis (Statutaire)"
          value={`${counter.statutoryAccruedDays.toFixed(1)} j`}
          description={`${breakdown.monthlyRateApplied} j / mois • ${counter.serviceYears} an(s) d'ancienneté`}
          icon={<CalendarDays className="h-5 w-5" />}
          valueColor="primary"
        />

        {/* Congés Consommés */}
        <StatCard
          title="Congés Consommés"
          value={`${counter.totalApprovedDeductions.toFixed(1)} j`}
          description={`${approvedAbsences.length} absence(s) approuvée(s)`}
          icon={<Clock className="h-5 w-5" />}
          valueColor="default"
        />

        {/* Crédits Récupération (Fériés Travaillés) */}
        <StatCard
          title="Crédits Récupération"
          value={`${counter.activeRecoveryCreditDays.toFixed(1)} j`}
          description={`${breakdown.unconsumedHolidayCreditsCount} jour(s) férié(s) non expiré(s)`}
          icon={<Sparkles className="h-5 w-5" />}
          valueColor="default"
        />
      </div>

      {/* Auxiliary Notice: Pending Requests (Distinguished from confirmed balance) */}
      {pendingDays > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <BadgeAlert className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-amber-900 dark:text-amber-300">
                Demandes en attente d&apos;approbation : {pendingDays.toFixed(1)} jour(s) ({pendingAbsences.length} demande{pendingAbsences.length > 1 ? "s" : ""})
              </span>
              <p className="text-amber-800/80 dark:text-amber-400/80 mt-0.5">
                Ces jours ne sont pas encore décomptés du solde net disponible. Ils seront soustraits automatiquement dès validation hiérarchique.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="xs"
            onClick={() => router.push(`/absences?employeeId=${encodeURIComponent(employee.employeeId)}&status=PENDING`)}
            className="shrink-0 bg-card border-amber-500/30 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20"
          >
            Examiner les demandes
          </Button>
        </div>
      )}

      {/* 4. Main Body: Entitlement Context & Leave Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Statutory Entitlement Breakdown */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold">Cadre Statutaire et Acquisition</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Paramètres d&apos;acquisition selon le Code du Travail marocain
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Taux mensuel appliqué</span>
                <span className="font-semibold text-foreground font-mono">
                  {breakdown.monthlyRateApplied} jour / mois
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Régime d&apos;âge</span>
                <Badge variant="outline" className="text-[11px] font-medium">
                  {breakdown.isMinorRate ? "Salarié mineur (2 j/m)" : "Salarié adulte (1.5 j/m)"}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Ancienneté continue</span>
                <span className="font-semibold text-foreground">
                  {counter.serviceYears} an{counter.serviceYears > 1 ? "s" : ""} • {counter.serviceMonths} mois
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Éligibilité légale (Art. 231)</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold ${
                    counter.isEligibleForAnnualLeave
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  }`}
                >
                  {counter.isEligibleForAnnualLeave ? "Droit ouvert (≥ 6 mois)" : "Acquisition (< 6 mois)"}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Plafond légal 30 jours (Art. 232)</span>
                <span className="font-medium text-foreground">
                  {breakdown.maxYearlyCapEnforced ? (
                    <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-700 border-rose-500/30">
                      Plafond atteint (30 j)
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Non atteint</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Date d&apos;arrêté du calcul</span>
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
                  Majoration de 1.5 jour par période entière de 5 ans de service, sans que le total annuel n&apos;excède 30 jours ouvrables.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Useful Navigation Quick Links */}
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
                href={`/absences?employeeId=${encodeURIComponent(employee.employeeId)}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors text-foreground font-medium group"
              >
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  Toutes les absences du collaborateur
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/recovery-credits"
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
                  Retour à la vue consolidée
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Leave Usage & Recovery Credits & Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* 5. Leave Usage Section */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-bold">Consommation des Droits et Décomptes</CardTitle>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  Total décompté : <strong className="text-foreground">{counter.totalApprovedDeductions.toFixed(1)} j</strong>
                </span>
              </div>
              <CardDescription className="text-xs">
                Absences déductibles validées ayant fait l&apos;objet d&apos;une imputation sur le solde
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {approvedAbsences.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  Aucun congé n&apos;a encore été décompté sur les droits de ce collaborateur.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-border text-muted-foreground uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="pb-2">Type d&apos;absence</th>
                        <th className="pb-2">Période</th>
                        <th className="pb-2 text-center">Jours décomptés</th>
                        <th className="pb-2 text-right">Détail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {approvedAbsences.map((abs) => (
                        <tr key={abs.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 font-medium text-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: abs.type?.colorHex || "var(--primary)" }}
                              />
                              <span>{abs.type?.name || "Congé payé"}</span>
                            </span>
                          </td>
                          <td className="py-2.5 text-muted-foreground">
                            {formatDate(abs.startDate)} au {formatDate(abs.endDate)}
                          </td>
                          <td className="py-2.5 text-center font-bold text-foreground">
                            {Number(abs.retainedDays ?? abs.calculatedWorkingDays).toFixed(1)} j
                          </td>
                          <td className="py-2.5 text-right">
                            <Link
                              href={`/absences/${abs.id}`}
                              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                            >
                              <span>Consulter</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 6. Recovery Credits Ledger */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <CardTitle className="text-sm font-bold">Crédits de Récupération (Jours Fériés Travaillés)</CardTitle>
                </div>
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                  Solde disponible : <strong>{counter.activeRecoveryCreditDays.toFixed(1)} j</strong>
                </span>
              </div>
              <CardDescription className="text-xs">
                Compensation des jours fériés légaux chômés et payés travaillés (n&apos;expirent jamais, consommation FIFO)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {credits.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  Aucun crédit de récupération n&apos;a été accordé à ce collaborateur.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-border text-muted-foreground uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="pb-2">Jour férié officiel</th>
                        <th className="pb-2">Date du férié</th>
                        <th className="pb-2 text-center">Crédité</th>
                        <th className="pb-2 text-center">Consommé</th>
                        <th className="pb-2 text-center">Restant</th>
                        <th className="pb-2 text-right">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {credits.map((c) => {
                        const credited = Number(c.creditedDays);
                        const consumed = Number(c.consumedDays);
                        const remaining = Math.max(0, credited - consumed);
                        return (
                          <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 font-medium text-foreground">
                              {c.publicHoliday?.label || "Jour férié"}
                            </td>
                            <td className="py-2.5 text-muted-foreground">
                              {c.publicHoliday?.date ? formatDate(c.publicHoliday.date) : "—"}
                            </td>
                            <td className="py-2.5 text-center font-medium text-foreground">
                              {credited.toFixed(1)} j
                            </td>
                            <td className="py-2.5 text-center text-muted-foreground">
                              {consumed.toFixed(1)} j
                            </td>
                            <td className="py-2.5 text-center font-bold text-purple-700 dark:text-purple-300">
                              {remaining.toFixed(1)} j
                            </td>
                            <td className="py-2.5 text-right">
                              {c.isFullyConsumed ? (
                                <Badge variant="outline" className="text-[10px] bg-zinc-500/10 text-zinc-600 border-zinc-500/20">
                                  Épuisé
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 border-purple-500/30">
                                  Actif
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 7. Recent Absence Activity (Pending & History) */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-bold">Activité Récente des Absences</CardTitle>
                </div>
                <Link
                  href={`/absences?employeeId=${encodeURIComponent(employee.employeeId)}`}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                >
                  <span>Voir l&apos;historique complet</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <CardDescription className="text-xs">
                Dernières demandes soumises, en cours d&apos;examen ou traitées
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {recentAbsences.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  Aucune activité d&apos;absence enregistrée pour ce collaborateur.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentAbsences.map((abs) => {
                    const days = Number(abs.retainedDays ?? abs.calculatedWorkingDays);
                    const isPending = abs.status === "PENDING";

                    return (
                      <div
                        key={abs.id}
                        onClick={() => router.push(`/absences/${abs.id}`)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isPending
                            ? "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10"
                            : "bg-card border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground truncate">
                              {abs.type?.name || "Demande d'absence"}
                            </span>
                            <StatusBadge status={abs.status} size="sm" />
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Période : {formatDate(abs.startDate)} au {formatDate(abs.endDate)}
                            {abs.comment && <span className="truncate"> • {abs.comment}</span>}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-sm text-foreground">
                            {days.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            jours ouvrés
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
