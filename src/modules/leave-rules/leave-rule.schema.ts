import { z } from 'zod';
import { PaginationQuerySchema } from '@/src/lib/pagination/pagination';

export const CreateLeaveRuleSchema = z.object({
  code: z.string().min(2).max(50).trim().toUpperCase(),
  name: z.string().min(2).max(100).trim(),
  value: z.coerce.number(),
  unit: z.enum(['DAYS', 'MONTHS', 'YEARS', 'PERCENTAGE', 'RATIO']).default('DAYS'),
  description: z.string().max(255).trim().optional().nullable(),
});

export const UpdateLeaveRuleSchema = CreateLeaveRuleSchema.partial().omit({ code: true });

export const LeaveRuleQuerySchema = PaginationQuerySchema.extend({
  active: z.enum(['true', 'false', 'all']).default('all'),
  search: z.string().trim().optional(),
});

export type CreateLeaveRuleInput = z.infer<typeof CreateLeaveRuleSchema>;
export type UpdateLeaveRuleInput = z.infer<typeof UpdateLeaveRuleSchema>;
export type LeaveRuleQuery = z.input<typeof LeaveRuleQuerySchema>;
