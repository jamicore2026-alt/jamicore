// API Key Zod schemas
import { z } from 'zod';

export const apiKeyScopeEnum = z.enum(['merchant', 'public', 'webhook']);

export const createApiKeySchema = z.strictObject({
  name: z.string().min(1).max(255),
  scopes: z.array(apiKeyScopeEnum).min(1),
  expiresInDays: z.coerce.number().min(1).max(365).optional(),
});

export const updateApiKeySchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  scopes: z.array(apiKeyScopeEnum).min(1).optional(),
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

export const listApiKeyQuerySchema = z.strictObject({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});
