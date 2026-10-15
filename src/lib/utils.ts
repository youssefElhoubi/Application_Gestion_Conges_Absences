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
 * Safely converts numbers, numeric strings, or Prisma Decimal instances into a clean JavaScript number.
 */
export function toSafeNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === "object" && val !== null) {
    // Handle Prisma Decimal instances or Decimal-like objects
    if ("toNumber" in val && typeof (val as { toNumber: () => number }).toNumber === "function") {
      try {
        const num = (val as { toNumber: () => number }).toNumber();
        if (!isNaN(num)) return num;
      } catch {
        // Fallback to toString parsing
      }
    }
    if ("toString" in val && typeof (val as { toString: () => string }).toString === "function") {
      const parsed = parseFloat((val as { toString: () => string }).toString());
      return isNaN(parsed) ? 0 : parsed;
    }
  }
  return 0;
}

export interface FormatLeaveDaysOptions {
  /**
   * Display mode:
   * - 'short': uses abbreviated unit 'j' (e.g., '1 j', '1,5 j', '15 j')
   * - 'full': uses spelled-out unit ('jour' vs 'jours') with correct French grammar
   *   (strictly < 2 is singular: '0 jour', '1 jour', '1,5 jour'; >= 2 is plural: '2 jours', '15 jours')
   */
  mode?: "short" | "full";
  /** Explicit fixed decimal places (defaults to 0 for integers, 1 for fractions) */
  decimals?: number;
  /** Whether to show a '+' prefix for positive values (e.g., '+1,5 j') */
  showSign?: boolean;
}

/**
 * Format leave balance values with decimal precision, Prisma Decimal safety,
 * and correct singular/plural French wording.
 */
export function formatLeaveDays(days: unknown, options: FormatLeaveDaysOptions = {}): string {
  const num = toSafeNumber(days);
  const decimals = options.decimals ?? (Number.isInteger(num) ? 0 : 1);
  const sign = options.showSign && num > 0 ? "+" : "";

  const formattedNum = sign + num.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  });

  if (options.mode === "full") {
    // Under French grammar, quantities strictly less than 2 take singular 'jour', >= 2 take plural 'jours'
    const isSingular = Math.abs(num) < 2;
    return `${formattedNum} ${isSingular ? "jour" : "jours"}`;
  }

  return `${formattedNum} j`;
}

/**
 * Backward-compatible helper: format days using short unit 'j'.
 */
export function formatDays(days: number | string | null | undefined): string {
  return formatLeaveDays(days, { mode: "short" });
}
