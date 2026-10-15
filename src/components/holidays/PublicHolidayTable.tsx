"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Edit2,
  Trash2,
  ExternalLink,
  Users,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PublicHolidayItem } from "@/src/lib/api/holiday-client";
import { formatDate } from "@/src/lib/utils";

export interface PublicHolidayTableProps {
  holidays: PublicHolidayItem[];
  isLoading?: boolean;
  onEdit?: (holiday: PublicHolidayItem) => void;
  onDelete?: (holiday: PublicHolidayItem) => void;
}

export function PublicHolidayTable({
  holidays,
  isLoading = false,
  onEdit,
  onDelete,
}: PublicHolidayTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (holidays.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center space-y-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CalendarDays className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          Aucun jour férié trouvé
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Aucun jour férié légal ne correspond aux critères de filtre sélectionnés pour cette période.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
      {/* Mobile view: Stacked cards */}
      <div className="block md:hidden divide-y divide-border/60">
        {holidays.map((h) => {
          const creditCount = h._count?.holidayWorkCredits ?? 0;
          return (
            <div key={String(h.id)} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/holidays/${h.id}`}
                      className="font-bold text-sm text-foreground hover:text-primary transition-colors hover:underline"
                    >
                      {h.label}
                    </Link>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-foreground">{formatDate(h.date)}</span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={
                    h.isReligious
                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 text-[11px]"
                      : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-[11px]"
                  }
                >
                  {h.isReligious ? "Religieux" : "Civil"}
                </Badge>
              </div>

              {h.comment && (
                <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/20 p-2 rounded-lg">
                  {h.comment}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <Link
                  href={`/holidays/${h.id}`}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>
                    <strong>{creditCount}</strong> collaborateur(s) crédité(s)
                  </span>
                </Link>

                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(h)}
                      className="h-8 w-8 p-0"
                      title="Modifier"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(h)}
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
              <th className="py-3.5 px-5">Date du jour férié</th>
              <th className="py-3.5 px-5">Intitulé officiel</th>
              <th className="py-3.5 px-5">Nature légale</th>
              <th className="py-3.5 px-5">Crédits de récupération générés</th>
              <th className="py-3.5 px-5">Observations</th>
              <th className="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {holidays.map((h) => {
              const creditCount = h._count?.holidayWorkCredits ?? 0;
              return (
                <tr key={String(h.id)} className="hover:bg-muted/10 transition-colors">
                  <td className="py-4 px-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-foreground text-sm font-mono">
                        {formatDate(h.date)}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-5">
                    <Link
                      href={`/holidays/${h.id}`}
                      className="font-bold text-foreground hover:text-primary transition-colors hover:underline text-sm block"
                    >
                      {h.label}
                    </Link>
                  </td>

                  <td className="py-4 px-5 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={
                        h.isReligious
                          ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                      }
                    >
                      {h.isReligious ? "Fête religieuse" : "Fête civile légale"}
                    </Badge>
                  </td>

                  <td className="py-4 px-5 whitespace-nowrap">
                    <Link
                      href={`/holidays/${h.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/70 hover:border-primary/50 bg-muted/20 hover:bg-primary/5 transition-all text-xs"
                    >
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span>
                        <strong className="text-foreground">{creditCount}</strong> salarié(s)
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-1" />
                    </Link>
                  </td>

                  <td className="py-4 px-5 text-muted-foreground max-w-xs truncate">
                    {h.comment || "—"}
                  </td>

                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/holidays/${h.id}`}
                        className="inline-flex items-center justify-center font-medium h-8 px-2.5 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors"
                      >
                        <span>Détails</span>
                        <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </Link>

                      {onEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(h)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Modifier le jour férié"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {onDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(h)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          title="Supprimer le jour férié"
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
