import { z } from 'zod';

export const DashboardFilterSchema = z.object({
  siteId: z.coerce.number().int().optional(),
  year: z.coerce.number().int().default(new Date().getFullYear()),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type DashboardFilter = z.infer<typeof DashboardFilterSchema>;
