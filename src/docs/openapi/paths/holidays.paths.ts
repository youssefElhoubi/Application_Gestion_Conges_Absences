import { OpenAPIV3_1 } from 'openapi-types';

export const holidaysPaths: OpenAPIV3_1.PathsObject = {
  '/api/public-holidays': {
    get: {
      tags: ['Public Holidays'],
      summary: 'List public holidays',
      description: 'Paginated list of statutory legal public holidays with year and date range filtering.',
      parameters: [
        { name: 'year', in: 'query', schema: { type: 'integer' }, description: 'Filter by year (e.g. 2026)' },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search holiday label' },
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Range start date' },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Range end date' },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': {
          description: 'Paginated list of statutory holidays',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaginatedHolidaysResponse' },
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
      tags: ['Public Holidays'],
      summary: 'Create a new public holiday',
      description: 'Register a new public holiday in the corporate calendar. Restricted to ADMIN and HR_MANAGER.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreatePublicHolidayInput' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Public holiday registered successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PublicHolidayItem' },
            },
          },
        },
        '400': {
          description: 'A public holiday is already registered on this date or validation failed',
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
  '/api/public-holidays/{id}': {
    get: {
      tags: ['Public Holidays'],
      summary: 'Get public holiday detail by ID',
      description: 'Retrieve public holiday details including linked employee holiday work recovery credits.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: '14' },
          description: 'Public holiday ID (serialized BigInt)',
        },
      ],
      responses: {
        '200': {
          description: 'Public holiday detail with linked recovery credits',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PublicHolidayDetail' },
            },
          },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '404': {
          description: 'Public holiday not found',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
    patch: {
      tags: ['Public Holidays'],
      summary: 'Update public holiday attributes',
      description: 'Update the label, date, or religious nature of a public holiday. Restricted to ADMIN and HR_MANAGER.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: '14' },
          description: 'Public holiday ID',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdatePublicHolidayInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Public holiday updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PublicHolidayItem' },
            },
          },
        },
        '400': {
          description: 'Invalid input or date conflict',
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
    delete: {
      tags: ['Public Holidays'],
      summary: 'Delete public holiday',
      description: 'Delete a public holiday from the calendar. Operation is strictly blocked if employee recovery credits are linked to this holiday. Restricted to ADMIN.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: '14' },
          description: 'Public holiday ID',
        },
      ],
      responses: {
        '200': {
          description: 'Public holiday deleted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PublicHolidayItem' },
            },
          },
        },
        '400': {
          description: 'Cannot delete: employee recovery credits are linked to this holiday',
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
