import * as React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface AlertProps {
  variant?: "info" | "success" | "warning" | "destructive";
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  onDismiss,
  className,
}: AlertProps) {
  const icons = {
    info: <Info className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />,
    destructive: <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />,
  };

  const variantStyles = {
    info: "bg-sky-500/10 text-sky-950 dark:text-sky-200 border-sky-500/20",
    success: "bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-950 dark:text-amber-200 border-amber-500/20",
    destructive: "bg-rose-500/10 text-rose-950 dark:text-rose-200 border-rose-500/20",
  };

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 text-xs sm:text-sm flex items-start gap-3",
        variantStyles[variant],
        className
      )}
    >
      <div className="mt-0.5">{icons[variant]}</div>
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold leading-none tracking-tight">{title}</h5>}
        <div className="leading-relaxed text-xs opacity-90">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
          aria-label="Fermer l'alerte"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
