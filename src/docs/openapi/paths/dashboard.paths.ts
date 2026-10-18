import { OpenAPIV3_1 } from 'openapi-types';

export const dashboardPaths: OpenAPIV3_1.PathsObject = {
  '/api/dashboard/metrics': {
    get: {
      tags: ['Dashboard'],
      summary: 'Get 5 core operational dashboard metrics',
      description: 'High-performance aggregated KPIs: active employees, validated leave days, available recovery days, unjustified absence days, and pending leave requests with leave type breakdown.',
      parameters: [
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Period start date' },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Period end date (must be >= startDate)' },
        { name: 'siteId', in: 'query', schema: { type: 'integer' }, description: 'Scope metrics to specific site' },
        { name: 'employeeId', in: 'query', schema: { type: 'string' }, description: 'Scope metrics to specific employee' },
        { name: 'periodMode', in: 'query', schema: { type: 'string', enum: ['custom', 'current_year', 'current_month', 'all_time'], default: 'current_year' } },
      ],
      responses: {
        '200': {
          description: 'Calculated core operational metrics',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DashboardMetricsResponse' },
            },
          },
        },
        '400': {
          description: 'Invalid date boundaries or filter parameters',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
  '/api/dashboard/summary': {
    get: {
      tags: ['Dashboard'],
      summary: 'Get executive dashboard summary analytics',
      description: 'Comprehensive dashboard metrics including period KPIs, category-by-category leave breakdown, and employee distribution by site.',
      parameters: [
        { name: 'siteId', in: 'query', schema: { type: 'integer' }, description: 'Filter by corporate site' },
        { name: 'year', in: 'query', schema: { type: 'integer', default: 2026 }, description: 'Target calendar year' },
        { name: 'month', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12 }, description: 'Target month (1-12, optional)' },
      ],
      responses: {
        '200': {
          description: 'Dashboard analytics summary',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DashboardSummaryResponse' },
            },
          },
        },
        '400': {
          description: 'Invalid query filters',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
};
