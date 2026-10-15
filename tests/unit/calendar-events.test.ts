import { describe, it, expect } from 'vitest';
import {
  extractDateKey,
  getStatusLabel,
  getFractionLabel,
  isAbsenceOnDate,
  computeSpanningPosition,
  mapAbsenceToCellEvent,
  buildEventsLookup,
} from '@/src/lib/calendar/calendar-events';
import { AbsenceListItem } from '@/src/lib/api/absence-client';
import { PublicHolidayItem } from '@/src/lib/api/holiday-client';

describe('Calendar Events Mapping Engine (Unit Tests)', () => {
  it('correctly extracts date keys from ISO strings and Dates without timezone drift', () => {
    expect(extractDateKey('2026-10-15T00:00:00.000Z')).toBe('2026-10-15');
    expect(extractDateKey('2026-05-01')).toBe('2026-05-01');

    const d = new Date(2026, 9, 15); // Oct 15, 2026
    expect(extractDateKey(d)).toBe('2026-10-15');
  });

  it('correctly translates all absence statuses and fractions into French labels', () => {
    expect(getStatusLabel('APPROVED')).toBe('Validé');
    expect(getStatusLabel('PENDING')).toBe('En attente');
    expect(getStatusLabel('REJECTED')).toBe('Refusé');
    expect(getStatusLabel('CANCELLED')).toBe('Annulé');

    expect(getFractionLabel('FULL_DAY')).toBeNull();
    expect(getFractionLabel('HALF_DAY_MORNING')).toBe('Matin');
    expect(getFractionLabel('HALF_DAY_AFTERNOON')).toBe('Après-midi');
  });

  it('correctly identifies whether an absence covers a date using inclusive semantics', () => {
    const absence: AbsenceListItem = {
      id: '101',
      employeeId: 'EMP-0101',
      typeId: 1,
      startDate: '2026-10-12T00:00:00.000Z',
      endDate: '2026-10-15T00:00:00.000Z',
      fraction: 'FULL_DAY',
      calculatedWorkingDays: 4,
      enteredDays: 4,
      retainedDays: 4,
      supportingDocumentProvided: false,
      status: 'APPROVED',
      requestDate: '2026-10-01',
      createdAt: '2026-10-01',
      employee: { employeeId: 'EMP-0101', fullName: 'Fatima-Zahra Alami', siteId: 1 },
      type: { id: 1, code: 'CONGE_PAYE', name: 'Congé Payé Annuel', colorHex: '#3b82f6', isDeductible: true },
    };

    expect(isAbsenceOnDate(absence, '2026-10-11')).toBe(false);
    expect(isAbsenceOnDate(absence, '2026-10-12')).toBe(true); // Start day
    expect(isAbsenceOnDate(absence, '2026-10-13')).toBe(true);
    expect(isAbsenceOnDate(absence, '2026-10-14')).toBe(true);
    expect(isAbsenceOnDate(absence, '2026-10-15')).toBe(true); // End day (inclusive)
    expect(isAbsenceOnDate(absence, '2026-10-16')).toBe(false);
  });

  it('computes spanning position for multi-day absences crossing weeks and boundaries', () => {
    // Multi-day absence: Oct 9 (Friday) to Oct 13 (Tuesday)
    const absence: AbsenceListItem = {
      id: '102',
      employeeId: 'EMP-0102',
      typeId: 1,
      startDate: '2026-10-09T00:00:00.000Z', // Friday (col 4)
      endDate: '2026-10-13T00:00:00.000Z', // Tuesday (col 1)
      fraction: 'FULL_DAY',
      calculatedWorkingDays: 3,
      enteredDays: 5,
      retainedDays: 3,
      supportingDocumentProvided: false,
      status: 'APPROVED',
      requestDate: '2026-10-01',
      createdAt: '2026-10-01',
      employee: { employeeId: 'EMP-0102', fullName: 'Mehdi Benjelloun', siteId: 1 },
      type: { id: 1, code: 'CONGE_PAYE', name: 'Congé Payé', colorHex: '#3b82f6', isDeductible: true },
    };

    // Oct 9 is start (Friday, col 4)
    expect(computeSpanningPosition(absence, '2026-10-09', 4)).toBe('start');
    // Oct 10 is Saturday (col 5) -> middle
    expect(computeSpanningPosition(absence, '2026-10-10', 5)).toBe('middle');
    // Oct 11 is Sunday (col 6) -> middle
    expect(computeSpanningPosition(absence, '2026-10-11', 6)).toBe('middle');
    // Oct 12 is Monday (col 0) -> week continuation!
    expect(computeSpanningPosition(absence, '2026-10-12', 0)).toBe('week_continuation');
    // Oct 13 is Tuesday (col 1) -> end day
    expect(computeSpanningPosition(absence, '2026-10-13', 1)).toBe('end');

    // Single-day absence must return 'single'
    const singleDayAbsence = { ...absence, startDate: '2026-10-14', endDate: '2026-10-14' };
    expect(computeSpanningPosition(singleDayAbsence, '2026-10-14', 2)).toBe('single');
  });

  it('correctly maps half-day absences and retains fraction metadata', () => {
    const halfDayAbsence: AbsenceListItem = {
      id: '103',
      employeeId: 'EMP-0103',
      typeId: 3,
      startDate: '2026-10-14T00:00:00.000Z',
      endDate: '2026-10-14T00:00:00.000Z',
      fraction: 'HALF_DAY_MORNING',
      calculatedWorkingDays: 0.5,
      enteredDays: 1,
      retainedDays: 0.5,
      supportingDocumentProvided: false,
      status: 'PENDING',
      requestDate: '2026-10-05',
      createdAt: '2026-10-05',
      employee: { employeeId: 'EMP-0103', fullName: 'Sara Chraibi', siteId: 1 },
      type: { id: 3, code: 'RECUPERATION', name: 'Récupération', colorHex: '#f59e0b', isDeductible: true },
    };

    const event = mapAbsenceToCellEvent(halfDayAbsence, '2026-10-14', 2);
    expect(event.isHalfDay).toBe(true);
    expect(event.fraction).toBe('HALF_DAY_MORNING');
    expect(event.fractionLabelFr).toBe('Matin');
    expect(event.status).toBe('PENDING');
    expect(event.statusLabelFr).toBe('En attente');
    expect(event.spanningPosition).toBe('single');
  });

  it('builds an efficient lookup table for all visible calendar dates', () => {
    const dateKeys = ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'];

    const holidays: PublicHolidayItem[] = [
      {
        id: 'h1',
        date: '2026-10-11T00:00:00.000Z',
        label: 'Marche Verte Test',
        isReligious: false,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    const absences: AbsenceListItem[] = [
      {
        id: 'a1',
        employeeId: 'EMP-01',
        typeId: 1,
        startDate: '2026-10-12T00:00:00.000Z',
        endDate: '2026-10-14T00:00:00.000Z',
        fraction: 'FULL_DAY',
        calculatedWorkingDays: 3,
        enteredDays: 3,
        retainedDays: 3,
        supportingDocumentProvided: false,
        status: 'APPROVED',
        requestDate: '2026-10-01',
        createdAt: '2026-10-01',
        employee: { employeeId: 'EMP-01', fullName: 'Karim Bennani', siteId: 1 },
        type: { id: 1, code: 'CP', name: 'Congé Payé', colorHex: '#3b82f6', isDeductible: true },
      },
    ];

    const lookup = buildEventsLookup(dateKeys, absences, holidays);

    // Oct 11 has 1 holiday and 0 absences
    expect(lookup.get('2026-10-11')?.holidays.length).toBe(1);
    expect(lookup.get('2026-10-11')?.holidays[0].label).toBe('Marche Verte Test');
    expect(lookup.get('2026-10-11')?.absences.length).toBe(0);

    // Oct 12 has 0 holidays and 1 absence (start)
    expect(lookup.get('2026-10-12')?.absences.length).toBe(1);
    expect(lookup.get('2026-10-12')?.absences[0].spanningPosition).toBe('start');

    // Oct 13 has 1 absence (middle)
    expect(lookup.get('2026-10-13')?.absences.length).toBe(1);
    expect(lookup.get('2026-10-13')?.absences[0].spanningPosition).toBe('middle');

    // Oct 14 has 1 absence (end)
    expect(lookup.get('2026-10-14')?.absences.length).toBe(1);
    expect(lookup.get('2026-10-14')?.absences[0].spanningPosition).toBe('end');

    // Oct 15 has 0 absences
    expect(lookup.get('2026-10-15')?.absences.length).toBe(0);
  });
});
