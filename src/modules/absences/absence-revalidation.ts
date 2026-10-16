import { revalidatePath } from 'next/cache';

/**
 * Centrally revalidates all application routes and views affected by absence lifecycle mutations.
 *
 * Guarantees cross-view consistency between:
 * - Employee Portal: /portal, /portal/requests, /portal/requests/[id]
 * - HR Absence Directory: /absences, /absences/[id]
 * - HR & Operations Dashboard: /
 * - Employee Master Record: /employees/[id]
 * - Balances & Counters: /leave-balances, /leave-balances/[id]
 * - Team Schedule: /calendar
 *
 * @param absenceId Optional ID of the mutated absence
 * @param employeeId Optional ID of the employee associated with the absence
 */
export function revalidateAbsencePaths(
  absenceId?: string | number | bigint | null,
  employeeId?: string | null
): void {
  try {
    // 1. Global & Directory views
    revalidatePath('/absences');
    revalidatePath('/portal/requests');
    revalidatePath('/portal');
    revalidatePath('/leave-balances');
    revalidatePath('/calendar');
    revalidatePath('/');

    // 2. Specific absence detail views
    if (absenceId !== undefined && absenceId !== null) {
      const idStr = String(absenceId);
      revalidatePath(`/absences/${idStr}`);
      revalidatePath(`/portal/requests/${idStr}`);
    }

    // 3. Employee-specific profile and individual balance pages
    if (employeeId) {
      revalidatePath(`/employees/${employeeId}`);
      revalidatePath(`/leave-balances/${employeeId}`);
    }
  } catch {
    // Safely ignore revalidation errors in non-Next.js contexts (e.g. unit tests)
  }
}
