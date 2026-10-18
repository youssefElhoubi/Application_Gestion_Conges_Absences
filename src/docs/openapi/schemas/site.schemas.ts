import { OpenAPIV3 } from 'openapi-types';

export const siteSchemas: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject> = {
  CreateSiteInput: {
    type: 'object',
    properties: {
      code: { type: 'string', minLength: 2, maxLength: 50, example: 'CASA-HQ', description: 'Unique uppercase site identifier' },
      name: { type: 'string', minLength: 2, maxLength: 100, example: 'Siège Social Casablanca' },
      city: { type: 'string', maxLength: 100, nullable: true, example: 'Casablanca' },
      timezone: { type: 'string', default: 'Africa/Casablanca', example: 'Africa/Casablanca' },
      weeklyRestDays: {
        type: 'array',
        items: { type: 'integer', minimum: 0, maximum: 6 },
        default: [0],
        example: [0],
        description: 'Days of the week designated as non-working rest days (0 = Sunday, 6 = Saturday).',
      },
    },
    required: ['code', 'name'],
  },
  UpdateSiteInput: {
    type: 'object',
    properties: {
      code: { type: 'string', maxLength: 50, example: 'CASA-HQ' },
      name: { type: 'string', maxLength: 100, example: 'Siège Social Casablanca - Extension' },
      city: { type: 'string', maxLength: 100, nullable: true, example: 'Casablanca' },
      timezone: { type: 'string', example: 'Africa/Casablanca' },
      weeklyRestDays: {
        type: 'array',
        items: { type: 'integer', minimum: 0, maximum: 6 },
        example: [0, 6],
      },
    },
  },
  SiteItem: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      code: { type: 'string', example: 'CASA-HQ' },
      name: { type: 'string', example: 'Siège Social Casablanca' },
      city: { type: 'string', nullable: true, example: 'Casablanca' },
      timezone: { type: 'string', example: 'Africa/Casablanca' },
      weeklyRestDays: {
        type: 'array',
        items: { type: 'integer' },
        example: [0],
      },
      active: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00.000Z' },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00.000Z' },
      _count: {
        type: 'object',
        properties: {
          employees: { type: 'integer', example: 28 },
        },
      },
    },
    required: ['id', 'code', 'name', 'timezone', 'weeklyRestDays', 'active'],
  },
  PaginatedSitesResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/SiteItem' },
      },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
    required: ['data', 'meta'],
  },
};
