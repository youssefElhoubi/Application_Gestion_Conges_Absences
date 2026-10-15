"use client";

import * as React from "react";
import { Clock, HelpCircle } from "lucide-react";
import { EmployeeCreditItem } from "@/src/lib/api/employee-client";
import { formatDate } from "@/src/lib/utils";

export interface PortalCreditsListProps {
  credits: EmployeeCreditItem[];
  isLoading?: boolean;
}

export function PortalCreditsList({ credits, isLoading }: PortalCreditsListProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="h-6 w-48 bg-muted/60 animate-pulse rounded" />
        <div className="h-20 bg-muted/40 animate-pulse rounded-xl" />
      </div>
    );
  }

  const totalCredited = credits.reduce((acc, c) => acc + Number(c.creditedDays), 0);
  const totalConsumed = credits.reduce((acc, c) => acc + Number(c.consumedDays), 0);
  const remaining = totalCredited - totalConsumed;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-base font-bold text-foreground">
            Crédits de récupération acquis (Jours fériés travaillés)
          </h3>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
          {remaining} jour(s) récupérable(s)
        </div>
      </div>

      <div className="p-3 rounded-xl bg-muted/20 border border-border/60 text-xs text-muted-foreground flex items-start gap-2">
        <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>
          En vertu du Code du Travail marocain, lorsqu&apos;un salarié assure une permanence durant un jour férié chômé, un crédit de récupération équivalent est automatiquement octroyé. <strong>Ces crédits n&apos;expirent jamais</strong> et peuvent être posés sous le type &ldquo;Récupération&rdquo;.
        </span>
      </div>

      {credits.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground italic">
          Vous n&apos;avez actuellement aucun crédit de récupération enregistré.
        </div>
      ) : (
        <div className="space-y-2.5">
          {credits.map((item) => {
            const credited = Number(item.creditedDays);
            const consumed = Number(item.consumedDays);
            const isFullyConsumed = item.isFullyConsumed || consumed >= credited;

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border border-border/60 bg-muted/10 gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <span>{item.publicHoliday?.label || "Jour férié légal"}</span>
                    {item.publicHoliday?.date && (
                      <span className="text-[11px] text-muted-foreground font-normal">
                        ({formatDate(item.publicHoliday.date)})
                      </span>
                    )}
                  </div>
                  {item.comment && (
                    <p className="text-[11px] text-muted-foreground">{item.comment}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="font-medium text-muted-foreground">
                    Crédité : <strong className="text-foreground">{credited} j</strong>
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-medium text-muted-foreground">
                    Consommé : <strong className="text-foreground">{consumed} j</strong>
                  </span>
                  {isFullyConsumed ? (
                    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-semibold">
                      Épuisé
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                      Disponible
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
