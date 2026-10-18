import { OpenAPIV3_1 } from 'openapi-types';

export const rulesPaths: OpenAPIV3_1.PathsObject = {
  '/api/leave-rules': {
    get: {
      tags: ['Leave Rules'],
      summary: 'List statutory leave calculation rules',
      description: 'Paginated list of Moroccan Labor Code statutory parameters (base accrual rate, seniority bonus steps, minimum age thresholds).',
      parameters: [
        { name: 'active', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'], default: 'all' }, description: 'Active filter' },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search rule name or code' },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': {
          description: 'Paginated list of statutory leave rules',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaginatedRulesResponse' },
            },
          },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
    post: {
      tags: ['Leave Rules'],
      summary: 'Create statutory leave rule',
      description: 'Create a new leave accrual or calculation parameter. Restricted to ADMIN.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateLeaveRuleInput' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Statutory leave rule created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LeaveRuleItem' },
            },
          },
        },
        '400': {
          description: 'Rule code already exists or validation error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden: Requires ADMIN role',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
};
