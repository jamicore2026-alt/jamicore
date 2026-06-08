import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';

export { idParamSchema };

export const posProductQuerySchema = z.strictObject({
  search: z.string().optional(),
  barcode: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const posOrderItemSchema = z.strictObject({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1),
  price: z.number().int().min(0), // cents — display only, server re-fetches
});

export const createPosOrderSchema = z.strictObject({
  items: z.array(posOrderItemSchema).min(1),
  paymentMethod: z.enum(['cash', 'card', 'upi']),
  amountTendered: z.number().int().optional(),
  customerPhone: z.string().optional(),
});

export const posOrderListQuerySchema = z.strictObject({
  date: z.string().optional(),
  cashierId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
