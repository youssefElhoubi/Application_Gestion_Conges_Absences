import { OpenAPIV3 } from 'openapi-types';

export const dashboardSchemas: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject> = {
  PendingRequestTypeBreakdown: {
    type: 'object',
    properties: {
      typeCode: { type: 'string', example: 'CONGE_PAYE' },
      typeName: { type: 'string', example: 'Congé Payé Annuel' },
      count: { type: 'integer', example: 4 },
    },
    required: ['typeCode', 'typeName', 'count'],
  },
  DashboardMetricsResponse: {
    type: 'object',
    properties: {
      activeEmployees: { type: 'integer', example: 42, description: 'Total active employees in scope.' },
      validatedLeaveDays: { type: 'number', format: 'float', example: 128.5, description: 'Sum of approved paid leave days within target period.' },
      recoveryDaysAvailable: { type: 'number', format: 'float', example: 14.0, description: 'Total unconsumed recovery credit days.' },
      nonJustifiedAbsenceDays: { type: 'number', format: 'float', example: 3.0, description: 'Total unjustified absence days in period.' },
      pendingLeaveRequests: { type: 'integer', example: 5, description: 'Total pending requests awaiting approval.' },
      nonJustifiedAbsenceCount: { type: 'integer', example: 2 },
      recoveryDaysReserved: { type: 'number', format: 'float', example: 2.0, description: 'Pending recovery leave days reserved but not yet debited.' },
      pendingRequestsByType: {
        type: 'array',
        items: { $ref: '#/components/schemas/PendingRequestTypeBreakdown' },
      },
      generatedAt: { type: 'string', format: 'date-time', example: '2026-10-18T14:45:00.000Z' },
      period: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date', nullable: true, example: '2026-01-01' },
          endDate: { type: 'string', format: 'date', nullable: true, example: '2026-12-31' },
          mode: { type: 'string', example: 'current_year' },
        },
      },
      appliedFilters: {
        type: 'object',
        properties: {
          siteId: { type: 'integer', nullable: true, example: null },
          employeeId: { type: 'string', nullable: true, example: null },
          userScopeRole: { type: 'string', example: 'HR_MANAGER' },
        },
      },
    },
    required: [
      'activeEmployees',
      'validatedLeaveDays',
      'recoveryDaysAvailable',
      'nonJustifiedAbsenceDays',
      'pendingLeaveRequests',
      'nonJustifiedAbsenceCount',
      'recoveryDaysReserved',
      'pendingRequestsByType',
      'generatedAt',
    ],
  },
  DashboardKPIs: {
    type: 'object',
    properties: {
      totalActiveEmployees: { type: 'integer', example: 42 },
      pendingAbsenceRequests: { type: 'integer', example: 5 },
      pendingRequiringMyAction: { type: 'integer', example: 3, description: 'Requests requiring current user action (self-approval prohibited).' },
      totalApprovedDays: { type: 'number', format: 'float', example: 154.5 },
      totalApprovedRequestsCount: { type: 'integer', example: 38 },
      unjustifiedAbsenceDays: { type: 'number', format: 'float', example: 3.0 },
      availableRecoveryCredits: { type: 'number', format: 'float', example: 14.0 },
    },
    required: ['totalActiveEmployees', 'pendingAbsenceRequests', 'pendingRequiringMyAction', 'totalApprovedDays', 'totalApprovedRequestsCount'],
  },
  AbsenceCategoryBreakdown: {
    type: 'object',
    properties: {
      typeId: { type: 'integer', example: 1 },
      code: { type: 'string', example: 'CONGE_PAYE' },
      name: { type: 'string', example: 'Congé Payé Annuel' },
      colorHex: { type: 'string', example: '#2563eb' },
      totalDays: { type: 'number', format: 'float', example: 112.0 },
      requestsCount: { type: 'integer', example: 25 },
    },
    required: ['typeId', 'code', 'name', 'colorHex', 'totalDays', 'requestsCount'],
  },
  SiteEmployeeDistribution: {
    type: 'object',
    properties: {
      siteId: { type: 'integer', example: 1 },
      siteName: { type: 'string', example: 'Casablanca Head Office' },
      city: { type: 'string', example: 'Casablanca' },
      activeEmployeesCount: { type: 'integer', example: 28 },
    },
    required: ['siteId', 'siteName', 'city', 'activeEmployeesCount'],
  },
  DashboardSummaryResponse: {
    type: 'object',
    properties: {
      period: {
        type: 'object',
        properties: {
          year: { type: 'integer', example: 2026 },
          month: { type: 'integer', nullable: true, example: null },
          startDate: { type: 'string', format: 'date', example: '2026-01-01' },
          endDate: { type: 'string', format: 'date', example: '2026-12-31' },
        },
        required: ['year', 'startDate', 'endDate'],
      },
      kpis: { $ref: '#/components/schemas/DashboardKPIs' },
      categoryBreakdown: {
        type: 'array',
        items: { $ref: '#/components/schemas/AbsenceCategoryBreakdown' },
      },
      employeesBySite: {
        type: 'array',
        items: { $ref: '#/components/schemas/SiteEmployeeDistribution' },
      },
    },
    required: ['period', 'kpis', 'categoryBreakdown', 'employeesBySite'],
  },
};
