"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit2,
  FileCheck2,
  FileX2,
  User,
  Building2,
  Briefcase,
  History,
  ShieldCheck,
  CalendarDays,
  ExternalLink,
  Info,
  CalendarClock,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/src/components/ui/card";
import { Alert } from "@/src/components/feedback/Alert";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import {
  AbsenceApiClient,
  AbsenceDetail,
} from "@/src/lib/api/absence-client";
import { EmployeeApiClient, EmployeeBalances } from "@/src/lib/api/employee-client";
import { PortalApiClient, PortalProfileData } from "@/src/lib/api/portal-client";
import { AbsenceModalForm } from "@/src/components/absences/AbsenceModalForm";
import {
  ApproveAbsenceDialog,
  RejectAbsenceDialog,
  CancelAbsenceDialog,
} from "@/src/components/absences/AbsenceWorkflowDialogs";
import { formatDate } from "@/src/lib/utils";

function AbsenceDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const absenceId = params.id as string;

  // Data State
  const [absence, setAbsence] = React.useState<AbsenceDetail | null>(null);
  const [balances, setBalances] = React.useState<EmployeeBalances | null>(null);
  const [currentProfile, setCurrentProfile] = React.useState<PortalProfileData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Workflow Dialogs State
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = React.useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);

  const [refreshKey, setRefreshKey] = React.useState(0);

  // Load current user profile for role & self-approval validation
  React.useEffect(() => {
    PortalApiClient.getPortalData()
      .then((p: PortalProfileData) => setCurrentProfile(p))
      .catch(() => {});
  }, []);

  // Fetch Absence Detail and Employee Balances
  React.useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      setIsLoading(true);
      try {
        const detail = await AbsenceApiClient.getAbsence(absenceId);
        if (isMounted) {
          setAbsence(detail);
          setError(null);

          // Fetch live employee balances
          if (detail.employeeId) {
            EmployeeApiClient.getEmployeeBalances(detail.employeeId)
              .then((bal) => {
                if (isMounted) setBalances(bal);
              })
              .catch(() => {});
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Impossible de charger la demande d'absence.";
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [absenceId, refreshKey]);

  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6 animate-pulse">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-10 w-64 bg-muted rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-48 bg-muted rounded-xl" />
              <div className="h-48 bg-muted rounded-xl" />
            </div>
            <div className="space-y-6">
              <div className="h-64 bg-muted rounded-xl" />
              <div className="h-48 bg-muted rounded-xl" />
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !absence) {
    return (
      <PageContainer>
        <div className="mb-6">
          <Link
            href="/absences"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la liste des absences
          </Link>
        </div>
        <ErrorState
          title="Demande d'absence introuvable"
          message={error || "Cette demande d'absence n'existe pas ou vous n'avez pas l'autorisation d'y accéder."}
          onRetry={() => router.push("/absences")}
          secondaryActionLabel="Retourner aux absences"
          onSecondaryAction={() => router.push("/absences")}
        />
      </PageContainer>
    );
  }

  const isPending = absence.status === "PENDING";
  const isApproved = absence.status === "APPROVED";
  const isRejected = absence.status === "REJECTED";
  const isCancelled = absence.status === "CANCELLED";

  const workingDays = Number(absence.retainedDays || absence.calculatedWorkingDays);
  const calendarDays = Number(absence.enteredDays);

  const isSelfRequester = Boolean(
    currentProfile?.employee?.employeeId &&
    absence.employeeId &&
    currentProfile.employee.employeeId === absence.employeeId
  );

  return (
    <PageContainer>
      {/* Back Link & Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/absences"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au répertoire des absences
        </Link>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <Alert
          variant="success"
          title="Succès"
          className="mb-4"
          onDismiss={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      {/* Hero Header Area */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">
              Demande d&apos;absence #{absence.id}
            </h1>
            <StatusBadge status={absence.status} size="md" />
            {absence.type.isDeductible ? (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                Déductible du solde annuel
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                Non déductible
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Soumise le {new Date(absence.requestDate).toLocaleDateString("fr-FR")} pour{" "}
            <span className="font-semibold text-foreground">{absence.employee.fullName}</span> (
            {absence.employee.employeeId})
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {isSelfRequester && isPending && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span>Auto-arbitrage interdit : vous ne pouvez pas valider ou rejeter votre propre demande.</span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {isPending && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                  leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                >
                  Modifier
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={isSelfRequester}
                  title={isSelfRequester ? "L'auto-approbation est interdite" : "Rejeter la demande"}
                  leftIcon={<XCircle className="h-3.5 w-3.5" />}
                >
                  Rejeter
                </Button>
                <Button
                  size="sm"
                  onClick={() => setApproveDialogOpen(true)}
                  disabled={isSelfRequester}
                  title={isSelfRequester ? "L'auto-approbation est interdite" : "Valider la demande"}
                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
                >
                  Valider
                </Button>
              </>
            )}

            {(isPending || isApproved) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
                leftIcon={<AlertTriangle className="h-3.5 w-3.5" />}
                className="text-muted-foreground hover:text-destructive hover:border-destructive"
              >
                Annuler la demande
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Aperçu de la demande
              </CardTitle>
              <CardDescription>
                Informations synthétiques sur la nature et le motif du congé demandé.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                  <div className="text-xs text-muted-foreground">Type d&apos;absence</div>
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: absence.type.colorHex || "#3b82f6" }}
                    />
                    <span>{absence.type.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Code: {absence.type.code}</div>
                </div>

                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                  <div className="text-xs text-muted-foreground">Motif statutaire</div>
                  <div className="font-semibold text-foreground">
                    {absence.reason ? absence.reason.name : "Aucun motif spécifique"}
                  </div>
                  {absence.reason && (
                    <div className="text-xs text-muted-foreground">
                      Plafond légal autorisé: {Number(absence.reason.allowedDays)} jour(s)
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                  <div className="text-xs text-muted-foreground">Fractionnement</div>
                  <div className="font-semibold text-foreground">
                    {absence.fraction === "FULL_DAY"
                      ? "Journée complète"
                      : absence.fraction === "HALF_DAY_MORNING"
                      ? "Demi-journée (Matin)"
                      : "Demi-journée (Après-midi)"}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                  <div className="text-xs text-muted-foreground">Date de la requête</div>
                  <div className="font-semibold text-foreground">
                    {formatDate(absence.requestDate)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Dates & Legal Calculations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Décompte légal des jours (Moteur statutaire)
              </CardTitle>
              <CardDescription>
                Calcul automatique des jours ouvrés et déductions conformément au Code du Travail marocain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border bg-background space-y-1 text-center">
                  <div className="text-xs text-muted-foreground">Date de début</div>
                  <div className="font-bold text-foreground text-sm">
                    {formatDate(absence.startDate)}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background space-y-1 text-center">
                  <div className="text-xs text-muted-foreground">Date de fin</div>
                  <div className="font-bold text-foreground text-sm">
                    {formatDate(absence.endDate)}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background space-y-1 text-center">
                  <div className="text-xs text-muted-foreground">Jours calendaires</div>
                  <div className="font-bold text-foreground text-base">
                    {calendarDays} <span className="text-xs font-normal text-muted-foreground">j.</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-1 text-center">
                  <div className="text-xs text-primary font-medium">Jours ouvrés retenus</div>
                  <div className="font-bold text-primary text-xl">
                    {workingDays} <span className="text-xs font-normal">jours</span>
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-muted/40 p-3 border border-border/60 text-xs text-muted-foreground space-y-1">
                <div className="font-medium text-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" /> Règle de calcul appliquée
                </div>
                <p>
                  Les jours fériés officiels chômés et les jours de repos hebdomadaires prévus sur le site
                  ({absence.employee.site?.name || "Casablanca"}) sont automatiquement exclus du décompte
                  et ne consomment aucun droit à congé payé.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Supporting Document & Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Justificatifs & Commentaires
              </CardTitle>
              <CardDescription>
                Contrôle de conformité documentaire et traçabilité des échanges.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center gap-2.5">
                  {absence.supportingDocumentProvided ? (
                    <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <FileCheck2 className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-full bg-muted text-muted-foreground">
                      <FileX2 className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {absence.supportingDocumentProvided
                        ? "Justificatif fourni"
                        : "Aucun justificatif fourni"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {absence.supportingDocumentProvided
                        ? "Le document légal (médical, acte civil) a été validé et archivé."
                        : "En attente de transmission par le collaborateur si requis."}
                    </div>
                  </div>
                </div>
                {absence.type.requiresJustification && !absence.supportingDocumentProvided && (
                  <Badge variant="warning" size="sm">
                    Requis statutairement
                  </Badge>
                )}
              </div>

              {/* Comment */}
              <div>
                <div className="text-xs font-semibold text-foreground mb-1">
                  Commentaire / Motif de la demande :
                </div>
                {absence.comment ? (
                  <div className="p-3 rounded-md border border-border bg-background text-sm text-foreground">
                    {absence.comment}
                  </div>
                ) : (
                  <div className="p-3 rounded-md border border-dashed border-border bg-muted/10 text-xs text-muted-foreground italic">
                    Aucun commentaire saisi lors de la création de la demande.
                  </div>
                )}
              </div>

              {/* Rejection notice if rejected */}
              {isRejected && absence.rejectionReason && (
                <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-sm space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-rose-600" />
                    Motif du refus administratif :
                  </div>
                  <p>{absence.rejectionReason}</p>
                </div>
              )}

              {/* Cancellation notice if cancelled */}
              {isCancelled && (
                <div className="p-3 rounded-lg border border-border bg-muted/30 text-muted-foreground text-sm space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Demande d&apos;absence clôturée :
                  </div>
                  <p>Cette demande a été annulée. Elle ne fait plus l&apos;objet de retenue sur les soldes du collaborateur.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Audit Trail / Approval History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Historique statutaire & Traçabilité
              </CardTitle>
              <CardDescription>
                Piste d&apos;audit infalsifiable des validations et modifications administratives.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {absence.approvalHistory && absence.approvalHistory.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-border space-y-4 my-2">
                  {absence.approvalHistory.map((step) => {
                    const actionLabels: Record<string, { label: string; color: string }> = {
                      SUBMITTED: { label: "Demande soumise", color: "text-blue-500" },
                      APPROVED: { label: "Demande approuvée", color: "text-emerald-500" },
                      REJECTED: { label: "Demande refusée", color: "text-rose-500" },
                      CANCELLED: { label: "Demande annulée", color: "text-amber-500" },
                      CORRECTED: { label: "Demande modifiée", color: "text-indigo-500" },
                    };
                    const cfg = actionLabels[step.action] || { label: step.action, color: "text-muted-foreground" };

                    return (
                      <div key={step.id} className="relative group">
                        <div
                          className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-current ${cfg.color}`}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">{cfg.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(step.createdAt).toLocaleString("fr-FR")}
                            </span>
                          </div>
                          {step.performedByUser && (
                            <div className="text-xs text-muted-foreground">
                              Par : {step.performedByUser.email} ({step.performedByUser.role})
                            </div>
                          )}
                          {step.comment && (
                            <p className="text-xs text-foreground/80 bg-muted/30 p-2 rounded border border-border/50 mt-1">
                              &ldquo;{step.comment}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Aucun historique d&apos;approbation disponible pour cette demande.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 col): Employee Context & Balances */}
        <div className="space-y-6">
          {/* Employee Mini Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Collaborateur concerné
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
                  {absence.employee.fullName
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-foreground text-base">
                    {absence.employee.fullName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Matricule: {absence.employee.employeeId}
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-2 text-xs">
                {absence.employee.jobTitle && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" /> Poste:
                    </span>
                    <span className="font-medium text-foreground">{absence.employee.jobTitle}</span>
                  </div>
                )}

                {absence.employee.site && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> Site de rattachement:
                    </span>
                    <span className="font-medium text-foreground">{absence.employee.site.name}</span>
                  </div>
                )}

                {absence.employee.cin && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">CIN:</span>
                    <span className="font-medium text-foreground">{absence.employee.cin}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href={`/employees/${encodeURIComponent(absence.employee.employeeId)}`}
                  className="w-full"
                >
                  <Button variant="outline" size="sm" className="w-full text-xs" leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                    Consulter la fiche collaborateur
                  </Button>
                </Link>
                <Link
                  href={`/calendar?employeeId=${encodeURIComponent(absence.employee.employeeId)}&date=${absence.startDate.split("T")[0]}`}
                  className="w-full"
                >
                  <Button variant="outline" size="sm" className="w-full text-xs" leftIcon={<CalendarDays className="h-3.5 w-3.5 text-primary" />}>
                    Planning & Calendrier
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Leave Balances Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Soldes de congés en direct
              </CardTitle>
              <CardDescription>
                Calculé à date par le moteur d&apos;acquisition statutaire.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {balances ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <div className="text-xs text-primary font-medium">Solde annuel net disponible</div>
                    <div className="text-2xl font-bold text-primary">
                      {balances.remainingPaidBalance} <span className="text-sm font-normal">jours</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-border/60">
                      <span className="text-muted-foreground">Droits acquis cumulés :</span>
                      <span className="font-semibold text-foreground">{balances.accruedDays} j</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-border/60">
                      <span className="text-muted-foreground">Congés déjà pris :</span>
                      <span className="font-semibold text-foreground">{balances.takenApprovedDays} j</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-border/60">
                      <span className="text-muted-foreground">Demandes en attente :</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {balances.pendingDays} j
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-muted-foreground">Crédits fériés récupérables :</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {balances.recoveryCreditsRemaining} j
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic py-2 text-center">
                  Soldes en cours d&apos;actualisation...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <AbsenceModalForm
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setSuccessMessage("La demande d'absence a été modifiée.");
          triggerRefresh();
        }}
        mode="edit"
        initialData={absence}
      />

      {/* Approve Dialog */}
      <ApproveAbsenceDialog
        isOpen={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        onSuccess={(updated) => {
          const status = updated?.status ?? "APPROVED";
          setSuccessMessage(`La demande #${absence.id} a été validée avec succès. Statut confirmé par le serveur : ${status}.`);
          triggerRefresh();
        }}
        absence={absence}
      />

      {/* Reject Dialog */}
      <RejectAbsenceDialog
        isOpen={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onSuccess={(updated) => {
          const status = updated?.status ?? "REJECTED";
          setSuccessMessage(`La demande #${absence.id} a été refusée. Statut confirmé par le serveur : ${status}.`);
          triggerRefresh();
        }}
        absence={absence}
      />

      {/* Cancel Dialog */}
      <CancelAbsenceDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onSuccess={(updated) => {
          const status = updated?.status ?? "CANCELLED";
          setSuccessMessage(`La demande #${absence.id} a été annulée. Statut confirmé par le serveur : ${status}.`);
          triggerRefresh();
        }}
        absence={absence}
      />
    </PageContainer>
  );
}

export default function AbsenceDetailsPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="space-y-6 animate-pulse">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-10 w-64 bg-muted rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-48 bg-muted rounded-xl" />
                <div className="h-48 bg-muted rounded-xl" />
              </div>
              <div className="space-y-6">
                <div className="h-64 bg-muted rounded-xl" />
                <div className="h-48 bg-muted rounded-xl" />
              </div>
            </div>
          </div>
        </PageContainer>
      }
    >
      <AbsenceDetailsContent />
    </React.Suspense>
  );
}

