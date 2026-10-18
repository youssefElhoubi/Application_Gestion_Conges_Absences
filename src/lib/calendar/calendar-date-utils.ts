/**
 * Pure timezone-safe date math and ISO date-only (YYYY-MM-DD) key utilities.
 */

/**
 * Creates a normalized date-only string (YYYY-MM-DD) without timezone distortion.
 */
export function toDateKey(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses a YYYY-MM-DD string into year, month, and day integers.
 */
export function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const parts = dateKey.split('T')[0].split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10),
  };
}

/**
 * Normalizes an ISO string or Date into YYYY-MM-DD key without timezone shift.
 */
export function extractDateKey(dateInput: string | Date): string {
  if (typeof dateInput === 'string') {
    return dateInput.split('T')[0];
  }
  const y = dateInput.getFullYear();
  const m = String(dateInput.getMonth() + 1).padStart(2, '0');
  const d = String(dateInput.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Computes adjacent month and year for forward and backward navigation.
 * Properly wraps across year boundaries (Jan -> Dec prev year, Dec -> Jan next year).
 */
export function getAdjacentMonth(
  year: number,
  month: number,
  direction: 'prev' | 'next'
): { year: number; month: number } {
  if (direction === 'prev') {
    return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  } else {
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  }
}

/**
 * Computes adjacent week's Monday date key (+7 or -7 days).
 */
export function getAdjacentWeek(mondayDateKey: string, direction: 'prev' | 'next'): string {
  const parts = parseDateKey(mondayDateKey);
  const offsetDays = direction === 'next' ? 7 : -7;
  const targetDate = new Date(parts.year, parts.month - 1, parts.day + offsetDays);
  return toDateKey(targetDate.getFullYear(), targetDate.getMonth() + 1, targetDate.getDate());
}
