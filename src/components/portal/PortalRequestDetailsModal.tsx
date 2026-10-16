"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck2,
  FileX2,
  History,
  ExternalLink,
  PlusCircle,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { AbsenceListItem, AbsenceDetail } from "@/src/lib/api/absence-client";
import { PortalApiClient } from "@/src/lib/api/portal-client";
import { formatDate } from "@/src/lib/utils";

export interface PortalRequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  absence: AbsenceListItem | AbsenceDetail | null;
  onCancelSuccess?: () => void;
}

export function PortalRequestDetailsModal({
  isOpen,
  onClose,
  absence,
  onCancelSuccess,
}: PortalRequestDetailsModalProps) {
  const [detail, setDetail] = React.useState<AbsenceDetail | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Fetch full details (with approval history) whenever the modal is opened
  React.useEffect(() => {
    let isMounted = true;
    if (isOpen && absence?.id) {
      PortalApiClient.getMyRequest(absence.id)
        .then((data) => {
          if (isMounted) setDetail(data);
        })
        .catch(() => {
          // Fall back gracefully to the passed absence
        });
    } else {
      setDetail(null);
      setCancelConfirmOpen(false);
      setCancelReason("");
      setError(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, absence?.id]);

  if (!absence) return null;

  const currentAbsence = detail ?? absence;
  const isPending = currentAbsence.status === "PENDING";
  const isApproved = currentAbsence.status === "APPROVED";
  const isRejected = currentAbsence.status === "REJECTED";
  const isCancelled = currentAbsence.status === "CANCELLED";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const absenceStartDate = new Date(currentAbsence.startDate);
  absenceStartDate.setHours(0, 0, 0, 0);

  const isFutureApproved = isApproved && absenceStartDate > today;
  const isStartedApproved = isApproved && absenceStartDate <= today;
  const canCancel = isPending || isFutureApproved;

  const start = formatDate(currentAbsence.startDate);
  const end = formatDate(currentAbsence.endDate);
  const workingDays = Number(currentAbsence.retainedDays || currentAbsence.calculatedWorkingDays);
  const calendarDays = Number(currentAbsence.enteredDays);

  const handleCancel = async () => {
    setIsCancelling(true);
    setError(null);
    try {
      await PortalApiClient.cancelMyRequest(currentAbsence.id, cancelReason);
      setCancelConfirmOpen(false);
      if (onCancelSuccess) onCancelSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'annulation.";
      setError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <div>
              <DialogTitle>Détail de votre demande #{currentAbsence.id}</DialogTitle>
              <DialogDescription>
                Soumise le {formatDate(currentAbsence.requestDate || currentAbsence.createdAt)}
              </DialogDescription>
            </div>
          </div>
          <StatusBadge status={currentAbsence.status} size="md" />
        </div>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Status Explanation Card */}
        <div className="p-3.5 rounded-xl border border-border bg-muted/30 text-xs space-y-1">
          {isPending && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Demande en attente d&apos;arbitrage managérial ou RH</span>
            </div>
          )}
          {isApproved && (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Congé validé et décompté de votre solde</span>
            </div>
          )}
          {isRejected && (
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>Demande refusée par les Ressources Humaines</span>
            </div>
          )}
          {isCancelled && (
            <div className="flex items-center gap-2 text-muted-foreground font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Demande clôturée et annulée</span>
            </div>
          )}
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-border bg-card space-y-1">
            <span className="text-muted-foreground">Type d&apos;absence</span>
            <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: currentAbsence.type?.colorHex || "#3b82f6" }}
              />
              <span className="truncate">{currentAbsence.type?.name || "Absence"}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {currentAbsence.type?.isDeductible ? "Déductible du solde annuel" : "Non déductible"}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card space-y-1">
            <span className="text-muted-foreground">Motif statutaire</span>
            <div className="font-bold text-foreground text-sm truncate">
              {currentAbsence.reason?.name || "Congé annuel standard"}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card space-y-1">
            <span className="text-muted-foreground">Période demandée</span>
            <div className="font-bold text-foreground text-sm">
              {start === end ? `Le ${start}` : `Du ${start} au ${end}`}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {currentAbsence.fraction === "FULL_DAY"
                ? "Journée entière"
                : currentAbsence.fraction === "HALF_DAY_MORNING"
                ? "Demi-journée (Matin)"
                : "Demi-journée (Après-midi)"}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
            <span className="text-primary font-medium">Jours ouvrés retenus</span>
            <div className="font-extrabold text-primary text-base">
              {workingDays} <span className="text-xs font-normal">jours</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              ({calendarDays} j. calendaires)
            </div>
          </div>
        </div>

        {/* Supporting Document Status */}
        <div className="p-3 rounded-xl border border-border bg-card text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentAbsence.supportingDocumentProvided ? (
              <FileCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <FileX2 className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="text-foreground">
              Justificatif : {currentAbsence.supportingDocumentProvided ? "Fourni et enregistré au dossier RH" : "Aucun justificatif déclaré"}
            </span>
          </div>
        </div>

        {/* Comment */}
        {currentAbsence.comment && (
          <div className="space-y-1 text-xs">
            <span className="text-muted-foreground font-medium">Votre note :</span>
            <div className="p-2.5 rounded-lg border border-border bg-muted/20 text-foreground">
              {currentAbsence.comment}
            </div>
          </div>
        )}

        {/* Rejection justification if rejected */}
        {isRejected && currentAbsence.rejectionReason && (
          <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
              Motif du refus administratif :
            </div>
            <p>{currentAbsence.rejectionReason}</p>
          </div>
        )}

        {/* Audit Trail Timeline */}
        {detail?.approvalHistory && detail.approvalHistory.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/60">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-primary" />
              Historique des actions
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {detail.approvalHistory.map((h) => (
                <div key={h.id} className="p-2 rounded-lg border border-border/60 bg-muted/20 text-xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {h.action === "SUBMITTED" && "Demande transmise"}
                      {h.action === "APPROVED" && "Demande approuvée"}
                      {h.action === "REJECTED" && "Demande refusée"}
                      {h.action === "CANCELLED" && "Demande annulée"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{formatDate(h.createdAt)}</span>
                  </div>
                  {h.comment && (
                    <p className="text-[11px] text-muted-foreground italic">&ldquo;{h.comment}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informative notice for started approved leaves */}
        {isStartedApproved && (
          <div className="p-3 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>Ce congé a déjà débuté ou est passé. Toute régularisation nécessite l&apos;intervention du service RH.</span>
          </div>
        )}

        {/* Cancellation inline confirmation dialog */}
        {cancelConfirmOpen && (
          <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2 text-xs">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Êtes-vous sûr de vouloir annuler cette demande de congé ?
            </p>
            <input
              type="text"
              placeholder="Motif d'annulation optionnel (ex: changement d'agenda...)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none"
            />
            <div className="flex items-center gap-2 justify-end pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelConfirmOpen(false)}
                disabled={isCancelling}
                className="h-7 text-xs"
              >
                Garder ma demande
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancel}
                isLoading={isCancelling}
                className="h-7 text-xs"
              >
                Confirmer l&apos;annulation
              </Button>
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Link
          href={`/portal/requests/${currentAbsence.id}`}
          onClick={onClose}
          className="text-xs text-primary hover:underline flex items-center gap-1 mr-auto font-medium"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Fiche complète
        </Link>

        {canCancel && !cancelConfirmOpen && (
          <Button
            variant="outline"
            onClick={() => setCancelConfirmOpen(true)}
            className="text-xs text-muted-foreground hover:text-destructive hover:border-destructive"
          >
            Annuler cette demande
          </Button>
        )}

        {(isRejected || isCancelled) && (
          <Link href="/portal/requests/new" onClick={onClose}>
            <Button size="sm" variant="outline" className="text-xs flex items-center gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              Nouvelle demande
            </Button>
          </Link>
        )}

        <Button variant="outline" onClick={onClose} className="text-xs">
          Fermer
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
