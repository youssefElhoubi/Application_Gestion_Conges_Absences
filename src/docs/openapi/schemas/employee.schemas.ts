import { OpenAPIV3 } from 'openapi-types';

export const employeeSchemas: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject> = {
  CreateEmployeeInput: {
    type: 'object',
    properties: {
      employeeId: { type: 'string', minLength: 2, maxLength: 50, example: 'MAT-00105', description: 'Business matricule' },
      cin: { type: 'string', minLength: 3, maxLength: 20, example: 'AB123456', description: 'National Identity Card (CIN)' },
      cnssNumber: { type: 'string', maxLength: 20, nullable: true, example: '123456789', description: 'Social security number' },
      fullName: { type: 'string', minLength: 2, maxLength: 150, example: 'Fatima Zahra Mansouri' },
      email: { type: 'string', format: 'email', maxLength: 150, example: 'f.mansouri@company.ma' },
      siteId: { type: 'integer', minimum: 1, example: 1, description: 'Assigned corporate work site ID' },
      jobTitle: { type: 'string', maxLength: 100, nullable: true, example: 'Senior Software Engineer' },
      department: { type: 'string', maxLength: 100, nullable: true, example: 'Engineering' },
      birthDate: { type: 'string', format: 'date', nullable: true, example: '1995-04-12' },
      hireDate: { type: 'string', format: 'date', example: '2023-01-15', description: 'Anchor date for seniority and statutory accrual' },
      managerId: { type: 'string', maxLength: 50, nullable: true, example: 'MAT-00001', description: 'Reporting manager employeeId' },
      observation: { type: 'string', maxLength: 500, nullable: true, example: 'Senior staff member' },
    },
    required: ['employeeId', 'cin', 'fullName', 'email', 'siteId', 'hireDate'],
  },
  UpdateEmployeeInput: {
    type: 'object',
    properties: {
      cin: { type: 'string', maxLength: 20, example: 'AB123456' },
      cnssNumber: { type: 'string', maxLength: 20, nullable: true, example: '123456789' },
      fullName: { type: 'string', minLength: 2, maxLength: 150, example: 'Fatima Zahra Mansouri' },
      email: { type: 'string', format: 'email', maxLength: 150, example: 'f.mansouri@company.ma' },
      siteId: { type: 'integer', minimum: 1, example: 1 },
      jobTitle: { type: 'string', maxLength: 100, nullable: true, example: 'Lead Architect' },
      department: { type: 'string', maxLength: 100, nullable: true, example: 'Product Engineering' },
      birthDate: { type: 'string', format: 'date', nullable: true, example: '1995-04-12' },
      hireDate: { type: 'string', format: 'date', example: '2023-01-15' },
      managerId: { type: 'string', maxLength: 50, nullable: true, example: 'MAT-00001' },
      observation: { type: 'string', maxLength: 500, nullable: true, example: 'Promoted to lead' },
    },
  },
  EmployeeListItem: {
    type: 'object',
    properties: {
      employeeId: { type: 'string', example: 'MAT-00104' },
      cin: { type: 'string', example: 'BK654321' },
      cnssNumber: { type: 'string', nullable: true, example: '987654321' },
      fullName: { type: 'string', example: 'Youssef El Houbi' },
      email: { type: 'string', format: 'email', example: 'youssef@company.ma' },
      siteId: { type: 'integer', example: 1 },
      jobTitle: { type: 'string', nullable: true, example: 'Full Stack Engineer' },
      department: { type: 'string', nullable: true, example: 'Information Systems' },
      birthDate: { type: 'string', format: 'date', nullable: true, example: '1998-06-20' },
      hireDate: { type: 'string', format: 'date', example: '2024-02-01' },
      active: { type: 'boolean', example: true },
      observation: { type: 'string', nullable: true, example: null },
      managerId: { type: 'string', nullable: true, example: 'MAT-00001' },
      site: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Casablanca Head Office' },
          city: { type: 'string', nullable: true, example: 'Casablanca' },
        },
      },
      manager: {
        type: 'object',
        nullable: true,
        properties: {
          employeeId: { type: 'string', example: 'MAT-00001' },
          fullName: { type: 'string', example: 'General Manager' },
        },
      },
    },
    required: ['employeeId', 'cin', 'fullName', 'email', 'siteId', 'hireDate', 'active'],
  },
  EmployeeDetail: {
    allOf: [
      { $ref: '#/components/schemas/EmployeeListItem' },
      {
        type: 'object',
        properties: {
          calculatedAge: { type: 'integer', nullable: true, example: 28, description: 'Computed age in completed years.' },
          isMinor: { type: 'boolean', example: false, description: 'True if employee is under 18 (subject to statutory 2 days/month accrual rate).' },
          seniorityMonths: { type: 'integer', example: 32, description: 'Total continuous service months.' },
          seniorityYears: { type: 'integer', example: 2, description: 'Total continuous service years.' },
          isEligibleForAnnualLeave: { type: 'boolean', example: true, description: 'True if 6+ months continuous service is met (Article 231 Code du Travail).' },
        },
      },
    ],
  },
  EmployeeBalances: {
    type: 'object',
    properties: {
      employeeId: { type: 'string', example: 'MAT-00104' },
      statutoryAccruedDays: { type: 'number', format: 'float', example: 22.5, description: 'Legal paid leave days earned based on seniority rate.' },
      activeRecoveryCreditDays: { type: 'number', format: 'float', example: 2.0, description: 'Available unconsumed holiday work recovery days.' },
      totalApprovedDeductions: { type: 'number', format: 'float', example: 6.0, description: 'Sum of approved paid and recovery leave deductions.' },
      netAvailableBalance: { type: 'number', format: 'float', example: 18.5, description: 'Net disposable leave days available for booking.' },
      isEligibleForAnnualLeave: { type: 'boolean', example: true },
      serviceMonths: { type: 'integer', example: 15 },
      serviceYears: { type: 'integer', example: 1 },
    },
    required: ['employeeId', 'statutoryAccruedDays', 'activeRecoveryCreditDays', 'totalApprovedDeductions', 'netAvailableBalance', 'isEligibleForAnnualLeave'],
  },
  PaginatedEmployeesResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/EmployeeListItem' },
      },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
    required: ['data', 'meta'],
  },
};
