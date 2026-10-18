import { OpenAPIV3 } from 'openapi-types';

export const meSchemas: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject> = {
  CurrentUserResponse: {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'usr-admin-01' },
          email: { type: 'string', format: 'email', example: 'admin@company.ma' },
          role: { $ref: '#/components/schemas/RoleEnum' },
        },
        required: ['id', 'email', 'role'],
      },
      employee: {
        allOf: [{ $ref: '#/components/schemas/EmployeeListItem' }],
        nullable: true,
      },
      balances: {
        allOf: [{ $ref: '#/components/schemas/EmployeeBalances' }],
        nullable: true,
      },
      upcomingAbsences: {
        type: 'array',
        items: { $ref: '#/components/schemas/AbsenceListItem' },
        description: 'Upcoming approved absences for this employee (next 5).',
      },
      upcomingHolidays: {
        type: 'array',
        items: { $ref: '#/components/schemas/PublicHolidayItem' },
        description: 'Upcoming company public holidays (next 5).',
      },
      unconsumedCredits: {
        type: 'array',
        items: { $ref: '#/components/schemas/HolidayWorkCreditItem' },
        description: 'Unconsumed holiday work credits available to use.',
      },
    },
    required: ['user', 'upcomingAbsences', 'upcomingHolidays', 'unconsumedCredits'],
  },
};
