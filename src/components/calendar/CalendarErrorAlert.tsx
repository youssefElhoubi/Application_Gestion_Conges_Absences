"use client";

import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

export interface CalendarErrorAlertProps {
  absenceError: string | null;
  holidayError: string | null;
  onRetry: () => void;
  className?: string;
}

export function CalendarErrorAlert({
  absenceError,
  holidayError,
  onRetry,
  className,
}: CalendarErrorAlertProps) {
  if (!absenceError && !holidayError) {
    return null;
  }

  const errorMessage = [absenceError, holidayError].filter(Boolean).join(" • ");

  return (
    <div
      className={cn(
        "p-3.5 sm:p-4 rounded-xl border border-destructive/20 bg-rose-500/10 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs",
        className
      )}
      role="alert"
    >
      <div className="flex items-start sm:items-center gap-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5 sm:mt-0" />
        <div>
          <span className="font-semibold">Erreur de chargement : </span>
          <span>{errorMessage}</span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        className="h-8 text-xs shrink-0 bg-background/80 hover:bg-background"
      >
        Réessayer
      </Button>
    </div>
  );
}
