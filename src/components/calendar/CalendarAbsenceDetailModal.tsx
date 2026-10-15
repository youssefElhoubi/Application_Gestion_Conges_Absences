"use client";

import * as React from "react";
import Link from "next/link";
import {
  User,
  Calendar,
  CalendarDays,
  ExternalLink,
  Sun,
  Moon,
  Building2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  Tag,
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
import { CalendarAbsenceEvent } from "@/src/lib/calendar/calendar-events";
import { formatDate } from "@/src/lib/utils";

export interface CalendarAbsenceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarAbsenceEvent | null;
}

export function CalendarAbsenceDetailModal({
  isOpen,
  onClose,
  event,
}: CalendarAbsenceDetailModalProps) {
  if (!event) return null;

  const retainedWorkingDays = Number(
    event.retainedDays || event.calculatedWorkingDays || event.enteredDays || 0
  );

  const isApproved = event.status === "APPROVED";
  const isPending = event.status === "PENDING";
  const isRejected = event.status === "REJECTED";

  const StatusIcon = isApproved
    ? CheckCircle2
    : isPending
    ? Clock
    : isRejected
    ? XCircle
    : Ban;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <DialogHeader>
        <div className="flex items-center justify-between gap-3 pr-6">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl text-primary shrink-0"
              style={{
                backgroundColor: `${event.typeColor}20`,
                color: event.typeColor,
              }}
            >
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Détail de l&apos;Absence
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Demande n° {event.absenceId}
              </DialogDescription>
            </div>
          </div>

          <StatusBadge status={event.status} label={event.statusLabelFr} />
        </div>
      </DialogHeader>

      <div className="space-y-3.5 py-1 text-xs">
        {/* 1. Collaborateur Card */}
        <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Collaborateur concerné
            </span>

            <Link
              href={`/employees/${encodeURIComponent(event.employeeId)}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
              title="Consulter le profil et le solde de congés du collaborateur"
            >
              <span>Fiche Collaborateur</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex items-start justify-between gap-2 pt-1">
            <div>
              <h4 className="font-bold text-sm text-foreground">{event.employeeName}</h4>
              <p className="text-muted-foreground font-mono text-[11px] mt-0.5">
                Matricule: {event.employeeId}
              </p>
            </div>

            {event.employeeSiteName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border text-[11px] font-medium">
                <Building2 className="h-3 w-3 text-muted-foreground/70" />
                {event.employeeSiteName}
              </span>
            )}
          </div>
        </div>

        {/* 2. Absence Metadata Card */}
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
          <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-primary" />
            Paramètres statutaires
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Type */}
            <div className="space-y-1">
              <span className="text-muted-foreground text-[11px]">Type de congé:</span>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: event.typeColor }}
                />
                <span className="font-semibold">{event.typeName}</span>
              </div>
              <span className="inline-block text-[10px] font-medium text-muted-foreground">
                {event.isDeductible ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    • Déductible du solde annuel
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    • Non déductible (autorisation légale)
                  </span>
                )}
              </span>
            </div>

            {/* Motif légal (only where authorized) */}
            {event.reasonName && (
              <div className="space-y-1">
                <span className="text-muted-foreground text-[11px]">Motif statutaire:</span>
                <p className="font-semibold text-foreground">{event.reasonName}</p>
              </div>
            )}

            {/* Période */}
            <div className="space-y-1">
              <span className="text-muted-foreground text-[11px]">Période d&apos;absence:</span>
              <p className="font-semibold text-foreground">
                {event.startDateKey === event.endDateKey
                  ? formatDate(event.startDateKey)
                  : `${formatDate(event.startDateKey)} au ${formatDate(event.endDateKey)}`}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">
                Durée: {String(event.enteredDays)} jour(s) calendaire(s)
              </p>
            </div>

            {/* Fraction & Décompte */}
            <div className="space-y-1">
              <span className="text-muted-foreground text-[11px]">Décompte ouvrable (Loi 65-99):</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground text-sm">
                  {retainedWorkingDays} jour{retainedWorkingDays > 1 ? "s" : ""}
                </span>
                {event.isHalfDay && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                    {event.fraction === "HALF_DAY_MORNING" ? (
                      <Sun className="h-3 w-3 text-amber-500" />
                    ) : (
                      <Moon className="h-3 w-3 text-indigo-500" />
                    )}
                    {event.fractionLabelFr}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">
                Jours ouvrés retenus déduits du solde
              </span>
            </div>
          </div>
        </div>

        {/* 3. Privacy & Compliance Notice */}
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/[0.03] text-muted-foreground text-[11px] flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p>
            Conformément aux règles de confidentialité RH, les justificatifs médicaux, les
            commentaires personnels et l&apos;audit détaillé des approbations sont consultables
            exclusivement sur le dossier de la demande.
          </p>
        </div>
      </div>

      <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 pt-3 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="w-full sm:w-auto text-xs"
        >
          Fermer
        </Button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href={`/employees/${encodeURIComponent(event.employeeId)}`}
            className="w-full sm:w-auto"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<User className="h-3.5 w-3.5" />}
              className="w-full sm:w-auto text-xs"
            >
              Fiche Collaborateur
            </Button>
          </Link>

          <Link href={`/absences/${event.absenceId}`} className="w-full sm:w-auto">
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<FileText className="h-3.5 w-3.5" />}
              rightIcon={<ExternalLink className="h-3 w-3" />}
              className="w-full sm:w-auto text-xs font-semibold"
            >
              Voir la Demande
            </Button>
          </Link>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
