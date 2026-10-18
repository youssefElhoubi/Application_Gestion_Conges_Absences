import { OpenAPIV3 } from 'openapi-types';

export const counterSchemas: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject> = {
  CounterCalculationBreakdown: {
    type: 'object',
    properties: {
      monthlyRateApplied: { type: 'number', format: 'float', example: 1.5, description: 'Statutory monthly base rate (1.5 days/month or 2.0 for minors).' },
      isMinorRate: { type: 'boolean', example: false },
      seniorityMonths: { type: 'integer', example: 32 },
      maxYearlyCapEnforced: { type: 'boolean', example: false },
      unconsumedHolidayCreditsCount: { type: 'integer', example: 2 },
    },
    required: ['monthlyRateApplied', 'isMinorRate', 'seniorityMonths', 'maxYearlyCapEnforced', 'unconsumedHolidayCreditsCount'],
  },
  EmployeeCounterItem: {
    type: 'object',
    properties: {
      employeeId: { type: 'string', example: 'MAT-00104' },
      fullName: { type: 'string', example: 'Youssef El Houbi' },
      siteName: { type: 'string', example: 'Casablanca Head Office' },
      jobTitle: { type: 'string', nullable: true, example: 'Full Stack Engineer' },
      hireDate: { type: 'string', format: 'date', example: '2023-01-15' },
      active: { type: 'boolean', example: true },
      referenceDate: { type: 'string', format: 'date-time', example: '2026-10-18T00:00:00.000Z' },
      serviceMonths: { type: 'integer', example: 45 },
      serviceYears: { type: 'integer', example: 3 },
      isEligibleForAnnualLeave: { type: 'boolean', example: true },
      statutoryAccruedDays: { type: 'number', format: 'float', example: 67.5 },
      activeRecoveryCreditDays: { type: 'number', format: 'float', example: 3.0 },
      totalApprovedDeductions: { type: 'number', format: 'float', example: 24.0 },
      netAvailableBalance: { type: 'number', format: 'float', example: 46.5 },
      calculationBreakdown: { $ref: '#/components/schemas/CounterCalculationBreakdown' },
    },
    required: [
      'employeeId',
      'fullName',
      'referenceDate',
      'serviceMonths',
      'serviceYears',
      'isEligibleForAnnualLeave',
      'statutoryAccruedDays',
      'activeRecoveryCreditDays',
      'totalApprovedDeductions',
      'netAvailableBalance',
      'calculationBreakdown',
    ],
  },
  PaginatedCountersResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/EmployeeCounterItem' },
      },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
    required: ['data', 'meta'],
  },
};
