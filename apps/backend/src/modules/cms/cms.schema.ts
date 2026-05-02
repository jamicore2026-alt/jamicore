// CMS Page Zod schemas
import { z } from 'zod';

export const createCmsPageSchema = z.strictObject({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens only' }),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  isPublished: z.boolean().optional(),
});

export const updateCmsPageSchema = z.strictObject({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  isPublished: z.boolean().optional(),
});

export const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

export const slugParamSchema = z.strictObject({
  slug: z.string().min(1),
});

export const listCmsPageQuerySchema = z.strictObject({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  search: z.string().optional(),
  isPublished: z.coerce.boolean().optional(),
});
