import { CalendarViewMode, CalendarFilterState } from './calendar-types';

/**
 * Standard French localized month names (1-indexed: Janvier = index 0).
 */
export const MONTH_NAMES_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

/**
 * Standard French localized weekday names following ISO 8601 (Monday = index 0).
 */
export const WEEKDAYS_FR = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
] as const;

/**
 * Abbreviated French weekday names (Monday = index 0).
 */
export const WEEKDAYS_SHORT_FR = [
  'Lun',
  'Mar',
  'Mer',
  'Jeu',
  'Ven',
  'Sam',
  'Dim',
] as const;

/**
 * Default view mode for the calendar.
 */
export const DEFAULT_VIEW_MODE: CalendarViewMode = 'grid';

/**
 * Maximum visible event pills in a single calendar grid cell before overflowing into '+N autres'.
 */
export const MAX_GRID_VISIBLE_EVENTS = 2;

/**
 * Maximum page size for calendar bulk absence fetching to prevent silent truncation.
 */
export const CALENDAR_MAX_PAGE_SIZE = 500;

/**
 * Initial/unfiltered default calendar filter state.
 */
export const DEFAULT_CALENDAR_FILTERS: CalendarFilterState = {
  search: '',
  employeeId: 'all',
  siteId: 'all',
  typeId: 'all',
  status: 'ALL',
};
