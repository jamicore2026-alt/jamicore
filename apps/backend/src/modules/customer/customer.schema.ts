// Customer Zod schemas
import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../_shared/schema.js';

export { idParamSchema };

// --- Public/Customer route schemas ---

export { paginationQuerySchema as listQuerySchema };

export const updateProfileSchema = z.strictObject({
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  avatarUrl: z.string().optional(),
  marketingEmails: z.boolean().optional(),
});

// --- Merchant route schemas ---

export const createCustomerSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number',
  ),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  addresses: z.array(z.strictObject({
    name: z.string().min(1).max(255),
    firstName: z.string().min(1).max(255),
    lastName: z.string().min(1).max(255),
    addressLine1: z.string().min(1).max(500),
    addressLine2: z.string().max(500).optional(),
    city: z.string().min(1).max(255),
    state: z.string().max(255).optional(),
    country: z.string().min(1).max(255),
    postalCode: z.string().min(1).max(20),
    phone: z.string().max(50).optional(),
    isDefault: z.boolean().default(false),
  })).optional(),
});

export const updateCustomerSchema = z.strictObject({
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  avatarUrl: z.string().optional(),
  marketingEmails: z.boolean().optional(),
  tags: z.string().optional(),
});

export const customerListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tags: z.string().optional(),
});