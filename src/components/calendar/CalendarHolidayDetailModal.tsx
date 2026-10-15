"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Calendar,
  ExternalLink,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { CalendarHolidayEvent } from "@/src/lib/calendar/calendar-events";
import { formatDate } from "@/src/lib/utils";

export interface CalendarHolidayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  holiday: CalendarHolidayEvent | null;
}

export function CalendarHolidayDetailModal({
  isOpen,
  onClose,
  holiday,
}: CalendarHolidayDetailModalProps) {
  if (!holiday) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <DialogHeader>
        <div className="flex items-center gap-2.5 pr-6">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-foreground">
              {holiday.label}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Jour férié légal officiel (Maroc — Dahir n° 1-04-19)
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-3.5 py-1 text-xs">
        {/* Main Status & Classification Card */}
        <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/[0.04] space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              Statut réglementaire
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary/15 text-primary border border-primary/20">
              <Sparkles className="h-3 w-3" />
              {holiday.isReligious ? "Férié Légal Religieux" : "Férié Légal Civil"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            <div>
              <span className="text-muted-foreground text-[11px]">Date officielle:</span>
              <p className="font-bold text-foreground text-sm mt-0.5 capitalize">
                {formatDate(holiday.dateKey)}
              </p>
            </div>

            <div>
              <span className="text-muted-foreground text-[11px]">Régime de rémunération:</span>
              <p className="font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
                Chômé et payé (Loi n° 65-99)
              </p>
            </div>
          </div>
        </div>

        {/* Observation or Comment (if any) */}
        {holiday.comment && (
          <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Note réglementaire
            </span>
            <p className="text-xs text-foreground italic">{holiday.comment}</p>
          </div>
        )}

        {/* Holiday Work Credit Info Card */}
        <div className="p-3 rounded-xl border border-border bg-card space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>Permanences & Crédits de Récupération</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Les collaborateurs d&apos;astreinte ou ayant travaillé lors de ce jour férié chômé
            bénéficient d&apos;un crédit de récupération statutaire sans date d&apos;expiration.
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

        {holiday.holidayId && (
          <Link href={`/holidays/${holiday.holidayId}`} className="w-full sm:w-auto">
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Calendar className="h-3.5 w-3.5" />}
              rightIcon={<ExternalLink className="h-3 w-3" />}
              className="w-full sm:w-auto text-xs font-semibold"
            >
              Fiche du Jour Férié
            </Button>
          </Link>
        )}
      </DialogFooter>
    </Dialog>
  );
}
