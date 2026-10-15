"use client";

import * as React from "react";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck2,
  FileX2,
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
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  if (!absence) return null;

  const isPending = absence.status === "PENDING";
  const isApproved = absence.status === "APPROVED";
  const isRejected = absence.status === "REJECTED";
  const isCancelled = absence.status === "CANCELLED";

  const start = formatDate(absence.startDate);
  const end = formatDate(absence.endDate);
  const workingDays = Number(absence.retainedDays || absence.calculatedWorkingDays);
  const calendarDays = Number(absence.enteredDays);

  const handleCancel = async () => {
    setIsCancelling(true);
    setError(null);
    try {
      await PortalApiClient.cancelMyRequest(absence.id, cancelReason);
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
              <DialogTitle>Détail de votre demande #{absence.id}</DialogTitle>
              <DialogDescription>
                Soumise le {formatDate(absence.requestDate)}
              </DialogDescription>
            </div>
          </div>
          <StatusBadge status={absence.status} size="md" />
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
              <Clock className="h-4 w-4" />
              <span>Demande en attente d&apos;arbitrage managérial ou RH</span>
            </div>
          )}
          {isApproved && (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Congé approuvé et décompté de votre solde</span>
            </div>
          )}
          {isRejected && (
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold">
              <XCircle className="h-4 w-4" />
              <span>Demande refusée par les Ressources Humaines</span>
            </div>
          )}
          {isCancelled && (
            <div className="flex items-center gap-2 text-muted-foreground font-semibold">
              <AlertTriangle className="h-4 w-4" />
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
                style={{ backgroundColor: absence.type.colorHex || "#3b82f6" }}
              />
              <span>{absence.type.name}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card space-y-1">
            <span className="text-muted-foreground">Motif statutaire</span>
            <div className="font-bold text-foreground text-sm">
              {absence.reason?.name || "Congé annuel payé"}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card space-y-1">
            <span className="text-muted-foreground">Période demandée</span>
            <div className="font-bold text-foreground text-sm">
              {start === end ? `Le ${start}` : `Du ${start} au ${end}`}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {absence.fraction === "FULL_DAY" ? "Journée entière" : "Demi-journée"}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
            <span className="text-primary font-medium">Jours ouvrés décomptés</span>
            <div className="font-extrabold text-primary text-base">
              {workingDays} <span className="text-xs font-normal">jours</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              ({calendarDays} j. calendaires)
            </div>
          </div>
        </div>

        {/* Supporting Document */}
        <div className="p-3 rounded-xl border border-border bg-card text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            {absence.supportingDocumentProvided ? (
              <FileCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <FileX2 className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-foreground">
              Justificatif : {absence.supportingDocumentProvided ? "Fourni et enregistré" : "Aucun justificatif déclaré"}
            </span>
          </div>
        </div>

        {/* Comment */}
        {absence.comment && (
          <div className="space-y-1 text-xs">
            <span className="text-muted-foreground font-medium">Votre note :</span>
            <div className="p-2.5 rounded-lg border border-border bg-muted/20 text-foreground">
              {absence.comment}
            </div>
          </div>
        )}

        {/* Rejection justification if rejected */}
        {isRejected && absence.rejectionReason && (
          <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-rose-600" />
              Motif du refus administratif :
            </div>
            <p>{absence.rejectionReason}</p>
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
              placeholder="Motif d'annulation optionnel (ex: changement de projet...)"
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
        {isPending && !cancelConfirmOpen && (
          <Button
            variant="outline"
            onClick={() => setCancelConfirmOpen(true)}
            className="text-xs text-muted-foreground hover:text-destructive hover:border-destructive mr-auto"
          >
            Annuler cette demande
          </Button>
        )}
        <Button variant="outline" onClick={onClose} className="text-xs">
          Fermer
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
