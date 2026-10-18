import { OpenAPIV3_1 } from 'openapi-types';

export const countersPaths: OpenAPIV3_1.PathsObject = {
  '/api/counters': {
    get: {
      tags: ['Counters'],
      summary: 'List organization-wide employee leave counters',
      description: 'Paginated multi-employee leave balances, seniority metrics, statutory monthly rates, and active recovery credits. Supports simulation as of a historical date.',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page index' },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Items per page' },
        { name: 'siteId', in: 'query', schema: { type: 'integer' }, description: 'Filter by site' },
        { name: 'active', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'], default: 'true' }, description: 'Active employee filter' },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by employee name or matricule' },
        { name: 'asOfDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Calculate balances as of specific historical date' },
      ],
      responses: {
        '200': {
          description: 'Paginated multi-employee leave counter breakdown',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaginatedCountersResponse' },
            },
          },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden: Requires ADMIN, HR_MANAGER, or SUPERVISOR role',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
};
