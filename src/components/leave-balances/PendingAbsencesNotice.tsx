"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeAlert } from "lucide-react";
import { formatLeaveDays } from "@/src/lib/utils";

export interface PendingAbsencesNoticeProps {
  employeeId: string;
  pendingAbsencesCount: number;
  pendingDays: number;
  netAvailableBalance: number;
}

export function PendingAbsencesNotice({
  employeeId,
  pendingAbsencesCount,
  pendingDays,
  netAvailableBalance,
}: PendingAbsencesNoticeProps) {
  if (pendingDays <= 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
          <BadgeAlert className="h-4 w-4" />
        </div>
        <div>
          <span className="font-bold text-amber-900 dark:text-amber-300">
            Demandes en attente de validation hiérarchique : {formatLeaveDays(pendingDays, { mode: "full" })} (
            {pendingAbsencesCount} demande
            {pendingAbsencesCount > 1 ? "s" : ""})
          </span>
          <p className="text-amber-800/80 dark:text-amber-400/80 mt-0.5">
            Attention : Ce volume n&apos;est PAS encore décompté du Solde Net Disponible (
            {formatLeaveDays(netAvailableBalance, { mode: "full" })}). Les jours ne seront
            imputés sur le solde qu&apos;après validation formelle.
          </p>
        </div>
      </div>
      <Link
        href={`/absences?search=${encodeURIComponent(
          employeeId
        )}&employeeId=${encodeURIComponent(employeeId)}&status=PENDING`}
        className="inline-flex items-center justify-center font-medium transition-all select-none shrink-0 border border-amber-500/30 bg-card text-amber-900 dark:text-amber-300 hover:bg-amber-500/20 shadow-xs h-7 px-2.5 text-xs rounded-sm"
      >
        Examiner les demandes
      </Link>
    </div>
  );
}
