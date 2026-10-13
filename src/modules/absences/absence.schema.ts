import { z } from 'zod';
import { PaginationQuerySchema } from '@/src/lib/pagination/pagination';

export const CreateAbsenceSchema = z
  .object({
    employeeId: z.string().min(2).max(50).trim(),
    typeId: z.coerce.number().int().positive(),
    reasonId: z.coerce.number().int().positive().optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    fraction: z.enum(['FULL_DAY', 'HALF_DAY_MORNING', 'HALF_DAY_AFTERNOON']).default('FULL_DAY'),
    supportingDocumentProvided: z.boolean().default(false),
    comment: z.string().max(500).trim().optional().nullable(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'Absence end date cannot be earlier than start date.',
    path: ['endDate'],
  })
  .refine(
    (d) => {
      if (d.fraction !== 'FULL_DAY') {
        const s = new Date(d.startDate).setHours(0, 0, 0, 0);
        const e = new Date(d.endDate).setHours(0, 0, 0, 0);
        return s === e;
      }
      return true;
    },
    {
      message: 'Half-day absences must begin and end on the exact same date.',
      path: ['fraction'],
    }
  );

export const ApproveAbsenceSchema = z.object({
  comment: z.string().max(500).trim().optional().nullable(),
});

export const RejectAbsenceSchema = z.object({
  reason: z.string().min(3, 'Rejection justification is mandatory.').max(500).trim(),
});

export const CancelAbsenceSchema = z.object({
  reason: z.string().max(500).trim().optional().nullable(),
});

export const AbsenceQuerySchema = PaginationQuerySchema.extend({
  employeeId: z.string().optional(),
  siteId: z.coerce.number().int().optional(),
  typeId: z.coerce.number().int().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ALL']).default('ALL'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().trim().optional(),
});

export type CreateAbsenceInput = z.infer<typeof CreateAbsenceSchema>;
export type ApproveAbsenceInput = z.infer<typeof ApproveAbsenceSchema>;
export type RejectAbsenceInput = z.infer<typeof RejectAbsenceSchema>;
export type CancelAbsenceInput = z.infer<typeof CancelAbsenceSchema>;
export type AbsenceQuery = z.infer<typeof AbsenceQuerySchema>;
