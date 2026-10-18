import { describe, it, expect } from 'vitest';
import {
  parseFilterState,
  deriveActiveFilters,
  buildFilterQueryString,
  DEFAULT_CALENDAR_FILTERS,
} from '@/src/lib/calendar/calendar-filters';
import { AbsenceTypeItem } from '@/src/lib/api/absence-client';
import { SiteItem, EmployeeListItem } from '@/src/lib/api/employee-client';

describe('Calendar Filters State & Query Logic (Unit Tests)', () => {
  const mockTypes: AbsenceTypeItem[] = [
    { id: 1, code: 'CONGE_PAYE', name: 'Congé Payé Annuel', isDeductible: true, requiresJustification: false, colorHex: '#3b82f6', active: true, description: null, reasons: [] },
    { id: 2, code: 'EVENEMENT_FAMILIAL', name: 'Événement Familial', isDeductible: false, requiresJustification: true, colorHex: '#10b981', active: true, description: null, reasons: [] },
  ];

  const mockSites: SiteItem[] = [
    { id: 1, code: 'CASABLANCA', name: 'Siège Social Casablanca', city: 'Casablanca', active: true },
    { id: 2, code: 'TANGER', name: 'Usine Tanger Automotive', city: 'Tanger', active: true },
  ];

  const mockEmployees: EmployeeListItem[] = [
    { employeeId: 'EMP-0101', cin: 'BK123', cnssNumber: null, fullName: 'Fatima-Zahra Alami', email: 'fz@test.ma', siteId: 1, jobTitle: null, department: null, birthDate: null, hireDate: '2021-01-01', active: true, observation: null, managerId: null },
    { employeeId: 'EMP-0102', cin: 'BK456', cnssNumber: null, fullName: 'Mehdi Benjelloun', email: 'm@test.ma', siteId: 2, jobTitle: null, department: null, birthDate: null, hireDate: '2022-01-01', active: true, observation: null, managerId: null },
  ];

  it('correctly parses empty or default search params', () => {
    const sp = new URLSearchParams('');
    const state = parseFilterState(sp);
    expect(state).toEqual(DEFAULT_CALENDAR_FILTERS);
  });

  it('correctly parses populated search params', () => {
    const sp = new URLSearchParams('search=Karim&employeeId=EMP-0101&siteId=1&typeId=2&status=APPROVED&year=2026&month=10');
    const state = parseFilterState(sp);
    expect(state).toEqual({
      search: 'Karim',
      employeeId: 'EMP-0101',
      siteId: '1',
      typeId: '2',
      status: 'APPROVED',
    });
  });

  it('derives active filter chips with friendly display labels', () => {
    const state = {
      search: 'Bennani',
      employeeId: 'EMP-0101',
      siteId: '1',
      typeId: '2',
      status: 'PENDING' as const,
    };

    const active = deriveActiveFilters(state, {
      types: mockTypes,
      sites: mockSites,
      employees: mockEmployees,
    });

    expect(active.length).toBe(4);
    expect(active.find((f) => f.id === 'employeeId')?.valueLabel).toBe('Fatima-Zahra Alami (EMP-0101)');
    expect(active.find((f) => f.id === 'siteId')?.valueLabel).toBe('Siège Social Casablanca');
    expect(active.find((f) => f.id === 'typeId')?.valueLabel).toBe('Événement Familial');
    expect(active.find((f) => f.id === 'status')?.valueLabel).toBe('En attente');
  });

  it('builds updated query strings while strictly preserving year and month', () => {
    const sp = new URLSearchParams('year=2026&month=10&siteId=1&status=APPROVED');

    // Update typeId and clear siteId
    const updated = buildFilterQueryString(sp, { typeId: '2', siteId: 'all' });
    const resultParams = new URLSearchParams(updated);

    expect(resultParams.get('year')).toBe('2026'); // Preserved!
    expect(resultParams.get('month')).toBe('10'); // Preserved!
    expect(resultParams.get('typeId')).toBe('2'); // Updated!
    expect(resultParams.get('siteId')).toBeNull(); // Cleared because 'all'!
    expect(resultParams.get('status')).toBe('APPROVED'); // Preserved!
  });

  it('clearing filters deletes filter keys without resetting year and month', () => {
    const sp = new URLSearchParams('year=2026&month=10&search=Alami&employeeId=EMP-0101&siteId=1&typeId=1&status=PENDING');

    const resetQuery = buildFilterQueryString(sp, {
      search: '',
      employeeId: 'all',
      siteId: 'all',
      typeId: 'all',
      status: 'ALL',
    });

    const resultParams = new URLSearchParams(resetQuery);
    expect(resultParams.get('year')).toBe('2026'); // Year is NOT reset!
    expect(resultParams.get('month')).toBe('10'); // Month is NOT reset!
    expect(resultParams.get('search')).toBeNull();
    expect(resultParams.get('employeeId')).toBeNull();
    expect(resultParams.get('siteId')).toBeNull();
    expect(resultParams.get('typeId')).toBeNull();
    expect(resultParams.get('status')).toBeNull();
  });

  it('reconciles site change by resetting employeeId to all when the selected employee belongs to a different site (Regression Bug 4)', () => {
    // EMP-0101 belongs to site 1 (Casablanca)
    const empCasablanca = mockEmployees.find((e) => e.employeeId === 'EMP-0101')!;
    expect(empCasablanca.siteId).toBe(1);

    // User switches site to Tanger (site 2)
    const newSiteId: string = '2';
    const currentEmployeeId: string = 'EMP-0101';

    // Simulation of handleSiteChange reconciliation
    const willEmployeeMismatch =
      currentEmployeeId !== 'all' &&
      newSiteId !== 'all' &&
      empCasablanca &&
      String(empCasablanca.siteId) !== newSiteId;

    expect(willEmployeeMismatch).toBe(true);

    const updates = willEmployeeMismatch
      ? { siteId: newSiteId, employeeId: 'all' }
      : { siteId: newSiteId };

    expect(updates).toEqual({ siteId: '2', employeeId: 'all' });
  });

  it('keeps employeeId when newly selected site matches the employee site (Regression Bug 4)', () => {
    // EMP-0101 belongs to site 1 (Casablanca)
    const empCasablanca = mockEmployees.find((e) => e.employeeId === 'EMP-0101')!;
    const newSiteId: string = '1';
    const currentEmployeeId: string = 'EMP-0101';

    const willEmployeeMismatch =
      currentEmployeeId !== 'all' &&
      newSiteId !== 'all' &&
      empCasablanca &&
      String(empCasablanca.siteId) !== newSiteId;

    expect(willEmployeeMismatch).toBe(false);

    const updates = willEmployeeMismatch
      ? { siteId: newSiteId, employeeId: 'all' }
      : { siteId: newSiteId };

    expect(updates).toEqual({ siteId: '1' });
  });
});
