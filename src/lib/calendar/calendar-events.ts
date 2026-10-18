import { AbsenceListItem } from '@/src/lib/api/absence-client';
import { PublicHolidayItem } from '@/src/lib/api/holiday-client';
import {
  EventSpanningPosition,
  CalendarAbsenceEvent,
  CalendarHolidayEvent,
  DayEventsMap,
} from './calendar-types';
import { getStatusLabel, getFractionLabel } from './calendar-formatters';
import { extractDateKey } from './calendar-date-utils';

// Re-export for complete backward compatibility across all consumers and test suites
export type {
  EventSpanningPosition,
  CalendarAbsenceEvent,
  CalendarHolidayEvent,
  DayEventsMap,
};
export { extractDateKey, getStatusLabel, getFractionLabel };

/**
 * Determines whether an absence covers a specific calendar day (inclusive start and end).
 */
export function isAbsenceOnDate(absence: AbsenceListItem, dateKey: string): boolean {
  const start = extractDateKey(absence.startDate);
  const end = extractDateKey(absence.endDate);
  return dateKey >= start && dateKey <= end;
}

/**
 * Computes the spanning visual position of an absence event for a specific grid cell.
 * Handles week wrapping (Monday column = 0) and month boundaries.
 */
export function computeSpanningPosition(
  absence: AbsenceListItem,
  dateKey: string,
  weekColumnIndex: number
): EventSpanningPosition {
  const start = extractDateKey(absence.startDate);
  const end = extractDateKey(absence.endDate);

  if (start === end) {
    return 'single';
  }

  const isStart = dateKey === start;
  const isEnd = dateKey === end;
  const isMonday = weekColumnIndex === 0;

  if (isStart) {
    return 'start';
  }

  if (isEnd) {
    return 'end';
  }

  if (isMonday) {
    return 'week_continuation';
  }

  return 'middle';
}

/**
 * Transforms an AbsenceListItem into a CalendarAbsenceEvent for a specific calendar cell.
 */
export function mapAbsenceToCellEvent(
  absence: AbsenceListItem,
  dateKey: string,
  weekColumnIndex: number
): CalendarAbsenceEvent {
  const startDateKey = extractDateKey(absence.startDate);
  const endDateKey = extractDateKey(absence.endDate);
  const isMultiDay = startDateKey !== endDateKey;
  const spanningPosition = computeSpanningPosition(absence, dateKey, weekColumnIndex);

  return {
    id: `abs-${absence.id}-${dateKey}`,
    absenceId: absence.id,
    employeeId: absence.employeeId,
    employeeName: absence.employee?.fullName || absence.employeeId,
    employeeSiteName: absence.employee?.site?.name || null,
    typeId: absence.typeId,
    typeName: absence.type?.name || 'Absence',
    typeCode: absence.type?.code || 'CONGE',
    typeColor: absence.type?.colorHex || '#3b82f6',
    isDeductible: absence.type?.isDeductible ?? true,
    reasonName: absence.reason?.name || null,
    startDateKey,
    endDateKey,
    fraction: absence.fraction,
    status: absence.status,
    statusLabelFr: getStatusLabel(absence.status),
    fractionLabelFr: getFractionLabel(absence.fraction),
    isHalfDay: absence.fraction !== 'FULL_DAY',
    isMultiDay,
    calculatedWorkingDays: absence.calculatedWorkingDays,
    enteredDays: absence.enteredDays,
    retainedDays: absence.retainedDays,
    spanningPosition,
  };
}

/**
 * Transforms PublicHolidayItem into a CalendarHolidayEvent.
 */
export function mapHolidayToCellEvent(holiday: PublicHolidayItem): CalendarHolidayEvent {
  const dateKey = extractDateKey(holiday.date);
  return {
    id: `hol-${holiday.id}-${dateKey}`,
    holidayId: holiday.id,
    dateKey,
    label: holiday.label,
    isReligious: holiday.isReligious,
    comment: holiday.comment,
  };
}

/**
 * Organizes a list of absences and public holidays into a lookup dictionary keyed by YYYY-MM-DD.
 */
export function buildEventsLookup(
  dateKeys: string[],
  absences: AbsenceListItem[],
  holidays: PublicHolidayItem[]
): Map<string, DayEventsMap> {
  const lookup = new Map<string, DayEventsMap>();

  // Initialize lookup for each visible date
  dateKeys.forEach((key) => {
    lookup.set(key, { holidays: [], absences: [] });
  });

  // Map public holidays (each holiday belongs to its exact date)
  holidays.forEach((h) => {
    const key = extractDateKey(h.date);
    const dayEntry = lookup.get(key);
    if (dayEntry) {
      dayEntry.holidays.push(mapHolidayToCellEvent(h));
    }
  });

  // Map absences (an absence can span multiple dates)
  absences.forEach((a) => {
    const start = extractDateKey(a.startDate);
    const end = extractDateKey(a.endDate);

    dateKeys.forEach((key, index) => {
      if (key >= start && key <= end) {
        const weekColumnIndex = index % 7;
        const dayEntry = lookup.get(key);
        if (dayEntry) {
          dayEntry.absences.push(mapAbsenceToCellEvent(a, key, weekColumnIndex));
        }
      }
    });
  });

  return lookup;
}
