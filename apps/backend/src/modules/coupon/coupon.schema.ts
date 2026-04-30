// Coupon Zod schemas
import { z } from 'zod';

export const listQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createCouponSchema = z.strictObject({
  code: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  type: z.enum(['percentage', 'fixed', 'free_shipping']),
  value: z.string().regex(/^(\d+|\d*\.\d{1,2})$/),
  minOrderAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxDiscountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  freeShipping: z.boolean().default(false),
  usageLimit: z.number().int().min(1).optional(),
  usageLimitPerCustomer: z.number().int().min(1).default(1),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  appliesTo: z.enum(['all', 'products', 'categories']).default('all'),
  productIds: z.string().optional(),
  categoryIds: z.string().optional(),
});

export const updateCouponSchema = z.strictObject({
  code: z.string().min(1).max(50).optional(),
  description: z.string().max(500).nullable().optional(),
  type: z.enum(['percentage', 'fixed', 'free_shipping']).optional(),
  value: z.string().regex(/^(\d+|\d*\.\d{1,2})$/).optional(),
  minOrderAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  maxDiscountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  freeShipping: z.boolean().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  usageLimitPerCustomer: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  appliesTo: z.enum(['all', 'products', 'categories']).optional(),
  productIds: z.string().nullable().optional(),
  categoryIds: z.string().nullable().optional(),
});

export const validateSchema = z.strictObject({
  code: z.string().min(1).max(50),
  orderAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});