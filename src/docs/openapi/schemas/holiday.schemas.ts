import { OpenAPIV3 } from 'openapi-types';

export const holidaySchemas: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject> = {
  CreatePublicHolidayInput: {
    type: 'object',
    properties: {
      date: { type: 'string', format: 'date', example: '2026-11-18', description: 'Calendar date of the holiday (unique).' },
      label: { type: 'string', minLength: 2, maxLength: 100, example: "Fête de l'Indépendance" },
      isReligious: { type: 'boolean', default: false, example: false, description: 'True for lunar/religious holidays subject to confirmation.' },
      comment: { type: 'string', maxLength: 255, nullable: true, example: 'Fête nationale marocaine' },
    },
    required: ['date', 'label'],
  },
  UpdatePublicHolidayInput: {
    type: 'object',
    properties: {
      date: { type: 'string', format: 'date', example: '2026-11-18' },
      label: { type: 'string', minLength: 2, maxLength: 100, example: "Fête de l'Indépendance" },
      isReligious: { type: 'boolean', example: false },
      comment: { type: 'string', maxLength: 255, nullable: true, example: 'Fête nationale' },
    },
  },
  PublicHolidayItem: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '14', description: 'Unique public holiday ID (serialized from BigInt).' },
      date: { type: 'string', format: 'date', example: '2026-11-18' },
      label: { type: 'string', example: "Fête de l'Indépendance" },
      isReligious: { type: 'boolean', example: false },
      comment: { type: 'string', nullable: true, example: 'Fête nationale marocaine' },
      createdAt: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00.000Z' },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00.000Z' },
      _count: {
        type: 'object',
        properties: {
          holidayWorkCredits: { type: 'integer', example: 5, description: 'Number of recovery credits linked to this worked holiday.' },
        },
      },
    },
    required: ['id', 'date', 'label', 'isReligious'],
  },
  PublicHolidayDetail: {
    allOf: [
      { $ref: '#/components/schemas/PublicHolidayItem' },
      {
        type: 'object',
        properties: {
          holidayWorkCredits: {
            type: 'array',
            items: { $ref: '#/components/schemas/HolidayWorkCreditItem' },
          },
        },
      },
    ],
  },
  PaginatedHolidaysResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/PublicHolidayItem' },
      },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
    required: ['data', 'meta'],
  },
  GrantHolidayCreditInput: {
    type: 'object',
    properties: {
      employeeId: { type: 'string', minLength: 2, maxLength: 50, example: 'MAT-00104' },
      publicHolidayId: { type: 'integer', minimum: 1, example: 14, description: 'Target public holiday worked' },
      creditedDays: { type: 'number', format: 'float', minimum: 0.25, maximum: 5.0, default: 1.0, example: 1.0 },
      comment: { type: 'string', maxLength: 255, nullable: true, example: 'Worked maintenance shift on public holiday.' },
    },
    required: ['employeeId', 'publicHolidayId'],
  },
  CorrectHolidayCreditInput: {
    type: 'object',
    properties: {
      creditedDays: { type: 'number', format: 'float', minimum: 0.25, maximum: 5.0, example: 1.5 },
      comment: { type: 'string', minLength: 3, maxLength: 255, example: 'Audited half-day overtime addition.', description: 'Mandatory correction justification.' },
    },
    required: ['comment'],
  },
  HolidayWorkCreditItem: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '201', description: 'Credit ID (serialized from BigInt).' },
      employeeId: { type: 'string', example: 'MAT-00104' },
      publicHolidayId: { type: 'string', example: '14' },
      creditedDays: { type: 'number', format: 'float', example: 1.0 },
      consumedDays: { type: 'number', format: 'float', example: 0.0 },
      isFullyConsumed: { type: 'boolean', example: false, description: 'True when consumedDays equals or exceeds creditedDays.' },
      recordedByUserId: { type: 'string', nullable: true, example: 'usr-admin-01' },
      comment: { type: 'string', nullable: true, example: 'Credit for working on holiday' },
      createdAt: { type: 'string', format: 'date-time', example: '2026-10-18T00:00:00.000Z' },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-10-18T00:00:00.000Z' },
      employee: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', example: 'MAT-00104' },
          fullName: { type: 'string', example: 'Youssef El Houbi' },
          jobTitle: { type: 'string', nullable: true, example: 'Full Stack Engineer' },
          site: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Casablanca Head Office' },
            },
          },
        },
      },
      publicHoliday: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '14' },
          date: { type: 'string', format: 'date', example: '2026-11-18' },
          label: { type: 'string', example: "Fête de l'Indépendance" },
          isReligious: { type: 'boolean', example: false },
        },
      },
    },
    required: ['id', 'employeeId', 'publicHolidayId', 'creditedDays', 'consumedDays', 'isFullyConsumed'],
  },
  PaginatedCreditsResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/HolidayWorkCreditItem' },
      },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
    required: ['data', 'meta'],
  },
};
