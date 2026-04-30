// Merchant Billing Zod schemas
import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../_shared/schema.js';

export { idParamSchema, paginationQuerySchema };

export const upgradePlanSchema = z.strictObject({
  planId: z.string().uuid(),
});
