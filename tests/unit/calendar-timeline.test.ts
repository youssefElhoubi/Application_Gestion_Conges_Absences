import { describe, it, expect } from 'vitest';
import {
  getWeekDays,
  getAdjacentWeek,
} from '@/src/lib/calendar/calendar-grid';
import { extractDateKey } from '@/src/lib/calendar/calendar-events';
import { AbsenceListItem } from '@/src/lib/api/absence-client';
import { EmployeeListItem } from '@/src/lib/api/employee-client';

describe('Weekly / Team Absence Timeline Engine (Unit Tests)', () => {
  const createMockEmployee = (id: string, name: string, siteId: number = 1, siteName: string = 'Casablanca'): EmployeeListItem => ({
    employeeId: id,
    cin: 'AB12345',
    cnssNumber: '123456789',
    fullName: name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@entreprise.ma`,
    siteId,
    jobTitle: 'Ingénieur',
    department: 'Informatique',
    birthDate: '1990-01-01',
    hireDate: '2020-01-01',
    active: true,
    observation: null,
    managerId: null,
    site: { id: siteId, name: siteName, city: siteName },
  });

  const createMockAbsence = (
    id: string,
    employeeId: string,
    employeeName: string,
    startDate: string,
    endDate: string,
    fraction: 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON' = 'FULL_DAY',
    status: 'APPROVED' | 'PENDING' = 'APPROVED',
    typeColor: string = '#3b82f6'
  ): AbsenceListItem => ({
    id,
    employeeId,
    typeId: 1,
    startDate,
    endDate,
    fraction,
    calculatedWorkingDays: fraction === 'FULL_DAY' ? 1 : 0.5,
    enteredDays: fraction === 'FULL_DAY' ? 1 : 0.5,
    retainedDays: fraction === 'FULL_DAY' ? 1 : 0.5,
    supportingDocumentProvided: false,
    status,
    requestDate: '2026-10-01',
    createdAt: '2026-10-01',
    employee: {
      employeeId,
      fullName: employeeName,
      siteId: 1,
      site: { name: 'Casablanca' },
    },
    type: {
      id: 1,
      code: 'CONGE_PAYE',
      name: 'Congé Payé Annuel',
      colorHex: typeColor,
      isDeductible: true,
    },
  });

  describe('1. Week Calculation & Boundaries', () => {
    it('computes exactly 7 days starting on Monday and ending on Sunday for any given date', () => {
      // Oct 15, 2026 is a Thursday
      const week = getWeekDays('2026-10-15');

      expect(week.days.length).toBe(7);
      expect(week.mondayDateKey).toBe('2026-10-12'); // Monday
      expect(week.sundayDateKey).toBe('2026-10-18'); // Sunday
      expect(week.days[0].dayNameFr).toBe('Lundi');
      expect(week.days[6].dayNameFr).toBe('Dimanche');
      expect(week.formattedWeekLabelFr).toBe('Semaine du 12 au 18 Octobre 2026');
    });

    it('handles week boundaries spanning across month and year transitions', () => {
      // Oct 28, 2026 is Wednesday -> Week spans Oct 26 to Nov 1
      const crossMonthWeek = getWeekDays('2026-10-28');
      expect(crossMonthWeek.mondayDateKey).toBe('2026-10-26');
      expect(crossMonthWeek.sundayDateKey).toBe('2026-11-01');
      expect(crossMonthWeek.formattedWeekLabelFr).toBe('Semaine du 26 Octobre au 1 Novembre 2026');

      // Dec 31, 2026 is Thursday -> Week spans Dec 28, 2026 to Jan 3, 2027
      const crossYearWeek = getWeekDays('2026-12-31');
      expect(crossYearWeek.mondayDateKey).toBe('2026-12-28');
      expect(crossYearWeek.sundayDateKey).toBe('2027-01-03');
      expect(crossYearWeek.formattedWeekLabelFr).toBe('Semaine du 28 Décembre 2026 au 3 Janvier 2027');
    });

    it('navigates weeks backward and forward preserving exact 7-day offsets', () => {
      const startMonday = '2026-10-12';
      const prevMonday = getAdjacentWeek(startMonday, 'prev');
      const nextMonday = getAdjacentWeek(startMonday, 'next');

      expect(prevMonday).toBe('2026-10-05');
      expect(nextMonday).toBe('2026-10-19');

      // Month boundary wrap
      const endOfOctMonday = '2026-10-26';
      expect(getAdjacentWeek(endOfOctMonday, 'next')).toBe('2026-11-02');
    });
  });

  describe('2. Multi-Day Spanning & Clamping Logic on Weekly Timeline', () => {
    it('correctly clamps multi-day absences to the active week grid boundaries', () => {
      // Active week: Monday Oct 12 to Sunday Oct 18, 2026
      const week = getWeekDays('2026-10-15');
      const weekStart = week.mondayDateKey; // 2026-10-12
      const weekEnd = week.sundayDateKey; // 2026-10-18

      // Absence spanning 2 weeks: Oct 08 to Oct 15
      const overlappingAbsence = createMockAbsence('1', 'EMP-001', 'Fatima Alami', '2026-10-08', '2026-10-15');

      const absStart = extractDateKey(overlappingAbsence.startDate);
      const absEnd = extractDateKey(overlappingAbsence.endDate);

      // Verify overlap detection
      const overlaps = absStart <= weekEnd && absEnd >= weekStart;
      expect(overlaps).toBe(true);

      // Clamp calculation:
      const clampedStart = absStart < weekStart ? weekStart : absStart;
      const clampedEnd = absEnd > weekEnd ? weekEnd : absEnd;

      expect(clampedStart).toBe('2026-10-12'); // Clamped to Monday
      expect(clampedEnd).toBe('2026-10-15'); // Actual end on Thursday

      const startCol = week.days.findIndex((d) => d.dateKey === clampedStart) + 1;
      const endCol = week.days.findIndex((d) => d.dateKey === clampedEnd) + 1;
      const colSpan = endCol - startCol + 1;

      expect(startCol).toBe(1); // Monday is column 1
      expect(colSpan).toBe(4); // Monday, Tuesday, Wednesday, Thursday = 4 days
    });

    it('correctly places single-day and half-day absences on exact weekday columns', () => {
      const week = getWeekDays('2026-10-15');
      const singleAbsence = createMockAbsence('2', 'EMP-002', 'Karim Bennani', '2026-10-16', '2026-10-16', 'HALF_DAY_MORNING');

      const absStart = extractDateKey(singleAbsence.startDate);
      const startIdx = week.days.findIndex((d) => d.dateKey === absStart);

      expect(startIdx).toBe(4); // Friday = index 4 (0-based)
      expect(week.days[startIdx].dayNameFr).toBe('Vendredi');
      expect(singleAbsence.fraction).toBe('HALF_DAY_MORNING');
    });
  });

  describe('3. Employee and Site Filtering on Team Timeline', () => {
    it('filters timeline rows by site and employee selection', () => {
      const employees = [
        createMockEmployee('EMP-001', 'Ali Amrani', 1, 'Casablanca'),
        createMockEmployee('EMP-002', 'Sara Mansouri', 1, 'Casablanca'),
        createMockEmployee('EMP-003', 'Omar Tazi', 2, 'Rabat'),
      ];

      // Filter by Site 1
      const siteFiltered = employees.filter((e) => e.siteId === 1);
      expect(siteFiltered.length).toBe(2);
      expect(siteFiltered.map((e) => e.fullName)).toEqual(['Ali Amrani', 'Sara Mansouri']);

      // Filter by Search query
      const searchFiltered = employees.filter((e) => e.fullName.toLowerCase().includes('omar'));
      expect(searchFiltered.length).toBe(1);
      expect(searchFiltered[0].employeeId).toBe('EMP-003');
    });

    it('identifies employees who are absent during the week vs present', () => {
      const employees = [
        createMockEmployee('EMP-001', 'Ali Amrani'),
        createMockEmployee('EMP-002', 'Sara Mansouri'),
      ];

      const absences = [
        createMockAbsence('1', 'EMP-001', 'Ali Amrani', '2026-10-14', '2026-10-15'),
      ];

      const weekStart = '2026-10-12';
      const weekEnd = '2026-10-18';

      const absentEmployeeIds = new Set(
        absences
          .filter((a) => extractDateKey(a.startDate) <= weekEnd && extractDateKey(a.endDate) >= weekStart)
          .map((a) => a.employeeId)
      );

      const absentEmployees = employees.filter((e) => absentEmployeeIds.has(e.employeeId));
      expect(absentEmployees.length).toBe(1);
      expect(absentEmployees[0].employeeId).toBe('EMP-001');
      expect(absentEmployeeIds.has('EMP-001')).toBe(true);
      expect(absentEmployeeIds.has('EMP-002')).toBe(false);
    });
  });

  describe('4. Multi-Absence Row Dynamic Expansion (Regression Bug 5)', () => {
    it('handles multiple non-overlapping absences for the same employee in the same week', () => {
      // Employee has 2 distinct absence requests in the same week:
      // Request 1: Monday morning (Oct 12)
      // Request 2: Friday full day (Oct 16)
      const empAbsences = [
        createMockAbsence('1', 'EMP-001', 'Ali Amrani', '2026-10-12', '2026-10-12', 'HALF_DAY_MORNING'),
        createMockAbsence('2', 'EMP-001', 'Ali Amrani', '2026-10-16', '2026-10-16', 'FULL_DAY'),
      ];

      const weekStart = '2026-10-12';
      const weekEnd = '2026-10-18';
      const days = getWeekDays('2026-10-15').days;

      const mapped = empAbsences.map((absence) => {
        const absStart = extractDateKey(absence.startDate);
        const absEnd = extractDateKey(absence.endDate);
        const clampedStart = absStart < weekStart ? weekStart : absStart;
        const clampedEnd = absEnd > weekEnd ? weekEnd : absEnd;
        const startIdx = days.findIndex((d) => d.dateKey === clampedStart);
        const endIdx = days.findIndex((d) => d.dateKey === clampedEnd);
        return {
          id: absence.id,
          startIdx,
          endIdx,
          colSpan: endIdx - startIdx + 1,
          gridColumnStart: startIdx + 1,
          gridColumnEnd: startIdx + 1 + (endIdx - startIdx + 1),
        };
      });

      expect(mapped.length).toBe(2);
      // Monday is column 1
      expect(mapped[0].gridColumnStart).toBe(1);
      expect(mapped[0].colSpan).toBe(1);
      // Friday is column 5
      expect(mapped[1].gridColumnStart).toBe(5);
      expect(mapped[1].colSpan).toBe(1);
    });
  });
});
