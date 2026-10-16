"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck2,
  FileX2,
  History,
  Info,
  RotateCcw,
  PlusCircle,
  Send,
  Building2,
  Calendar,
  Edit2,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { Button } from "@/src/components/ui/button";
import { Alert } from "@/src/components/feedback/Alert";
import { ErrorState } from "@/src/components/feedback/ErrorState";
import {
  PortalApiClient,
  PortalProfileData,
} from "@/src/lib/api/portal-client";
import { AbsenceDetail } from "@/src/lib/api/absence-client";
import { AbsenceModalForm } from "@/src/components/absences/AbsenceModalForm";
import { formatDate } from "@/src/lib/utils";

function RequestDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [absence, setAbsence] = React.useState<AbsenceDetail | null>(null);
  const [profileData, setProfileData] = React.useState<PortalProfileData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Edit and cancellation state
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [absenceData, profile] = await Promise.all([
        PortalApiClient.getMyRequest(id),
        PortalApiClient.getPortalData().catch(() => null),
      ]);
      setAbsence(absenceData);
      setProfileData(profile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement de la demande.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absence || isCancelling) return;

    setIsCancelling(true);
    try {
      await PortalApiClient.cancelMyRequest(absence.id, cancelReason);
      setCancelOpen(false);
      setCancelSuccessMsg("Votre demande d'absence a été annulée avec succès.");
      // Reload updated request data
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Échec de l'annulation.";
      setError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-6 w-36 bg-muted/60 rounded-md" />
          <div className="h-32 bg-muted/40 rounded-2xl border border-border" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 h-72 bg-muted/30 rounded-2xl border border-border" />
            <div className="h-72 bg-muted/30 rounded-2xl border border-border" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !absence) {
    return (
      <PageContainer>
        <div className="max-w-3xl mx-auto space-y-4">
          <Link
            href="/portal/requests"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à mes demandes
          </Link>
          <ErrorState
            title="Demande introuvable ou accès non autorisé"
            message={error || "Cette demande d'absence n'existe pas ou vous n'avez pas l'autorisation d'y accéder."}
            onRetry={loadData}
          />
        </div>
      </PageContainer>
    );
  }

  const isPending = absence.status === "PENDING";
  const isApproved = absence.status === "APPROVED";
  const isRejected = absence.status === "REJECTED";
  const isCancelled = absence.status === "CANCELLED";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const absenceStartDate = new Date(absence.startDate);
  absenceStartDate.setHours(0, 0, 0, 0);

  const isFutureApproved = isApproved && absenceStartDate > today;
  const isStartedApproved = isApproved && absenceStartDate <= today;
  const canCancel = isPending || isFutureApproved;

  const startFormatted = formatDate(absence.startDate);
  const endFormatted = formatDate(absence.endDate);
  const workingDays = Number(absence.retainedDays || absence.calculatedWorkingDays);
  const calendarDays = Number(absence.enteredDays);

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link
            href="/portal/requests"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à mes demandes
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Réf: #{absence.id}</span>
            <StatusBadge status={absence.status} size="md" />
          </div>
        </div>

        {cancelSuccessMsg && (
          <Alert
            variant="success"
            title="Annulation confirmée"
            onDismiss={() => setCancelSuccessMsg(null)}
          >
            {cancelSuccessMsg}
          </Alert>
        )}

        {/* Top Banner: Status & Overview */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3.5">
              <div
                className="w-4 h-14 rounded-full shrink-0"
                style={{ backgroundColor: absence.type?.colorHex || "#3b82f6" }}
              />
              <div>
                <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <span>{absence.type?.name || "Demande d'absence"}</span>
                  {absence.reason && (
                    <span className="text-sm font-normal text-muted-foreground">
                      • {absence.reason.name}
                    </span>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Demande #{absence.id} déposée le {formatDate(absence.requestDate || absence.createdAt)}
                </p>
              </div>
            </div>

            <div className="text-left md:text-right">
              <div className="text-2xl font-extrabold text-primary">
                {workingDays} <span className="text-sm font-semibold">jours ouvrés</span>
              </div>
              <div className="text-xs text-muted-foreground">
                ({calendarDays} j. calendaires décomptés)
              </div>
            </div>
          </div>

          {/* Status Explanation Banner */}
          <div className="rounded-xl p-3.5 border text-xs">
            {isPending && (
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 border-amber-500/20 p-3 rounded-lg">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Cette demande est en attente d&apos;arbitrage managérial ou RH.</span>
              </div>
            )}
            {isApproved && (
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border-emerald-500/20 p-3 rounded-lg">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Demande approuvée. Les jours ouvrés correspondants ont été décomptés de votre solde.</span>
              </div>
            )}
            {isRejected && (
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 border-rose-500/20 p-3 rounded-lg">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>Demande refusée par le service des Ressources Humaines.</span>
              </div>
            )}
            {isCancelled && (
              <div className="flex items-center gap-2.5 text-muted-foreground font-semibold bg-muted/40 border-border p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Demande clôturée et annulée. Aucun jour de congé n&apos;est décompté.</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Layout: Details & Side Column */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Period & Breakdown Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Période et décompte statutaire
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span className="text-muted-foreground">Dates de l&apos;absence</span>
                  <div className="font-bold text-foreground text-sm">
                    {startFormatted === endFormatted
                      ? `Le ${startFormatted}`
                      : `Du ${startFormatted} au ${endFormatted}`}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {absence.fraction === "FULL_DAY"
                      ? "Journée entière"
                      : absence.fraction === "HALF_DAY_MORNING"
                      ? "Demi-journée (Matinée)"
                      : "Demi-journée (Après-midi)"}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span className="text-muted-foreground">Impact sur solde</span>
                  <div className="font-bold text-foreground text-sm">
                    {absence.type?.isDeductible ? "Déductible du solde annuel" : "Non déductible"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Décompte officiel selon le code du travail marocain
                  </div>
                </div>
              </div>

              {/* Justification & Comment */}
              <div className="space-y-3 pt-2 border-t border-border/60 text-xs">
                <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card">
                  {absence.supportingDocumentProvided ? (
                    <FileCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <FileX2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground block">
                      {absence.supportingDocumentProvided
                        ? "Justificatif officiel fourni ou déclaré"
                        : "Aucun justificatif déclaré"}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      {absence.supportingDocumentProvided
                        ? "Document enregistré et rattaché à votre dossier RH."
                        : "Cette absence ne comporte pas de pièce justificative déclarée."}
                    </span>
                  </div>
                </div>

                {absence.comment && (
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                    <span className="font-semibold text-foreground block">Message / Note du collaborateur :</span>
                    <p className="text-muted-foreground italic">&ldquo;{absence.comment}&rdquo;</p>
                  </div>
                )}

                {isRejected && absence.rejectionReason && (
                  <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 space-y-1">
                    <span className="font-semibold flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      Motif du refus administratif :
                    </span>
                    <p className="text-xs">{absence.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Audit History Timeline */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Historique & Audit Trail
              </h2>

              {absence.approvalHistory && absence.approvalHistory.length > 0 ? (
                <div className="space-y-3">
                  {absence.approvalHistory.map((item, idx) => (
                    <div
                      key={item.id ?? idx}
                      className="p-3 rounded-xl border border-border/70 bg-muted/20 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          {item.action === "SUBMITTED" && (
                            <>
                              <Send className="h-3.5 w-3.5 text-primary" /> Demande soumise
                            </>
                          )}
                          {item.action === "APPROVED" && (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Demande validée
                            </>
                          )}
                          {item.action === "REJECTED" && (
                            <>
                              <XCircle className="h-3.5 w-3.5 text-rose-600" /> Demande refusée
                            </>
                          )}
                          {item.action === "CANCELLED" && (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" /> Demande annulée
                            </>
                          )}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>

                      {item.performedByUser?.role && (
                        <div className="text-[11px] text-muted-foreground">
                          Rôle intervenant : <span className="font-semibold text-foreground">{item.performedByUser.role}</span>
                        </div>
                      )}

                      {item.comment && (
                        <p className="text-[11px] text-muted-foreground italic bg-background/60 p-2 rounded-md border border-border/50">
                          &ldquo;{item.comment}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Aucun historique supplémentaire disponible pour cette demande.
                </p>
              )}
            </div>
          </div>

          {/* Side Column: Available Next Actions & Context */}
          <div className="space-y-6">
            {/* Actions Card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-foreground">Actions disponibles</h2>

              {canCancel ? (
                <div className="space-y-3 text-xs">
                  {isPending && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditModalOpen(true)}
                      className="w-full text-xs flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-primary" />
                      Modifier ma demande
                    </Button>
                  )}

                  {!cancelOpen ? (
                    <div>
                      <p className="text-muted-foreground mb-3">
                        {isPending
                          ? "Cette demande n'a pas encore été traitée. Vous pouvez l'annuler à tout moment."
                          : "Ce congé est validé mais n'a pas encore débuté. Vous pouvez l'annuler si vos projets ont changé."}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCancelOpen(true)}
                        className="w-full text-xs text-rose-600 dark:text-rose-400 hover:border-rose-500 hover:bg-rose-500/10"
                      >
                        Annuler cette demande
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleCancelRequest} className="space-y-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">
                        Confirmer l&apos;annulation de la demande
                      </p>
                      <div>
                        <label htmlFor="cancel-reason" className="block text-[11px] text-muted-foreground mb-1">
                          Motif d&apos;annulation (optionnel)
                        </label>
                        <input
                          id="cancel-reason"
                          type="text"
                          placeholder="Ex: report de congé, changement d'agenda..."
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          disabled={isCancelling}
                          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setCancelOpen(false)}
                          disabled={isCancelling}
                          className="w-1/2 text-xs h-8"
                        >
                          Garder
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          variant="destructive"
                          isLoading={isCancelling}
                          disabled={isCancelling}
                          className="w-1/2 text-xs h-8"
                        >
                          Confirmer
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              ) : isStartedApproved ? (
                <div className="text-xs text-muted-foreground space-y-2">
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/40 border border-border">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Ce congé approuvé est déjà en cours ou passé. Toute annulation nécessite une intervention directe de votre service RH.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground space-y-3">
                  <p>
                    Cette demande est clôturée avec le statut <span className="font-semibold">{absence.status}</span>. Aucune action de modification ou d&apos;annulation n&apos;est possible.
                  </p>
                  <Link href="/portal/requests/new" className="block">
                    <Button size="sm" variant="outline" className="w-full text-xs flex items-center justify-center gap-1.5">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Déposer une nouvelle demande
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Context Card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3 text-xs">
              <h3 className="font-bold text-foreground flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                Informations collaborateur
              </h3>
              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Matricule :</span>
                  <span className="font-medium text-foreground">{absence.employeeId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Site de rattachement :</span>
                  <span className="font-medium text-foreground">
                    {absence.employee?.site?.name || profileData?.employee?.site?.name || "Siège"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fraction :</span>
                  <span className="font-medium text-foreground">
                    {absence.fraction === "FULL_DAY" ? "Jour entier" : "Demi-journée"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Absence Modal */}
        <AbsenceModalForm
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={() => {
            setCancelSuccessMsg("Votre demande d'absence a été modifiée avec succès.");
            loadData();
          }}
          mode="edit"
          initialData={absence}
        />
      </div>
    </PageContainer>
  );
}

export default function PortalRequestDetailPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
            <div className="h-6 w-36 bg-muted/60 rounded-md" />
            <div className="h-32 bg-muted/40 rounded-2xl border border-border" />
          </div>
        </PageContainer>
      }
    >
      <RequestDetailContent />
    </React.Suspense>
  );
}
