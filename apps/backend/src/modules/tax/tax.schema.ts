// Tax Zod schemas
import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';

export { idParamSchema };

// --- Public route schemas ---

export const taxCalculateSchema = z.strictObject({
  country: z.string().min(1).max(2),
  state: z.string().max(10).optional(),
  postalCode: z.string().max(20).optional(),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/),
  shipping: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
});

// --- Merchant route schemas ---

export const createTaxRateSchema = z.strictObject({
  name: z.string().min(1).max(255),
  rate: z.string().regex(/^(0(\.\d{1,6})?|1(\.0{1,6})?)$/, { message: 'Rate must be between 0 and 1' }),
  country: z.string().max(2).optional(), // ISO 3166-1 alpha-2
  state: z.string().max(10).optional(),
  postalCode: z.string().max(20).optional(),
  isCompound: z.boolean().optional(),
  priority: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateTaxRateSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  rate: z.string().regex(/^(0(\.\d{1,6})?|1(\.0{1,6})?)$/).optional(),
  country: z.string().max(2).optional(),
  state: z.string().max(10).optional(),
  postalCode: z.string().max(20).optional(),
  isCompound: z.boolean().optional(),
  priority: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});