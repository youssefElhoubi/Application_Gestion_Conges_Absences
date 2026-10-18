import { OpenAPIV3_1 } from 'openapi-types';

export const absencesPaths: OpenAPIV3_1.PathsObject = {
  '/api/absences': {
    get: {
      tags: ['Absences'],
      summary: 'List absence requests',
      description: 'Retrieve paginated absence requests filtered by employee, site, status, type, and date range. Access is scoped by role (employees view only their own requests; supervisors view their subordinates).',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page index (1-based)' },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 }, description: 'Items per page' },
        { name: 'sortBy', in: 'query', schema: { type: 'string' }, description: 'Sort field' },
        { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        { name: 'employeeId', in: 'query', schema: { type: 'string' }, description: 'Filter by employee matricule' },
        { name: 'siteId', in: 'query', schema: { type: 'integer' }, description: 'Filter by corporate site ID' },
        { name: 'typeId', in: 'query', schema: { type: 'integer' }, description: 'Filter by absence type ID' },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ALL'], default: 'ALL' } },
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter requests overlapping start date' },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter requests overlapping end date' },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search query for applicant name or matricule' },
      ],
      responses: {
        '200': {
          description: 'Paginated list of absence records',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaginatedAbsencesResponse' },
            },
          },
        },
        '400': {
          description: 'Invalid query parameters',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
    post: {
      tags: ['Absences'],
      summary: 'Submit a new absence request',
      description: 'Submit an absence or paid leave request. Enforces statutory working days computation, site rest days exclusion, public holiday exclusion, collision detection, and dynamic balance eligibility.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateAbsenceInput' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Absence request created successfully with status PENDING',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AbsenceListItem' },
            },
          },
        },
        '400': {
          description: 'Validation error, date collision, or insufficient leave balance',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden: Cannot create request for another employee without HR/Admin role',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
  '/api/absences/calculate': {
    post: {
      tags: ['Absences'],
      summary: 'Preview statutory working days and balance calculation',
      description: 'Preview net working days deduction, excluded weekly rest days (e.g. Sundays), and public holidays without committing changes to the database.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CalculatePreviewInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Accurate legal calculation breakdown and projected balance',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CalculatePreviewResponse' },
            },
          },
        },
        '400': {
          description: 'Missing required parameters or endDate earlier than startDate',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '404': {
          description: 'Employee not found',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
  '/api/absences/types': {
    get: {
      tags: ['Absences'],
      summary: 'List active absence types and reasons',
      description: 'Public reference endpoint returning statutory leave types (Paid Leave, Recovery, Family Events, Illness) and sub-reasons with statutory day caps.',
      security: [],
      responses: {
        '200': {
          description: 'List of active absence types with nested legal reasons',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/AbsenceTypeItem' },
              },
            },
          },
        },
        '500': {
          description: 'Internal server error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
  '/api/absences/{id}': {
    get: {
      tags: ['Absences'],
      summary: 'Get absence detail by ID',
      description: 'Retrieve detailed information on an absence request including employee context and immutable approval history audit trail.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: '102' },
          description: 'Unique absence ID (serialized BigInt)',
        },
      ],
      responses: {
        '200': {
          description: 'Absence detail with approval history',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AbsenceDetail' },
            },
          },
        },
        '400': {
          description: 'Invalid ID format',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden access to this employee record',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '404': {
          description: 'Absence not found',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
    put: {
      tags: ['Absences'],
      summary: 'Modify an existing pending absence request',
      description: 'Update dates, type, fraction, or justifications on an existing absence request. Strictly permitted only while the status is PENDING.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: '102' },
          description: 'Absence ID to update',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateAbsenceInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Absence request updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AbsenceListItem' },
            },
          },
        },
        '400': {
          description: 'Cannot modify non-pending request or validation error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden access to this employee record',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
  '/api/absences/{id}/approve': {
    post: {
      tags: ['Absences'],
      summary: 'Approve an absence request',
      description: 'Approve a pending leave request. Deducts statutory balance, consumes FIFO holiday recovery credits if recovery leave, records audit trail, and prohibits self-approval.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: '102' },
          description: 'Absence ID to approve',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApproveAbsenceInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Absence approved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AbsenceListItem' },
            },
          },
        },
        '400': {
          description: 'Concurrency conflict or status is not PENDING',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden: Self-approval violation or unauthorized role',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
  '/api/absences/{id}/reject': {
    post: {
      tags: ['Absences'],
      summary: 'Reject an absence request',
      description: 'Reject a pending leave request with a mandatory justification explanation. Appends action to approval history.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: '102' },
          description: 'Absence ID to reject',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RejectAbsenceInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Absence rejected successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AbsenceListItem' },
            },
          },
        },
        '400': {
          description: 'Missing rejection reason or status is not PENDING',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden: Unauthorized to review this leave request',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
  '/api/absences/{id}/cancel': {
    post: {
      tags: ['Absences'],
      summary: 'Cancel an absence request',
      description: 'Cancel a pending or approved leave request. Approved leaves that have already started strictly require HR_MANAGER or ADMIN intervention.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: '102' },
          description: 'Absence ID to cancel',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CancelAbsenceInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Absence cancelled successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AbsenceListItem' },
            },
          },
        },
        '400': {
          description: 'Absence is already closed or approved past leave requires HR',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden: Insufficient privileges to cancel this absence',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
};
