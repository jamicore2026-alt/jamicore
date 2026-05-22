import { z } from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const customerRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(passwordRegex, 'Must contain uppercase, lowercase, and a digit'),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
});

export const merchantRegisterSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  domain: z.string().min(1, 'Domain is required'),
  ownerEmail: z.string().email('Invalid email address'),
  ownerName: z.string().min(1).optional(),
  ownerPhone: z.string().min(1).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(passwordRegex, 'Must contain uppercase, lowercase, and a digit'),
});

export const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(passwordRegex, 'Must contain uppercase, lowercase, and a digit'),
});

export const verifyMfaSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;
export type MerchantRegisterInput = z.infer<typeof merchantRegisterSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyMfaInput = z.infer<typeof verifyMfaSchema>;