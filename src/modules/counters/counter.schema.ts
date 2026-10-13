import { z } from 'zod';
import { PaginationQuerySchema } from '@/src/lib/pagination/pagination';

export const MultiEmployeeCounterQuerySchema = PaginationQuerySchema.extend({
  siteId: z.coerce.number().int().optional(),
  active: z.enum(['true', 'false', 'all']).default('true'),
  search: z.string().trim().optional(),
  asOfDate: z.coerce.date().optional(),
});

export type MultiEmployeeCounterQuery = z.infer<typeof MultiEmployeeCounterQuerySchema>;
