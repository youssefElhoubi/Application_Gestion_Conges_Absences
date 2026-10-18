import { OpenAPIV3_1 } from 'openapi-types';

export const creditsPaths: OpenAPIV3_1.PathsObject = {
  '/api/holiday-work-credits': {
    get: {
      tags: ['Holiday Work Credits'],
      summary: 'List worked holiday recovery credits',
      description: 'Paginated list of holiday work recovery credits. Employees see only their own credits; supervisors see their direct subordinates; HR and Admins see all.',
      parameters: [
        { name: 'employeeId', in: 'query', schema: { type: 'string' }, description: 'Filter by employee matricule' },
        { name: 'publicHolidayId', in: 'query', schema: { type: 'integer' }, description: 'Filter by public holiday ID' },
        { name: 'isFullyConsumed', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'], default: 'all' }, description: 'Consumption status filter' },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': {
          description: 'Paginated list of holiday work recovery credits',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaginatedCreditsResponse' },
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
      tags: ['Holiday Work Credits'],
      summary: 'Grant holiday work recovery credit',
      description: 'Record that an employee worked during a statutory public holiday and grant recovery credit days. Enforces uniqueness (one credit record per employee per public holiday). Restricted to ADMIN and HR_MANAGER.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/GrantHolidayCreditInput' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Recovery credit granted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HolidayWorkCreditItem' },
            },
          },
        },
        '400': {
          description: 'Credit already granted for this holiday or inactive employee',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden: Requires ADMIN or HR_MANAGER role',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
  '/api/holiday-work-credits/{id}': {
    get: {
      tags: ['Holiday Work Credits'],
      summary: 'Get holiday work credit detail',
      description: 'Retrieve credit record details including employee information and associated public holiday context.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: '201' },
          description: 'Credit ID (serialized BigInt)',
        },
      ],
      responses: {
        '200': {
          description: 'Credit detail',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HolidayWorkCreditItem' },
            },
          },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '404': {
          description: 'Credit record not found',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
    patch: {
      tags: ['Holiday Work Credits'],
      summary: 'Correct or adjust holiday work credit',
      description: 'Modify credited days on an existing credit with a mandatory audit comment. Cannot reduce credited days below already consumed days. Restricted to ADMIN.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: '201' },
          description: 'Credit ID',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CorrectHolidayCreditInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Credit corrected successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HolidayWorkCreditItem' },
            },
          },
        },
        '400': {
          description: 'Cannot reduce credited days below already consumed amount, or missing audit comment',
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
    delete: {
      tags: ['Holiday Work Credits'],
      summary: 'Revoke holiday work credit',
      description: 'Delete an unconsumed holiday work credit. Operation fails if any portion of the credit has already been consumed by approved recovery leave. Restricted to ADMIN and HR_MANAGER.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: '201' },
          description: 'Credit ID',
        },
      ],
      responses: {
        '200': {
          description: 'Credit revoked successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HolidayWorkCreditItem' },
            },
          },
        },
        '400': {
          description: 'Cannot revoke: credit has already been consumed by approved leave',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden: Requires ADMIN or HR_MANAGER role',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
};
