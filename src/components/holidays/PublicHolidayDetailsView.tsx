"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  ArrowLeft,
  Users,
  Clock,
  PlusCircle,
  Edit2,
  Trash2,
  Info,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import {
  PublicHolidayDetail,
  HolidayWorkCreditItem,
} from "@/src/lib/api/holiday-client";
import { formatDate } from "@/src/lib/utils";

export interface PublicHolidayDetailsViewProps {
  holiday: PublicHolidayDetail;
  onEditHoliday: () => void;
  onDeleteHoliday: () => void;
  onGrantCredit: () => void;
  onCorrectCredit: (credit: HolidayWorkCreditItem) => void;
  onDeleteCredit: (credit: HolidayWorkCreditItem) => void;
}

export function PublicHolidayDetailsView({
  holiday,
  onEditHoliday,
  onDeleteHoliday,
  onGrantCredit,
  onCorrectCredit,
  onDeleteCredit,
}: PublicHolidayDetailsViewProps) {
  const credits = holiday.holidayWorkCredits || [];
  const totalCredited = credits.reduce((sum, c) => sum + Number(c.creditedDays), 0);
  const totalConsumed = credits.reduce((sum, c) => sum + Number(c.consumedDays), 0);
  const remaining = Math.max(0, totalCredited - totalConsumed);

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/holidays"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-medium transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Retour aux jours fériés légaux</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onEditHoliday}
            className="gap-1.5 text-xs h-8"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Modifier</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onDeleteHoliday}
            className="gap-1.5 text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Supprimer</span>
          </Button>
        </div>
      </div>

      {/* Hero Holiday Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold shrink-0">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {holiday.label}
                </h1>
                <Badge
                  variant="outline"
                  className={
                    holiday.isReligious
                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 text-xs font-semibold"
                      : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-xs font-semibold"
                  }
                >
                  {holiday.isReligious ? "Fête religieuse" : "Fête civile légale"}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-primary font-mono">
                {formatDate(holiday.date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              onClick={onGrantCredit}
              className="gap-2 text-xs h-9 shadow-xs"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Attribuer un crédit de récupération</span>
            </Button>
          </div>
        </div>

        {/* Observation / Legal Note */}
        {holiday.comment && (
          <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 text-xs text-foreground leading-relaxed">
            <span className="font-semibold text-muted-foreground mr-1.5">Observations administratives :</span>
            {holiday.comment}
          </div>
        )}

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-xl border border-border/70 bg-muted/10 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Salariés ayant travaillé
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-foreground">{credits.length}</span>
              <span className="text-xs text-muted-foreground">collaborateur(s)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/70 bg-muted/10 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total crédits octroyés
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-foreground">{totalCredited.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">jour(s)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/70 bg-muted/10 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Solde disponible restant
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {remaining.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">
                j ({totalConsumed.toFixed(1)} j consommés)
              </span>
            </div>
          </div>
        </div>

        {/* Educational Note: Dahir 1-03-194 */}
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2.5">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <strong className="text-foreground font-semibold">Règle statutaire marocaine (Loi n° 65-99) :</strong>
            <p>
              Les jours fériés légaux sont chômés et payés. Ils ne réduisent jamais le solde de congé annuel d&apos;un salarié.
              Lorsqu&apos;un collaborateur est mobilisé pour assurer une permanence durant ce jour férié, un crédit de récupération
              équivalent lui est octroyé. <strong>Ces crédits n&apos;expirent jamais</strong> et sont posables sous la nature &ldquo;Récupération&rdquo;.
            </p>
          </div>
        </div>
      </div>

      {/* Related Recovery Credits Section */}
      <Card className="rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Crédits de récupération associés
                </h3>
                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold px-2 py-0.5">
                  {credits.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Collaborateurs ayant obtenu des jours de récupération pour ce jour férié
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={onGrantCredit}
            className="gap-1.5 text-xs self-start sm:self-auto"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Ajouter un collaborateur</span>
          </Button>
        </div>

        <div className="p-0">
          {credits.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                Aucun collaborateur crédité pour ce jour férié
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Si des collaborateurs ont assuré une permanence durant ce jour férié, vous pouvez leur attribuer un crédit de récupération.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={onGrantCredit}
                className="gap-1.5 text-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Attribuer le premier crédit</span>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/60">
                  <tr>
                    <th className="py-3 px-5">Collaborateur</th>
                    <th className="py-3 px-5 text-center">Crédits octroyés</th>
                    <th className="py-3 px-5 text-center">Consommé</th>
                    <th className="py-3 px-5">Statut</th>
                    <th className="py-3 px-5">Motif / Justification</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {credits.map((c) => {
                    const credited = Number(c.creditedDays);
                    const consumed = Number(c.consumedDays);
                    const rem = Math.max(0, credited - consumed);
                    const isConsumed = c.isFullyConsumed || consumed >= credited;

                    return (
                      <tr key={String(c.id)} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3.5 px-5">
                          <Link
                            href={`/employees?search=${c.employeeId}`}
                            className="font-bold text-foreground hover:text-primary transition-colors hover:underline text-sm block"
                          >
                            {c.employee.fullName}
                          </Link>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                            <span className="font-mono">{c.employeeId}</span>
                            {c.employee.site?.name && (
                              <span>• {c.employee.site.name}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-center font-bold text-foreground whitespace-nowrap">
                          {credited.toFixed(2)} j
                        </td>

                        <td className="py-3.5 px-5 text-center text-muted-foreground whitespace-nowrap">
                          {consumed.toFixed(2)} j
                        </td>

                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={
                              isConsumed
                                ? "bg-muted text-muted-foreground border-border text-[11px]"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[11px]"
                            }
                          >
                            {isConsumed ? "Totalement consommé" : `${rem.toFixed(2)} j dispo`}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-5 text-muted-foreground max-w-xs truncate">
                          {c.comment || "—"}
                        </td>

                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onCorrectCredit(c)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Ajuster le crédit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            {!isConsumed && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDeleteCredit(c)}
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                title="Supprimer le crédit"
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
          )}
        </div>
      </Card>
    </div>
  );
}
