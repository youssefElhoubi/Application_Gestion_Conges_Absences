import { OpenAPIV3 } from 'openapi-types';

export const commonSchemas: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject> = {
  RoleEnum: {
    type: 'string',
    enum: ['ADMIN', 'HR_MANAGER', 'SUPERVISOR', 'EMPLOYEE'],
    description: 'System access role controlling permission scopes and workflow actions.',
    example: 'HR_MANAGER',
  },
  AbsenceStatusEnum: {
    type: 'string',
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
    description: 'Status in the absence approval state machine.',
    example: 'PENDING',
  },
  FractionEnum: {
    type: 'string',
    enum: ['FULL_DAY', 'HALF_DAY_MORNING', 'HALF_DAY_AFTERNOON'],
    description: 'Portion of the day requested for absence.',
    example: 'FULL_DAY',
  },
  RuleUnitEnum: {
    type: 'string',
    enum: ['DAYS', 'MONTHS', 'YEARS', 'PERCENTAGE', 'RATIO'],
    description: 'Unit of measurement for statutory leave rules.',
    example: 'DAYS',
  },
  ApprovalActionEnum: {
    type: 'string',
    enum: ['SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'CORRECTED'],
    description: 'Action recorded in the approval history audit trail.',
    example: 'APPROVED',
  },
  PaginationMeta: {
    type: 'object',
    properties: {
      page: { type: 'integer', example: 1, description: 'Current page number (1-indexed).' },
      pageSize: { type: 'integer', example: 20, description: 'Number of items returned per page.' },
      totalItems: { type: 'integer', example: 54, description: 'Total number of items matching filters.' },
      totalPages: { type: 'integer', example: 3, description: 'Total number of pages available.' },
      hasNextPage: { type: 'boolean', example: true, description: 'True if subsequent page exists.' },
      hasPrevPage: { type: 'boolean', example: false, description: 'True if preceding page exists.' },
    },
    required: ['page', 'pageSize', 'totalItems', 'totalPages', 'hasNextPage', 'hasPrevPage'],
  },
  ApiError: {
    type: 'object',
    properties: {
      error: {
        type: 'string',
        example: 'Authentication required to perform this action.',
        description: 'Human-readable error explanation.',
      },
      code: {
        type: 'string',
        example: 'UNAUTHENTICATED',
        description: 'Optional programmatic error or exception code.',
      },
    },
    required: ['error'],
  },
  ValidationError: {
    type: 'object',
    properties: {
      error: {
        type: 'string',
        example: 'Absence end date cannot be earlier than start date.',
        description: 'Zod validation or constraint error message.',
      },
    },
    required: ['error'],
  },
};
