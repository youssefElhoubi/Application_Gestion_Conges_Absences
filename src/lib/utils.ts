import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines conditional class names and merges Tailwind CSS classes safely.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display in French / Moroccan enterprise standard.
 */
export function formatDate(date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(d);
}

/**
 * Format numbers with decimal places.
 */
export function formatDays(days: number | string | null | undefined): string {
  if (days === null || days === undefined) return "0 j";
  const num = typeof days === "string" ? parseFloat(days) : days;
  if (isNaN(num)) return "0 j";
  return `${num.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} j`;
}
