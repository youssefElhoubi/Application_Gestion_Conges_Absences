import { OpenAPIV3_1 } from 'openapi-types';

export const sitesPaths: OpenAPIV3_1.PathsObject = {
  '/api/sites': {
    get: {
      tags: ['Sites'],
      summary: 'List corporate sites and work centers',
      description: 'Paginated list of company operational facilities, cities, timezones, and weekly rest days schedule (used in working days calculation).',
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search site code, name, or city' },
        { name: 'active', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'], default: 'all' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': {
          description: 'Paginated list of sites',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaginatedSitesResponse' },
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
      tags: ['Sites'],
      summary: 'Register a new operational site',
      description: 'Create a new corporate work site with dedicated weekly rest days. Restricted to ADMIN.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateSiteInput' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Site registered successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SiteItem' },
            },
          },
        },
        '400': {
          description: 'Site code or name already exists',
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
  '/api/sites/{id}': {
    get: {
      tags: ['Sites'],
      summary: 'Get site detail by ID',
      description: 'Retrieve site details including associated employee count and weekly rest schedule.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer', example: 1 },
          description: 'Site ID',
        },
      ],
      responses: {
        '200': {
          description: 'Site detail with employee count',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SiteItem' },
            },
          },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '404': {
          description: 'Site not found',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
    patch: {
      tags: ['Sites'],
      summary: 'Update site details',
      description: 'Update site code, name, city, timezone, or weekly rest schedule. Restricted to ADMIN.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer', example: 1 },
          description: 'Site ID',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateSiteInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Site updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SiteItem' },
            },
          },
        },
        '400': {
          description: 'Validation error',
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
