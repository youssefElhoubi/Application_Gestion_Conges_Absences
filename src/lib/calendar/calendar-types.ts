import { AbsenceStatus, AbsenceFraction } from '@/src/lib/api/absence-client';

export type CalendarViewMode = 'grid' | 'week' | 'agenda';

export type EventSpanningPosition =
  | 'single' // Single day absence
  | 'start' // First day of multi-day absence
  | 'middle' // Continuing middle day
  | 'end' // Last day of multi-day absence
  | 'week_continuation'; // Monday continuation of an absence started in a previous week

export interface CalendarGridCell {
  dateKey: string; // ISO Date-only format: YYYY-MM-DD
  dayOfMonth: number;
  month: number; // 1 to 12
  year: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday (JS convention)
  weekColumnIndex: number; // 0 = Monday, 1 = Tuesday, ... 6 = Sunday (ISO / Moroccan standard)
  isCurrentMonth: boolean;
  isPrevMonth: boolean;
  isNextMonth: boolean;
  isToday: boolean;
  isWeekend: boolean; // Sunday or Saturday (weekly rest)
  dayNameFr: string;
  formattedDateFr: string;
}

export interface MonthGridResult {
  year: number;
  month: number;
  monthNameFr: string;
  daysInMonth: number;
  cells: CalendarGridCell[];
  totalWeeks: number;
}

export interface WeekInfoResult {
  mondayDateKey: string;
  sundayDateKey: string;
  days: CalendarGridCell[];
  formattedWeekLabelFr: string;
  year: number;
  month: number;
}

export interface CalendarAbsenceEvent {
  id: string;
  absenceId: string | number;
  employeeId: string;
  employeeName: string;
  employeeSiteName?: string | null;
  typeId: number;
  typeName: string;
  typeCode: string;
  typeColor: string;
  isDeductible: boolean;
  reasonName?: string | null;
  startDateKey: string; // YYYY-MM-DD
  endDateKey: string; // YYYY-MM-DD
  fraction: AbsenceFraction;
  status: AbsenceStatus;
  statusLabelFr: string;
  fractionLabelFr: string | null;
  isHalfDay: boolean;
  isMultiDay: boolean;
  calculatedWorkingDays: number | string;
  enteredDays: number | string;
  retainedDays: number | string;
  spanningPosition: EventSpanningPosition;
}

export interface CalendarHolidayEvent {
  id: string;
  holidayId: string | number;
  dateKey: string; // YYYY-MM-DD
  label: string;
  isReligious: boolean;
  comment?: string | null;
}

export interface DayEventsMap {
  holidays: CalendarHolidayEvent[];
  absences: CalendarAbsenceEvent[];
}

export interface CalendarFilterState {
  search: string;
  employeeId: string; // 'all' or specific employeeId
  siteId: string; // 'all' or specific siteId
  typeId: string; // 'all' or specific typeId
  status: AbsenceStatus | 'ALL';
}

export interface CalendarUrlState extends CalendarFilterState {
  year: number;
  month: number;
  date?: string;
  view: CalendarViewMode;
}

export interface CalendarSummaryMetrics {
  approvedCount: number;
  pendingCount: number;
  visibleHolidaysCount: number;
  totalAbsenceRecords: number;
}
