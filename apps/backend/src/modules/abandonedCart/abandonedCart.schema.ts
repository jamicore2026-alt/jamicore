// Abandoned Cart Zod schemas
import { z } from 'zod';
import { paginationQuerySchema } from '../_shared/schema.js';

export const listAbandonedCartsQuerySchema = paginationQuerySchema.extend({
  hoursSinceUpdate: z.coerce.number().int().min(1).max(720).optional(),
});
