import { OpenAPIV3 } from 'openapi-types';

export const absenceSchemas: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject> = {
  CreateAbsenceInput: {
    type: 'object',
    properties: {
      employeeId: {
        type: 'string',
        minLength: 2,
        maxLength: 50,
        example: 'MAT-00104',
        description: 'Matricule of the employee requesting leave.',
      },
      typeId: {
        type: 'integer',
        minimum: 1,
        example: 1,
        description: 'ID of the absence type (e.g. 1 for Paid Leave, 2 for Family Event).',
      },
      reasonId: {
        type: 'integer',
        minimum: 1,
        nullable: true,
        example: 3,
        description: 'Optional ID of specific sub-reason (e.g. Marriage, Birth).',
      },
      startDate: {
        type: 'string',
        format: 'date',
        example: '2026-11-02',
        description: 'Inclusive start date of the absence (YYYY-MM-DD).',
      },
      endDate: {
        type: 'string',
        format: 'date',
        example: '2026-11-06',
        description: 'Inclusive end date of the absence (YYYY-MM-DD). Must be >= startDate.',
      },
      fraction: {
        $ref: '#/components/schemas/FractionEnum',
        default: 'FULL_DAY',
      },
      supportingDocumentProvided: {
        type: 'boolean',
        default: false,
        example: false,
        description: 'Flag indicating whether official justification/medical document was attached.',
      },
      comment: {
        type: 'string',
        maxLength: 500,
        nullable: true,
        example: 'Annual vacation request for personal leave.',
      },
    },
    required: ['employeeId', 'typeId', 'startDate', 'endDate'],
  },
  ApproveAbsenceInput: {
    type: 'object',
    properties: {
      comment: {
        type: 'string',
        maxLength: 500,
        nullable: true,
        example: 'Approved as discussed with line manager.',
      },
    },
  },
  RejectAbsenceInput: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        minLength: 3,
        maxLength: 500,
        example: 'Operational constraints: insufficient staffing on requested dates.',
        description: 'Mandatory justification for rejecting the leave request.',
      },
    },
    required: ['reason'],
  },
  CancelAbsenceInput: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        maxLength: 500,
        nullable: true,
        example: 'Trip postponed; request cancelled.',
      },
    },
  },
  CalculatePreviewInput: {
    type: 'object',
    properties: {
      employeeId: {
        type: 'string',
        example: 'MAT-00104',
      },
      startDate: {
        type: 'string',
        format: 'date',
        example: '2026-11-02',
      },
      endDate: {
        type: 'string',
        format: 'date',
        example: '2026-11-06',
      },
      fraction: {
        $ref: '#/components/schemas/FractionEnum',
        default: 'FULL_DAY',
      },
    },
    required: ['employeeId', 'startDate', 'endDate'],
  },
  CalculatePreviewResponse: {
    type: 'object',
    properties: {
      calculatedWorkingDays: {
        type: 'number',
        format: 'float',
        example: 4.0,
        description: 'Statutory net working days to be deducted (excluding public holidays and weekly rest days).',
      },
      enteredDays: {
        type: 'number',
        format: 'float',
        example: 5.0,
        description: 'Total calendar span days.',
      },
      retainedDays: {
        type: 'number',
        format: 'float',
        example: 4.0,
        description: 'Net balance days deducted upon approval.',
      },
      excludedHolidaysCount: {
        type: 'integer',
        example: 1,
        description: 'Number of statutory public holidays falling inside the period.',
      },
      excludedWeeklyRestDaysCount: {
        type: 'integer',
        example: 0,
        description: 'Number of weekly site rest days (e.g. Sundays) falling inside the period.',
      },
      currentBalance: {
        $ref: '#/components/schemas/EmployeeBalances',
      },
    },
    required: ['calculatedWorkingDays', 'enteredDays', 'retainedDays', 'excludedHolidaysCount', 'excludedWeeklyRestDaysCount', 'currentBalance'],
  },
  AbsenceListItem: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '102', description: 'Unique absence ID (serialized from BigInt).' },
      employeeId: { type: 'string', example: 'MAT-00104' },
      typeId: { type: 'integer', example: 1 },
      reasonId: { type: 'integer', nullable: true, example: null },
      startDate: { type: 'string', format: 'date', example: '2026-11-02' },
      endDate: { type: 'string', format: 'date', example: '2026-11-06' },
      fraction: { $ref: '#/components/schemas/FractionEnum' },
      calculatedWorkingDays: { type: 'number', format: 'float', example: 4.0 },
      enteredDays: { type: 'number', format: 'float', example: 5.0 },
      retainedDays: { type: 'number', format: 'float', example: 4.0 },
      supportingDocumentProvided: { type: 'boolean', example: false },
      status: { $ref: '#/components/schemas/AbsenceStatusEnum' },
      requestDate: { type: 'string', format: 'date-time', example: '2026-10-18T10:30:00.000Z' },
      comment: { type: 'string', nullable: true, example: 'Annual paid leave.' },
      rejectionReason: { type: 'string', nullable: true, example: null },
      approvedById: { type: 'string', nullable: true, example: 'usr-admin-01' },
      approvedAt: { type: 'string', format: 'date-time', nullable: true, example: '2026-10-18T14:00:00.000Z' },
      createdAt: { type: 'string', format: 'date-time', example: '2026-10-18T10:30:00.000Z' },
      employee: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', example: 'MAT-00104' },
          fullName: { type: 'string', example: 'Youssef El Houbi' },
          siteId: { type: 'integer', example: 1 },
          site: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Casablanca Head Office' },
            },
          },
        },
      },
      type: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          code: { type: 'string', example: 'CONGE_PAYE' },
          name: { type: 'string', example: 'Congé Payé Annuel' },
        },
      },
      reason: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'integer', example: 2 },
          code: { type: 'string', example: 'MARIAGE_SALARIE' },
          name: { type: 'string', example: 'Mariage du salarié' },
        },
      },
    },
    required: ['id', 'employeeId', 'typeId', 'startDate', 'endDate', 'fraction', 'calculatedWorkingDays', 'enteredDays', 'retainedDays', 'status', 'requestDate'],
  },
  ApprovalHistoryItem: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '501', description: 'Audit log entry ID (serialized from BigInt).' },
      absenceId: { type: 'string', example: '102' },
      action: { $ref: '#/components/schemas/ApprovalActionEnum' },
      fromStatus: { $ref: '#/components/schemas/AbsenceStatusEnum' },
      toStatus: { $ref: '#/components/schemas/AbsenceStatusEnum' },
      performedByUserId: { type: 'string', nullable: true, example: 'usr-admin-01' },
      performedByEmployeeId: { type: 'string', nullable: true, example: 'MAT-00001' },
      comment: { type: 'string', nullable: true, example: 'Absence approved.' },
      createdAt: { type: 'string', format: 'date-time', example: '2026-10-18T14:00:00.000Z' },
    },
    required: ['id', 'absenceId', 'action', 'fromStatus', 'toStatus', 'createdAt'],
  },
  AbsenceDetail: {
    allOf: [
      { $ref: '#/components/schemas/AbsenceListItem' },
      {
        type: 'object',
        properties: {
          approvalHistory: {
            type: 'array',
            items: { $ref: '#/components/schemas/ApprovalHistoryItem' },
          },
        },
      },
    ],
  },
  PaginatedAbsencesResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/AbsenceListItem' },
      },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
    required: ['data', 'meta'],
  },
  AbsenceTypeItem: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      code: { type: 'string', example: 'CONGE_PAYE' },
      name: { type: 'string', example: 'Congé Payé Annuel' },
      description: { type: 'string', nullable: true, example: 'Congé annuel payé au titre du Code du Travail' },
      isDeductible: { type: 'boolean', example: true, description: 'True if it consumes from legal paid leave balance.' },
      requiresJustification: { type: 'boolean', example: false, description: 'True if legal proof/certificate is mandatory.' },
      colorHex: { type: 'string', example: '#2563eb' },
      active: { type: 'boolean', example: true },
      absenceReasons: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            typeId: { type: 'integer', example: 2 },
            code: { type: 'string', example: 'MARIAGE_SALARIE' },
            name: { type: 'string', example: 'Mariage du salarié' },
            allowedDays: { type: 'number', format: 'float', example: 4.0, description: 'Statutory legal entitlement cap in days.' },
            active: { type: 'boolean', example: true },
          },
        },
      },
    },
    required: ['id', 'code', 'name', 'isDeductible', 'requiresJustification', 'colorHex', 'active'],
  },
};
