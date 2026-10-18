import { AbsenceStatus, AbsenceFraction } from '@/src/lib/api/absence-client';

/**
 * Returns user-facing status label in French enterprise vocabulary.
 */
export function getStatusLabel(status: AbsenceStatus): string {
  switch (status) {
    case 'APPROVED':
      return 'Validé';
    case 'PENDING':
      return 'En attente';
    case 'REJECTED':
      return 'Refusé';
    case 'CANCELLED':
      return 'Annulé';
    default:
      return status;
  }
}

/**
 * Returns human-readable label for absence fractions in French.
 */
export function getFractionLabel(fraction: AbsenceFraction): string | null {
  switch (fraction) {
    case 'HALF_DAY_MORNING':
      return 'Matin';
    case 'HALF_DAY_AFTERNOON':
      return 'Après-midi';
    case 'FULL_DAY':
    default:
      return null;
  }
}
