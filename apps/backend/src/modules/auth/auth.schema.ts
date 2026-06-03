// Auth Zod schemas
import { z } from 'zod';
import { loginSchema, verifyEmailSchema, emailSchema, resetPasswordSchema } from '../_shared/schema.js';

export { loginSchema, verifyEmailSchema, emailSchema, resetPasswordSchema };

// --- MFA schemas ---

export const verifyMfaSchema = z.strictObject({
  mfaToken: z.string().min(1),
  code: z.string().length(8).regex(/^\d{8}$/, 'Code must be 8 digits'),
});

export const enableMfaSchema = z.strictObject({
  password: z.string().min(1),
});

// --- Customer route schemas ---

export const registerSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number',
  ),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
});

// --- Merchant route schemas ---

export const merchantRegisterSchema = z.strictObject({
  storeName: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
  ownerEmail: z.email(),
  ownerName: z.string().max(255).optional(),
  ownerPhone: z.string().max(50).optional(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number',
  ),
});