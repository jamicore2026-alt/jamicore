// Order Zod schemas
import { z } from 'zod';
import { paginationQuerySchema, idParamSchema } from '../_shared/schema.js';

export { idParamSchema };

// --- Public/Customer route schemas ---

export { paginationQuerySchema as listQuerySchema };

// --- Merchant route schemas ---

export const merchantListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  search: z.string().min(1).max(200).optional(),
});

export const updateStatusSchema = z.strictObject({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
});