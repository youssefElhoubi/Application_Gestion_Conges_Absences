import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  errorCode?: string | number;
  onRetry?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Une erreur est survenue",
  message = "Impossible de charger les données pour le moment. Veuillez vérifier votre connexion ou réessayer.",
  errorCode,
  onRetry,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-destructive/20 bg-rose-500/5 dark:bg-rose-950/10",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-4">
        <AlertCircle className="h-7 w-7 stroke-[1.5]" />
      </div>

      <div className="space-y-1 mb-2">
        <h3 className="text-base font-semibold text-foreground tracking-tight">
          {title}
        </h3>
        {errorCode && (
          <span className="inline-block text-[11px] font-mono font-medium text-muted-foreground px-2 py-0.5 rounded-sm bg-muted">
            Code: {errorCode}
          </span>
        )}
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {message}
      </p>

      <div className="flex items-center gap-2.5 flex-wrap justify-center">
        {onSecondaryAction && secondaryActionLabel && (
          <Button variant="outline" size="sm" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
        {onRetry && (
          <Button
            variant="primary"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Réessayer
          </Button>
        )}
      </div>
    </div>
  );
}
