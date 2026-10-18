import { OpenAPIV3 } from 'openapi-types';

export const ruleSchemas: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject> = {
  CreateLeaveRuleInput: {
    type: 'object',
    properties: {
      code: { type: 'string', minLength: 2, maxLength: 50, example: 'ANNUAL_ACCRUAL_BASE', description: 'Unique uppercase rule identifier' },
      name: { type: 'string', minLength: 2, maxLength: 100, example: 'Taux légal mensuel de base' },
      value: { type: 'number', format: 'float', example: 1.5, description: 'Value of the rule' },
      unit: { $ref: '#/components/schemas/RuleUnitEnum', default: 'DAYS' },
      description: { type: 'string', maxLength: 255, nullable: true, example: 'Art. 231 Code du Travail: 1.5 jours par mois de service continu' },
    },
    required: ['code', 'name', 'value'],
  },
  UpdateLeaveRuleInput: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100, example: 'Taux légal mensuel ajusté' },
      value: { type: 'number', format: 'float', example: 1.75 },
      unit: { $ref: '#/components/schemas/RuleUnitEnum' },
      description: { type: 'string', maxLength: 255, nullable: true, example: 'Convention collective interne' },
    },
  },
  LeaveRuleItem: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '1', description: 'Rule ID (serialized from BigInt).' },
      code: { type: 'string', example: 'ANNUAL_ACCRUAL_BASE' },
      name: { type: 'string', example: 'Taux légal mensuel de base' },
      value: { type: 'number', format: 'float', example: 1.5 },
      unit: { $ref: '#/components/schemas/RuleUnitEnum' },
      description: { type: 'string', nullable: true, example: 'Art. 231: 1.5 jours par mois' },
      active: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00.000Z' },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00.000Z' },
    },
    required: ['id', 'code', 'name', 'value', 'unit', 'active'],
  },
  PaginatedRulesResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/LeaveRuleItem' },
      },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
    required: ['data', 'meta'],
  },
};
