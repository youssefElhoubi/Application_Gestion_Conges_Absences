import { z } from 'zod';
import { PaginationQuerySchema } from '@/src/lib/pagination/pagination';

export const CreateEmployeeSchema = z.object({
  employeeId: z.string().min(2).max(50).trim(),
  cin: z.string().min(3).max(20).trim(),
  cnssNumber: z.string().max(20).trim().optional().nullable(),
  fullName: z.string().min(2).max(150).trim(),
  email: z.string().email().max(150).trim().toLowerCase(),
  siteId: z.coerce.number().int().positive(),
  jobTitle: z.string().max(100).trim().optional().nullable(),
  department: z.string().max(100).trim().optional().nullable(),
  birthDate: z.coerce.date().optional().nullable(),
  hireDate: z.coerce.date(),
  managerId: z.string().max(50).trim().optional().nullable(),
  observation: z.string().max(500).trim().optional().nullable(),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().omit({ employeeId: true });

export const EmployeeQuerySchema = PaginationQuerySchema.extend({
  siteId: z.coerce.number().int().optional(),
  active: z.enum(['true', 'false', 'all']).default('all'),
  department: z.string().optional(),
  search: z.string().trim().optional(), // searches fullName, cin, or employeeId
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
export type EmployeeQuery = z.infer<typeof EmployeeQuerySchema>;
