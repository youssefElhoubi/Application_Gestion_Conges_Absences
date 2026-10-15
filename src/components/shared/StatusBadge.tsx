import * as React from "react";
import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";

export type EnterpriseStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "ACTIVE"
  | "INACTIVE"
  | "DRAFT"
  | "ARCHIVED"
  | string;

export interface StatusBadgeProps {
  status: EnterpriseStatus;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

const STATUS_CONFIGS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" | "destructive" | "info" | "subtle" }
> = {
  PENDING: { label: "En attente", variant: "warning" },
  APPROVED: { label: "Validé", variant: "success" },
  REJECTED: { label: "Refusé", variant: "destructive" },
  CANCELLED: { label: "Annulé", variant: "subtle" },
  ACTIVE: { label: "Actif", variant: "success" },
  INACTIVE: { label: "Inactif", variant: "subtle" },
  DRAFT: { label: "Brouillon", variant: "secondary" },
  ARCHIVED: { label: "Archivé", variant: "outline" },
};

export function StatusBadge({ status, label, className, size = "md" }: StatusBadgeProps) {
  const normalizedKey = String(status).toUpperCase();
  const config = STATUS_CONFIGS[normalizedKey] ?? {
    label: label ?? status,
    variant: "subtle",
  };

  const displayLabel = label ?? config.label;

  return (
    <Badge
      variant={config.variant}
      size={size}
      dot
      className={cn("capitalize font-medium tracking-normal", className)}
    >
      {displayLabel}
    </Badge>
  );
}
