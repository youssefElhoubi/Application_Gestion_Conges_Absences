import { z } from 'zod';
import { PaginationQuerySchema } from '@/src/lib/pagination/pagination';

export const CreatePublicHolidaySchema = z.object({
  date: z.coerce.date(),
  label: z.string().min(2).max(100).trim(),
  isReligious: z.boolean().default(false),
  comment: z.string().max(255).trim().optional().nullable(),
});

export const UpdatePublicHolidaySchema = CreatePublicHolidaySchema.partial();

export const PublicHolidayQuerySchema = PaginationQuerySchema.extend({
  year: z.coerce.number().int().optional(),
  search: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type CreatePublicHolidayInput = z.infer<typeof CreatePublicHolidaySchema>;
export type UpdatePublicHolidayInput = z.infer<typeof UpdatePublicHolidaySchema>;
export type PublicHolidayQuery = z.input<typeof PublicHolidayQuerySchema>;
