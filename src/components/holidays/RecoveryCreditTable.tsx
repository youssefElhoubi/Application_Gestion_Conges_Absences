"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock,
  Edit2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { HolidayWorkCreditItem } from "@/src/lib/api/holiday-client";
import { formatDate } from "@/src/lib/utils";

export interface RecoveryCreditTableProps {
  credits: HolidayWorkCreditItem[];
  isLoading?: boolean;
  onCorrect?: (credit: HolidayWorkCreditItem) => void;
  onDelete?: (credit: HolidayWorkCreditItem) => void;
}

export function RecoveryCreditTable({
  credits,
  isLoading = false,
  onCorrect,
  onDelete,
}: RecoveryCreditTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (credits.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center space-y-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Clock className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          Aucun crédit de récupération trouvé
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Aucun crédit de jour férié travaillé n&apos;a été octroyé selon les filtres sélectionnés.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
      {/* Mobile view: Stacked cards */}
      <div className="block md:hidden divide-y divide-border/60">
        {credits.map((c) => {
          const credited = Number(c.creditedDays);
          const consumed = Number(c.consumedDays);
          const remaining = Math.max(0, credited - consumed);
          const isConsumed = c.isFullyConsumed || consumed >= credited;

          return (
            <div key={String(c.id)} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <Link
                    href={`/employees?search=${c.employeeId}`}
                    className="font-bold text-sm text-foreground hover:text-primary transition-colors hover:underline block"
                  >
                    {c.employee.fullName}
                  </Link>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-mono text-[11px]">({c.employeeId})</span>
                    {c.employee.site?.name && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted">
                        {c.employee.site.name}
                      </span>
                    )}
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={
                    isConsumed
                      ? "bg-muted text-muted-foreground border-border text-[11px]"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[11px]"
                  }
                >
                  {isConsumed ? "Totalement consommé" : `${remaining} j dispo`}
                </Badge>
              </div>

              {/* Holiday information link */}
              <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground">Jour férié légal travaillé :</span>
                  <Link
                    href={`/holidays/${c.publicHolidayId}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors hover:underline block"
                  >
                    {c.publicHoliday?.label || "Jour férié"}
                  </Link>
                </div>
                {c.publicHoliday?.date && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {formatDate(c.publicHoliday.date)}
                  </span>
                )}
              </div>

              {c.comment && (
                <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/10 p-2 rounded-lg italic">
                  &ldquo;{c.comment}&rdquo;
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <div>
                  <span className="font-bold text-foreground">{credited} j</span>
                  <span className="text-muted-foreground text-[11px] ml-1">
                    accordé(s) ({consumed} j pris)
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {onCorrect && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCorrect(c)}
                      className="h-8 w-8 p-0"
                      title="Ajuster le crédit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && !isConsumed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(c)}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop view: Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/60">
            <tr>
              <th className="py-3.5 px-5">Collaborateur</th>
              <th className="py-3.5 px-5">Jour férié travaillé d&apos;origine</th>
              <th className="py-3.5 px-5 text-center">Crédit octroyé</th>
              <th className="py-3.5 px-5 text-center">Consommé</th>
              <th className="py-3.5 px-5">Statut de disponibilité</th>
              <th className="py-3.5 px-5">Commentaire / Justification</th>
              <th className="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {credits.map((c) => {
              const credited = Number(c.creditedDays);
              const consumed = Number(c.consumedDays);
              const remaining = Math.max(0, credited - consumed);
              const isConsumed = c.isFullyConsumed || consumed >= credited;

              return (
                <tr key={String(c.id)} className="hover:bg-muted/10 transition-colors">
                  {/* Collaborateur */}
                  <td className="py-4 px-5">
                    <Link
                      href={`/employees?search=${c.employeeId}`}
                      className="font-bold text-foreground hover:text-primary transition-colors hover:underline text-sm block"
                    >
                      {c.employee.fullName}
                    </Link>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mt-0.5">
                      <span className="font-mono">{c.employeeId}</span>
                      {c.employee.site?.name && (
                        <span>• {c.employee.site.name}</span>
                      )}
                    </div>
                  </td>

                  {/* Jour férié travaillé */}
                  <td className="py-4 px-5">
                    <Link
                      href={`/holidays/${c.publicHolidayId}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors hover:underline text-xs flex items-center gap-1.5"
                    >
                      <span>{c.publicHoliday?.label || "Jour férié légal"}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </Link>
                    {c.publicHoliday?.date && (
                      <span className="text-[11px] text-muted-foreground font-mono mt-0.5 block">
                        {formatDate(c.publicHoliday.date)}
                      </span>
                    )}
                  </td>

                  {/* Crédit octroyé */}
                  <td className="py-4 px-5 text-center font-bold text-foreground whitespace-nowrap">
                    {credited.toFixed(2)} j
                  </td>

                  {/* Consommé */}
                  <td className="py-4 px-5 text-center text-muted-foreground whitespace-nowrap">
                    {consumed.toFixed(2)} j
                  </td>

                  {/* Statut disponibilité */}
                  <td className="py-4 px-5 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={
                        isConsumed
                          ? "bg-muted text-muted-foreground border-border"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                      }
                    >
                      {isConsumed ? "Totalement consommé" : `${remaining.toFixed(2)} j disponible(s)`}
                    </Badge>
                  </td>

                  {/* Commentaire */}
                  <td className="py-4 px-5 text-muted-foreground max-w-xs truncate">
                    {c.comment || "—"}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {onCorrect && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onCorrect(c)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Ajuster le crédit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {onDelete && !isConsumed && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(c)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          title="Supprimer / Révoquer le crédit"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
