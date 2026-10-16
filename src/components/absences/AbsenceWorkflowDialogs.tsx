"use client";

import * as React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Calendar, User, Clock } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Alert } from "@/src/components/feedback/Alert";
import { AbsenceApiClient, AbsenceListItem, AbsenceDetail } from "@/src/lib/api/absence-client";

interface WorkflowDialogBaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated?: AbsenceListItem) => void;
  absence: AbsenceListItem | AbsenceDetail | null;
}

/**
 * Dialog for approving a pending absence request
 */
export function ApproveAbsenceDialog({
  isOpen,
  onClose,
  onSuccess,
  absence,
}: WorkflowDialogBaseProps) {
  const [comment, setComment] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setComment("");
      setError(null);
    }
  }, [isOpen]);

  if (!absence) return null;

  const handleApprove = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const updated = await AbsenceApiClient.approveAbsence(absence.id, comment);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'approbation.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={isLoading ? () => {} : onClose} size="sm">
      <DialogHeader>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>Approuver la demande d&apos;absence</DialogTitle>
            <DialogDescription>
              Valider statutairement cette demande de congé.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {error && (
          <Alert variant="destructive" title="Erreur">
            {error}
          </Alert>
        )}

        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <User className="h-4 w-4" /> Collaborateur:
            </span>
            <span className="font-semibold text-foreground">{absence.employee.fullName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> Type:
            </span>
            <span className="font-medium text-foreground">{absence.type.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Durée retenue:
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {Number(absence.retainedDays || absence.calculatedWorkingDays)} jour(s) ouvré(s)
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="approve-comment" className="block text-xs font-medium text-foreground mb-1.5">
            Commentaire de validation (optionnel)
          </label>
          <textarea
            id="approve-comment"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ex: Demande conforme, solde vérifié..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isLoading}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          onClick={handleApprove}
          isLoading={isLoading}
          disabled={isLoading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Valider la demande
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/**
 * Dialog for rejecting a pending absence request (mandatory reason)
 */
export function RejectAbsenceDialog({
  isOpen,
  onClose,
  onSuccess,
  absence,
}: WorkflowDialogBaseProps) {
  const [reason, setReason] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  if (!absence) return null;

  const handleReject = async () => {
    if (isLoading) return;
    if (!reason.trim() || reason.trim().length < 3) {
      setError("Le motif de refus est obligatoire (minimum 3 caractères).");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const updated = await AbsenceApiClient.rejectAbsence(absence.id, reason.trim());
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du refus.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={isLoading ? () => {} : onClose} size="sm">
      <DialogHeader>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>Rejeter la demande d&apos;absence</DialogTitle>
            <DialogDescription>
              Cette action est définitive et notifiera le collaborateur.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {error && (
          <Alert variant="destructive" title="Erreur">
            {error}
          </Alert>
        )}

        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <User className="h-4 w-4" /> Collaborateur:
            </span>
            <span className="font-semibold text-foreground">{absence.employee.fullName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> Dates:
            </span>
            <span className="font-medium text-foreground">
              {new Date(absence.startDate).toLocaleDateString("fr-FR")} au{" "}
              {new Date(absence.endDate).toLocaleDateString("fr-FR")}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="reject-reason" className="block text-xs font-medium text-foreground mb-1.5">
            Motif de rejet obligatoire <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="reject-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Ex: Charge de travail incompatible avec la période, effectif insuffisant..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isLoading}
            required
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Ce motif sera consigné dans l&apos;historique d&apos;approbation statutaire.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          variant="destructive"
          onClick={handleReject}
          isLoading={isLoading}
          disabled={isLoading || reason.trim().length < 3}
        >
          Rejeter la demande
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/**
 * Dialog for cancelling an absence request
 */
export function CancelAbsenceDialog({
  isOpen,
  onClose,
  onSuccess,
  absence,
}: WorkflowDialogBaseProps) {
  const [reason, setReason] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  if (!absence) return null;

  const handleCancel = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const updated = await AbsenceApiClient.cancelAbsence(absence.id, reason.trim());
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'annulation.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={isLoading ? () => {} : onClose} size="sm">
      <DialogHeader>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>Annuler la demande d&apos;absence</DialogTitle>
            <DialogDescription>
              La demande sera passée au statut Annulée.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {error && (
          <Alert variant="destructive" title="Erreur">
            {error}
          </Alert>
        )}

        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Collaborateur:</span>
            <span className="font-semibold text-foreground">{absence.employee.fullName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Période:</span>
            <span className="font-medium text-foreground">
              {new Date(absence.startDate).toLocaleDateString("fr-FR")} au{" "}
              {new Date(absence.endDate).toLocaleDateString("fr-FR")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Statut actuel:</span>
            <span className="font-medium text-foreground">{absence.status}</span>
          </div>
        </div>

        <div>
          <label htmlFor="cancel-reason" className="block text-xs font-medium text-foreground mb-1.5">
            Motif d&apos;annulation (optionnel)
          </label>
          <textarea
            id="cancel-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Demande retirée par le collaborateur, modification des plannings..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isLoading}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Fermer
        </Button>
        <Button
          variant="destructive"
          onClick={handleCancel}
          isLoading={isLoading}
          disabled={isLoading}
        >
          Confirmer l&apos;annulation
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

