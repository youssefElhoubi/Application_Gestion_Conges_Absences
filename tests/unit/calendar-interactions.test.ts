import { describe, it, expect } from 'vitest';
import {
  CalendarAbsenceEvent,
  CalendarHolidayEvent,
  mapAbsenceToCellEvent,
  mapHolidayToCellEvent,
} from '@/src/lib/calendar/calendar-events';
import { AbsenceListItem } from '@/src/lib/api/absence-client';
import { PublicHolidayItem } from '@/src/lib/api/holiday-client';

describe('Calendar Event Interaction & Navigation Logic (Unit Tests)', () => {
  const mockAbsence: AbsenceListItem = {
    id: '42',
    employeeId: 'EMP-0101',
    typeId: 2,
    reasonId: 5,
    startDate: '2026-10-12T00:00:00.000Z',
    endDate: '2026-10-15T00:00:00.000Z',
    fraction: 'FULL_DAY',
    calculatedWorkingDays: 4,
    enteredDays: 4,
    retainedDays: 4,
    supportingDocumentProvided: true,
    status: 'APPROVED',
    requestDate: '2026-10-01',
    comment: 'Voyage familial privé - confidentiel',
    createdAt: '2026-10-01',
    employee: {
      employeeId: 'EMP-0101',
      fullName: 'Fatima-Zahra Alami',
      siteId: 1,
      site: {
        name: 'Siège Social Casablanca',
      },
    },
    type: {
      id: 2,
      code: 'EVENEMENT_FAMILIAL',
      name: 'Événement Familial',
      colorHex: '#10b981',
      isDeductible: false,
    },
    reason: {
      id: 5,
      code: 'MARIAGE_SALARIE',
      name: 'Mariage du salarié',
      allowedDays: 4,
    },
  };

  const mockHoliday: PublicHolidayItem = {
    id: 10,
    date: '2026-11-06T00:00:00.000Z',
    label: 'Fête de la Marche Verte',
    isReligious: false,
    comment: 'Jour férié chômé payé officiel (Loi n° 65-99)',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  it('correctly maps absence event for inspection with authorized metadata', () => {
    const event = mapAbsenceToCellEvent(mockAbsence, '2026-10-12', 0);

    expect(event.absenceId).toBe('42');
    expect(event.employeeId).toBe('EMP-0101');
    expect(event.employeeName).toBe('Fatima-Zahra Alami');
    expect(event.employeeSiteName).toBe('Siège Social Casablanca');
    expect(event.typeName).toBe('Événement Familial');
    expect(event.isDeductible).toBe(false);
    expect(event.reasonName).toBe('Mariage du salarié');
    expect(event.status).toBe('APPROVED');
    expect(event.statusLabelFr).toBe('Validé');
    expect(event.startDateKey).toBe('2026-10-12');
    expect(event.endDateKey).toBe('2026-10-15');
    expect(event.retainedDays).toBe(4);
  });

  it('preserves privacy by not exposing raw personal comments on calendar event representations', () => {
    const event = mapAbsenceToCellEvent(mockAbsence, '2026-10-12', 0);
    // Personal comment must not be mapped onto the shared calendar event representation
    expect((event as any).comment).toBeUndefined();
  });

  it('computes correct route targets for absence event navigation', () => {
    const event = mapAbsenceToCellEvent(mockAbsence, '2026-10-12', 0);

    const absenceDetailRoute = `/absences/${event.absenceId}`;
    const employeeProfileRoute = `/employees/${encodeURIComponent(event.employeeId)}`;

    expect(absenceDetailRoute).toBe('/absences/42');
    expect(employeeProfileRoute).toBe('/employees/EMP-0101');
  });

  it('correctly maps holiday event for inspection with classification and destination', () => {
    const holidayEvent = mapHolidayToCellEvent(mockHoliday);

    expect(holidayEvent.holidayId).toBe(10);
    expect(holidayEvent.label).toBe('Fête de la Marche Verte');
    expect(holidayEvent.isReligious).toBe(false);
    expect(holidayEvent.comment).toBe('Jour férié chômé payé officiel (Loi n° 65-99)');

    const holidayDetailRoute = `/holidays/${holidayEvent.holidayId}`;
    expect(holidayDetailRoute).toBe('/holidays/10');
  });
});
