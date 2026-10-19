/**
 * Static configuration, UI labels, and legal references for the Leave Balances modules.
 */

import type { AbsenceTabConfig } from './leave-balance.types';

/**
 * Default pagination sizes for related history queries on the employee detail view
 */
export const DEFAULT_DETAIL_ABSENCES_PAGE_SIZE = 50;
export const DEFAULT_DETAIL_CREDITS_PAGE_SIZE = 50;

/**
 * Absence filter tabs configuration for the employee detail view
 */
export const ABSENCE_FILTER_TABS: readonly AbsenceTabConfig[] = [
  {
    id: 'all',
    label: 'Toutes',
    activeClass: 'bg-primary text-primary-foreground',
  },
  {
    id: 'approved',
    label: 'Approuvées / Décomptées',
    activeClass: 'bg-emerald-600 text-white',
  },
  {
    id: 'pending',
    label: 'En attente',
    activeClass: 'bg-amber-600 text-white',
  },
  {
    id: 'other',
    label: 'Refusées / Annulées',
    activeClass: 'bg-zinc-700 text-white',
  },
] as const;

/**
 * Moroccan Labor Code (Loi n° 65-99) static legal references and UI notice labels
 */
export const LEGAL_STATUTORY_LABELS = {
  CODE_DU_TRAVAIL_BADGE: 'Loi n° 65-99 (Art. 231 & 232)',
  SENIORITY_BONUS_TITLE: "Règle d'Ancienneté (Art. 232)",
  SENIORITY_BONUS_DESCRIPTION:
    "Majoration de 1.5 jour par période entière de 5 ans de service, sans que le cumul annuel n'excède 30 jours ouvrables.",
  RECOVERY_CREDITS_NOTE:
    "* Les crédits acquis lors d'un jour férié travaillé n'expirent jamais et sont consommés selon la règle FIFO.",
  APPROVED_DEDUCTIONS_NOTE:
    '* Seules les absences approuvées et déductibles sont imputées sur le solde par le moteur statutaire.',
  SIX_MONTH_GATE_TITLE:
    'Acquisition en cours — Consommation bloquée statutairement (Art. 231)',
  DEFICIT_BALANCE_TITLE:
    'Solde Débiteur — Dépassement des droits autorisés',
} as const;

/**
 * Proportional progress bar styling colors
 */
export const BALANCE_PROGRESS_COLORS = {
  consumed: 'bg-slate-500',
  available: 'bg-emerald-500',
  locked: 'bg-amber-500',
  deficit: 'bg-rose-500',
  empty: 'bg-muted',
} as const;

/**
 * Overview page default query parameter configuration
 */
export const DEFAULT_LEAVE_BALANCES_SORT_BY = 'fullName';
export const DEFAULT_LEAVE_BALANCES_SORT_ORDER = 'asc' as const;
export const DEFAULT_LEAVE_BALANCES_PAGE = 1;
export const DEFAULT_LEAVE_BALANCES_PAGE_SIZE = 10;
export const DEFAULT_LEAVE_BALANCES_ACTIVE = 'true' as const;
export const DEFAULT_LEAVE_BALANCES_SITE_ID = 'all';
export const LEAVE_BALANCES_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/**
 * Human-readable labels for table sorting columns
 */
export const LEAVE_BALANCES_SORT_LABELS: Record<string, string> = {
  fullName: 'Nom',
  employeeId: 'Matricule',
  hireDate: "Date d'embauche",
  site: 'Site',
} as const;

