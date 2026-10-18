import { OpenAPIV3_1 } from 'openapi-types';

export const employeesPaths: OpenAPIV3_1.PathsObject = {
  '/api/employees': {
    get: {
      tags: ['Employees'],
      summary: 'List employees directory',
      description: 'Paginated directory of employees with search and department/site filtering. Access is restricted to ADMIN, HR_MANAGER, and SUPERVISOR (supervisors restricted to reporting hierarchy).',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Page size' },
        { name: 'siteId', in: 'query', schema: { type: 'integer' }, description: 'Filter by corporate site' },
        { name: 'active', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'], default: 'all' }, description: 'Active status filter' },
        { name: 'department', in: 'query', schema: { type: 'string' }, description: 'Filter by department' },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by full name, CIN, or matricule' },
      ],
      responses: {
        '200': {
          description: 'Paginated list of employees',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaginatedEmployeesResponse' },
            },
          },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden: Requires ADMIN, HR_MANAGER, or SUPERVISOR role',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
    post: {
      tags: ['Employees'],
      summary: 'Register a new employee',
      description: 'Register a new employee with statutory hire date, national ID card (CIN), and optional reporting hierarchy. Restricted to ADMIN and HR_MANAGER.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateEmployeeInput' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Employee created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmployeeListItem' },
            },
          },
        },
        '400': {
          description: 'Identity collision (CIN, Email, or matricule already exists) or validation error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } },
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
  '/api/employees/{id}': {
    get: {
      tags: ['Employees'],
      summary: 'Get employee profile with dynamic metrics',
      description: 'Retrieve detailed employee information including dynamically computed seniority months/years, age, and Article 231 statutory leave eligibility.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: 'MAT-00104' },
          description: 'Employee business matricule',
        },
      ],
      responses: {
        '200': {
          description: 'Employee details with computed metrics',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmployeeDetail' },
            },
          },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden: Access denied to view this employee record',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '404': {
          description: 'Employee not found',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
    patch: {
      tags: ['Employees'],
      summary: 'Update employee information',
      description: 'Update departmental, site, contact, or observation details for an existing employee. Restricted to ADMIN and HR_MANAGER.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: 'MAT-00104' },
          description: 'Employee business matricule',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateEmployeeInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Employee updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmployeeListItem' },
            },
          },
        },
        '400': {
          description: 'Invalid input fields or referenced site does not exist',
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
  '/api/employees/{id}/counters': {
    get: {
      tags: ['Employees', 'Counters'],
      summary: 'Get employee dynamic leave balance and counters',
      description: 'Retrieve real-time legal leave accrual, active holiday work recovery credits, total approved deductions, and net available balance.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', example: 'MAT-00104' },
          description: 'Employee business matricule',
        },
      ],
      responses: {
        '200': {
          description: 'Real-time leave balance overview',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmployeeBalances' },
            },
          },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '403': {
          description: 'Forbidden: Access denied to view this employee balance',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '404': {
          description: 'Employee not found',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
};
