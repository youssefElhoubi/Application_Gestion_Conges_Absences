import { z } from 'zod';
import { PaginationQuerySchema } from '@/src/lib/pagination/pagination';

export const CreateSiteSchema = z.object({
  code: z.string().min(2).max(50).trim().toUpperCase(),
  name: z.string().min(2).max(100).trim(),
  city: z.string().max(100).trim().optional().nullable(),
  timezone: z.string().default('Africa/Casablanca'),
  weeklyRestDays: z.array(z.number().int().min(0).max(6)).default([0]),
});

export const UpdateSiteSchema = CreateSiteSchema.partial();

export const SiteQuerySchema = PaginationQuerySchema.extend({
  search: z.string().trim().optional(),
  active: z.enum(['true', 'false', 'all']).default('all'),
});

export type CreateSiteInput = z.infer<typeof CreateSiteSchema>;
export type UpdateSiteInput = z.infer<typeof UpdateSiteSchema>;
export type SiteQuery = z.infer<typeof SiteQuerySchema>;
