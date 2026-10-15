"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  ArrowLeft,
  Edit2,
  CheckCircle,
  XCircle,
  Building2,
  Briefcase,
  Calendar,
  Shield,
  FileText,
  BadgeCheck,
  Award,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import {
  SectionHeader,
  DataCard,
  StatCard,
  StatusBadge,
  ConfirmDialog,
} from "@/src/components/shared";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/src/components/ui/card";
import { TableSkeleton, CardGridSkeleton } from "@/src/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import { Alert } from "@/src/components/feedback/Alert";
import {
  EmployeeApiClient,
  EmployeeDetail,
  EmployeeBalances,
  EmployeeAbsenceItem,
  EmployeeCreditItem,
} from "@/src/lib/api/employee-client";
import { toggleEmployeeActiveAction } from "@/src/modules/employees/employee.actions";
import { EmployeeModalForm } from "@/src/components/employees/EmployeeModalForm";
import { formatDate } from "@/src/lib/utils";

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  // Data State
  const [employee, setEmployee] = React.useState<EmployeeDetail | null>(null);
  const [balances, setBalances] = React.useState<EmployeeBalances | null>(null);
  const [absences, setAbsences] = React.useState<EmployeeAbsenceItem[]>([]);
  const [credits, setCredits] = React.useState<EmployeeCreditItem[]>([]);

  // UX State
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Modals
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [statusToggling, setStatusToggling] = React.useState(false);

  // Active Tab inside Profile
  const [activeProfileTab, setActiveProfileTab] = React.useState<"overview" | "absences" | "credits">("overview");

  // Fetch all employee details, balances, and history asynchronously without synchronous setState in effect
  React.useEffect(() => {
    let isMounted = true;

    async function fetchAll() {
      try {
        const [empData, balData, absData, credData] = await Promise.all([
          EmployeeApiClient.getEmployee(employeeId),
          EmployeeApiClient.getEmployeeBalances(employeeId).catch(() => null),
          EmployeeApiClient.getEmployeeAbsences(employeeId).catch(() => ({ data: [] })),
          EmployeeApiClient.getEmployeeCredits(employeeId).catch(() => ({ data: [] })),
        ]);

        if (isMounted) {
          setEmployee(empData);
          setBalances(balData);
          setAbsences(absData.data);
          setCredits(credData.data);
          setError(null);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Impossible de charger le dossier collaborateur.";
          setError(msg);
          setIsLoading(false);
        }
      }
    }

    fetchAll();

    return () => {
      isMounted = false;
    };
  }, [employeeId, refreshKey]);

  const reloadData = () => {
    setIsLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  // Execute Toggle Active Status
  const handleToggleStatus = async () => {
    if (!employee) return;
    setStatusToggling(true);
    try {
      const newStatus = !employee.active;
      const res = await toggleEmployeeActiveAction(employee.employeeId, newStatus);
      if (!res.success) throw new Error(res.error);

      setSuccessMessage(
        `Le collaborateur est désormais ${newStatus ? "Actif" : "Inactif"}.`
      );
      setConfirmDialogOpen(false);
      reloadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la modification du statut.";
      setError(msg);
    } finally {
      setStatusToggling(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="h-10 w-48 bg-muted animate-pulse rounded" />
          <CardGridSkeleton count={4} />
          <TableSkeleton rows={5} columns={4} />
        </div>
      </PageContainer>
    );
  }

  if (error || !employee) {
    return (
      <PageContainer>
        <ErrorState
          title="Collaborateur introuvable"
          message={error || "Ce dossier collaborateur n'existe pas ou vous n'avez pas les droits nécessaires."}
          secondaryActionLabel="Retour au répertoire"
          onSecondaryAction={() => router.push("/employees")}
          onRetry={reloadData}
        />
      </PageContainer>
    );
  }

  // Initials for avatar
  const initials = employee.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Calculate balance percentage
  const totalAccrued = balances?.accruedDays || 0;
  const remainingPaid = balances?.remainingPaidBalance || 0;
  const takenPaid = balances?.takenApprovedDays || 0;
  const consumptionRate = totalAccrued > 0 ? Math.min(100, Math.round((takenPaid / totalAccrued) * 100)) : 0;

  return (
    <PageContainer>
      {/* Top Alert feedback */}
      {successMessage && (
        <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Back button */}
      <div>
        <Link
          href="/employees"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Retour au répertoire des collaborateurs</span>
        </Link>
      </div>

      {/* Hero Overview Header (BambooHR / Personio Style) */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Avatar + Details */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-primary/15 text-primary border-2 border-primary/20 flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
                {initials}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-card flex items-center justify-center ${
                  employee.active ? "bg-emerald-500 text-white" : "bg-zinc-400 text-white"
                }`}
                title={employee.active ? "Actif" : "Inactif"}
              >
                {employee.active ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
              </span>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {employee.fullName}
                </h1>
                <StatusBadge status={employee.active ? "ACTIVE" : "INACTIVE"} size="sm" />
                {employee.isEligibleForAnnualLeave ? (
                  <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
                    Éligible Congés (Loi 65-99)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 text-[10px]">
                    Période d&apos;acquisition (&lt; 6 mois)
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="font-semibold text-foreground">
                  {employee.jobTitle || "Poste non renseigné"}
                </span>
                <span>•</span>
                <span>{employee.department || "Direction Générale"}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {employee.site?.name || "Casablanca"}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs font-mono text-muted-foreground">
                <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border text-[11px]">
                  Matricule: {employee.employeeId}
                </span>
                <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border text-[11px]">
                  CIN: {employee.cin}
                </span>
                {employee.cnssNumber && (
                  <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border text-[11px]">
                    CNSS: {employee.cnssNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/leave-balances/${encodeURIComponent(employee.employeeId)}`)}
              className="text-xs"
            >
              <Briefcase className="h-4 w-4 mr-1.5 text-primary" />
              <span>Soldes & Compteurs</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/calendar?employeeId=${encodeURIComponent(employee.employeeId)}`)}
              className="text-xs"
            >
              <Calendar className="h-4 w-4 mr-1.5 text-primary" />
              <span>Planning des congés</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialogOpen(true)}
              className={employee.active ? "text-destructive hover:bg-destructive/10" : "text-emerald-600 hover:bg-emerald-500/10"}
            >
              {employee.active ? (
                <>
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Désactiver
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Activer
                </>
              )}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setEditModalOpen(true)}
            >
              <Edit2 className="h-4 w-4 mr-1.5" />
              Modifier la fiche
            </Button>
          </div>
        </div>

        {/* Profile Tabs Bar */}
        <div className="flex items-center gap-1 border-t border-border mt-6 pt-2 overflow-x-auto">
          {[
            { id: "overview", label: "Vue d'ensemble & Emploi", icon: User },
            { id: "absences", label: `Historique Absences (${absences.length})`, icon: Calendar },
            { id: "credits", label: `Crédits Récupération (${credits.length})`, icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeProfileTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveProfileTab(tab.id as "overview" | "absences" | "credits")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & CARDS */}
      {activeProfileTab === "overview" && (
        <div className="space-y-6 animate-fadeIn">
          {/* KPI StatCards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Solde Congé Payé"
              value={`${remainingPaid.toFixed(1)} j`}
              description={`Sur ${totalAccrued.toFixed(1)} j acquis (Plafond 30 j)`}
              icon={<Calendar className="h-5 w-5" />}
              valueColor={remainingPaid > 5 ? "success" : "warning"}
            />
            <StatCard
              title="Congés Pris (N)"
              value={`${takenPaid.toFixed(1)} j`}
              description={`Consommation : ${consumptionRate}% du solde`}
              icon={<Briefcase className="h-5 w-5" />}
              valueColor="primary"
            />
            <StatCard
              title="Crédits Récupération"
              value={`${(balances?.recoveryCreditsRemaining ?? 0).toFixed(1)} j`}
              description="Jours fériés travaillés (sans expiration)"
              icon={<Sparkles className="h-5 w-5" />}
              valueColor="default"
            />
            <StatCard
              title="Ancienneté"
              value={`${employee.seniorityYears} an${employee.seniorityYears > 1 ? "s" : ""}`}
              description={`${employee.seniorityMonths} mois complétés`}
              icon={<Award className="h-5 w-5" />}
              valueColor="default"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column Left (2 cols): Employment & Contractual Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Employment Information Card */}
              <DataCard
                title="Informations d'Emploi & Organisation"
                description="Affectation administrative et hiérarchique au sein de l'entreprise"
                icon={<Briefcase className="h-5 w-5 text-primary" />}
                actions={
                  <Button variant="ghost" size="xs" onClick={() => setEditModalOpen(true)}>
                    Modifier
                  </Button>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-muted-foreground font-medium">Site d&apos;affectation</span>
                    <p className="text-sm font-semibold text-foreground">
                      {employee.site?.name || "Siège Casablanca"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Ville: {employee.site?.city || "Casablanca"}</p>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-muted-foreground font-medium">Département</span>
                    <p className="text-sm font-semibold text-foreground">
                      {employee.department || "Direction Générale"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Unité organisationnelle</p>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-muted-foreground font-medium">Intitulé du Poste</span>
                    <p className="text-sm font-semibold text-foreground">
                      {employee.jobTitle || "Poste non défini"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Classification conventionnelle</p>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-muted-foreground font-medium">Responsable Hiérarchique</span>
                    <p className="text-sm font-semibold text-foreground">
                      {employee.manager ? employee.manager.fullName : "Direction Générale (Aucun)"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {employee.manager ? `Matricule: ${employee.manager.employeeId}` : "Niveau exécutif"}
                    </p>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-muted-foreground font-medium">Date d&apos;embauche</span>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(employee.hireDate)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Ancienneté: {employee.seniorityYears} an(s) et {employee.seniorityMonths % 12} mois
                    </p>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-muted-foreground font-medium">Date de naissance & Âge</span>
                    <p className="text-sm font-semibold text-foreground">
                      {employee.birthDate ? formatDate(employee.birthDate) : "Non renseignée"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {employee.calculatedAge !== null
                        ? `${employee.calculatedAge} ans (${employee.isMinor ? "Salarié mineur" : "Majeur"})`
                        : "Âge non calculé"}
                    </p>
                  </div>
                </div>

                {employee.observation && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/60">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Notes RH & Observations
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {employee.observation}
                    </p>
                  </div>
                )}
              </DataCard>

              {/* Recent Absence Activity Mini-Table */}
              <DataCard
                title="Dernières Absences"
                description="Aperçu des 3 dernières demandes soumises"
                icon={<Calendar className="h-5 w-5 text-primary" />}
                actions={
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setActiveProfileTab("absences")}
                  >
                    Voir tout ({absences.length})
                  </Button>
                }
              >
                {absences.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    Aucune absence enregistrée pour ce collaborateur.
                  </p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {absences.slice(0, 3).map((abs) => (
                      <div
                        key={String(abs.id)}
                        className="py-3 flex items-center justify-between text-xs gap-3"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {abs.type?.name || "Absence"}
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            Du {formatDate(abs.startDate)} au {formatDate(abs.endDate)} ({abs.calculatedWorkingDays} j)
                          </p>
                        </div>
                        <StatusBadge status={abs.status} size="sm" />
                      </div>
                    ))}
                  </div>
                )}
              </DataCard>
            </div>

            {/* Column Right (1 col): Statutory Balances & Recovery Cards */}
            <div className="space-y-6">
              {/* Statutory Balance Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Droits & Solde Statutaire
                  </CardTitle>
                  <CardDescription>
                    Conforme aux règles d&apos;acquisition du Code du Travail (Loi 65-99)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center space-y-1">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      Solde Annuel Disponible
                    </span>
                    <div className="text-3xl font-extrabold text-primary">
                      {remainingPaid.toFixed(1)} <span className="text-base font-normal">jours</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground block">
                      {employee.isMinor ? "Taux majoré : 2.0 j/mois" : "Taux standard : 1.5 j/mois"}
                    </span>
                  </div>

                  {/* Balance Progress Bar */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-medium">
                      <span>Jours consommés:</span>
                      <span className="text-foreground font-semibold">
                        {takenPaid.toFixed(1)} / {totalAccrued.toFixed(1)} j
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${consumptionRate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span>{consumptionRate}% utilisé</span>
                      <span>Plafond annuel : 30 j</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Demandes en cours d&apos;approbation:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {(balances?.pendingDays || 0).toFixed(1)} j
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total disponible net:</span>
                      <span className="font-bold text-foreground">
                        {(balances?.totalAvailableDays ?? remainingPaid).toFixed(1)} j
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recovery Credits Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Crédits Jours Fériés
                  </CardTitle>
                  <CardDescription>
                    Repos compensateur accordé pour travail lors d&apos;un jour férié légal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                      <span className="text-[11px] text-muted-foreground block">Acquis</span>
                      <span className="text-lg font-bold text-foreground">
                        {(balances?.recoveryCreditsTotal || 0).toFixed(1)} j
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <span className="text-[11px] text-purple-700 dark:text-purple-300 block font-medium">Disponible</span>
                      <span className="text-lg font-bold text-purple-700 dark:text-purple-300">
                        {(balances?.recoveryCreditsRemaining || 0).toFixed(1)} j
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground flex items-center gap-1">
                      <BadgeCheck className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      Validité permanente
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Conformément à la réglementation marocaine, les crédits acquis lors d&apos;un jour férié travaillé ne comportent aucune date d&apos;expiration.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED ABSENCES HISTORY */}
      {activeProfileTab === "absences" && (
        <div className="space-y-4 animate-fadeIn">
          <SectionHeader
            title="Historique Complet des Demandes d'Absence"
            description={`Toutes les demandes enregistrées au registre pour ${employee.fullName}`}
          />

          {absences.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                <h3 className="text-sm font-semibold text-foreground">Aucune absence enregistrée</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Ce collaborateur n&apos;a soumis aucune demande de congé ou d&apos;autorisation exceptionnelle.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Type d&apos;absence</th>
                      <th className="px-4 py-3">Période</th>
                      <th className="px-4 py-3">Durée</th>
                      <th className="px-4 py-3">Fraction</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Justificatif</th>
                      <th className="px-4 py-3">Motif / Commentaire</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {absences.map((abs) => (
                      <tr key={String(abs.id)} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-foreground">
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: abs.type?.colorHex || "#3b82f6" }}
                          />
                          {abs.type?.name || "Congé"}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                          Du {formatDate(abs.startDate)} au {formatDate(abs.endDate)}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-foreground">
                          {abs.calculatedWorkingDays} j
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {abs.fraction === "FULL_DAY" ? "Journée entière" : "Demi-journée"}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={abs.status} size="sm" />
                        </td>
                        <td className="px-4 py-3.5">
                          {abs.supportingDocumentProvided ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Fourni
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Non requis</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground max-w-xs truncate">
                          {abs.comment || abs.reason?.name || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HOLIDAY CREDITS HISTORY */}
      {activeProfileTab === "credits" && (
        <div className="space-y-4 animate-fadeIn">
          <SectionHeader
            title="Registre des Crédits de Récupération (Jours Fériés)"
            description="Détail des droits acquis pour travail lors d'un jour férié légal chômé"
          />

          {credits.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                <h3 className="text-sm font-semibold text-foreground">Aucun crédit enregistré</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Ce collaborateur n&apos;a aucun crédit de récupération attribué pour un jour férié travaillé.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Jour Férié Travaillé</th>
                      <th className="px-4 py-3">Date du férié</th>
                      <th className="px-4 py-3">Crédit Acquis</th>
                      <th className="px-4 py-3">Consommé</th>
                      <th className="px-4 py-3">Solde Restant</th>
                      <th className="px-4 py-3">État</th>
                      <th className="px-4 py-3">Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {credits.map((cred) => {
                      const credited = Number(cred.creditedDays);
                      const consumed = Number(cred.consumedDays);
                      const remaining = credited - consumed;

                      return (
                        <tr key={String(cred.id)} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-foreground">
                            {cred.publicHoliday?.label || "Jour Férié Légal"}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                            {cred.publicHoliday?.date ? formatDate(cred.publicHoliday.date) : "—"}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-foreground">
                            {credited.toFixed(1)} j
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            {consumed.toFixed(1)} j
                          </td>
                          <td className="px-4 py-3.5 font-bold text-primary">
                            {remaining.toFixed(1)} j
                          </td>
                          <td className="px-4 py-3.5">
                            {remaining <= 0 ? (
                              <Badge variant="secondary" className="text-[10px]">Totalement consommé</Badge>
                            ) : (
                              <Badge variant="outline" className="text-purple-700 dark:text-purple-300 border-purple-500/30 bg-purple-500/10 text-[10px]">
                                Disponible
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground max-w-xs truncate">
                            {cred.comment || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal Component */}
      <EmployeeModalForm
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        mode="edit"
        initialData={employee}
        onSuccess={() => {
          setSuccessMessage("Fiche collaborateur mise à jour avec succès.");
          reloadData();
        }}
      />

      {/* Toggle Status Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleToggleStatus}
        title={employee.active ? "Désactiver ce collaborateur ?" : "Réactiver ce collaborateur ?"}
        description={
          employee.active
            ? `Êtes-vous sûr de vouloir désactiver le compte de ${employee.fullName} (${employee.employeeId}) ? L'historique des congés et les soldes acquis seront conservés intacts.`
            : `Voulez-vous réactiver ${employee.fullName} (${employee.employeeId}) ? Il pourra de nouveau soumettre des demandes de congé.`
        }
        confirmLabel={employee.active ? "Oui, désactiver" : "Oui, réactiver"}
        cancelLabel="Annuler"
        variant={employee.active ? "destructive" : "primary"}
        isLoading={statusToggling}
      />
    </PageContainer>
  );
}
