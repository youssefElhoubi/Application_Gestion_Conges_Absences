import { z } from 'zod';
import { Role } from '@/src/generated/prisma';

/**
 * Login Input Validation Schema
 * Enforces email syntax and normalizes case/whitespace before reaching service layer.
 */
export const LoginSchema = z.object({
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
    z
      .string({
        error: 'L\'adresse email est requise.',
      })
      .min(1, 'L\'adresse email est requise.')
      .email('Format d\'adresse email invalide.')
      .max(150, 'L\'adresse email ne peut pas dépasser 150 caractères.')
  ),
  password: z
    .string({
      error: 'Le mot de passe est requis.',
    })
    .min(1, 'Le mot de passe est requis.')
    .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères.'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Refresh Token Validation Schema (when supplied via payload or header fallback)
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z
    .string({
      error: 'Le jeton de rafraîchissement est requis.',
    })
    .min(1, 'Le jeton de rafraîchissement ne peut pas être vide.')
    .optional(),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

/**
 * Minimal Safe User Profile returned in authentication responses.
 * Never includes passwordHash or internal security audit timestamps.
 */
export interface SafeUserProfile {
  id: string;
  email: string;
  role: Role;
  employeeId: string | null;
}
