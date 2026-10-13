import { z } from 'zod';
import { PaginationQuerySchema } from '@/src/lib/pagination/pagination';

export const GrantHolidayCreditSchema = z.object({
  employeeId: z.string().min(2).max(50).trim(),
  publicHolidayId: z.coerce.number().int().positive(),
  creditedDays: z.coerce.number().positive().max(5).default(1.0),
  comment: z.string().max(255).trim().optional().nullable(),
});

export const CorrectHolidayCreditSchema = z.object({
  creditedDays: z.coerce.number().positive().max(5).optional(),
  comment: z.string().min(3, 'Audit comment is mandatory for corrections.').max(255).trim(),
});

export const HolidayCreditQuerySchema = PaginationQuerySchema.extend({
  employeeId: z.string().optional(),
  publicHolidayId: z.coerce.number().int().optional(),
  isFullyConsumed: z.enum(['true', 'false', 'all']).default('all'),
});

export type GrantHolidayCreditInput = z.infer<typeof GrantHolidayCreditSchema>;
export type CorrectHolidayCreditInput = z.infer<typeof CorrectHolidayCreditSchema>;
export type HolidayCreditQuery = z.infer<typeof HolidayCreditQuerySchema>;
