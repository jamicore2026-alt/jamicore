// Store Zod schemas
import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';

export { idParamSchema };

// --- Super-admin route schemas ---

export const updateStoreSchema = z.strictObject({
  planId: z.string().uuid().nullable().optional(),
  planExpiresAt: z.string().datetime().nullable().optional(),
  status: z.enum(['pending', 'active', 'suspended']).optional(),
});

export const storeListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'active', 'suspended']).optional(),
  search: z.string().max(100).optional(),
});

// --- Merchant route schemas ---

// Strict validation patterns to prevent CSS/JS injection via theme fields
export const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color (e.g. #0ea5e9 or #fff)');
export const cssRadius = z.string().regex(/^\d{1,4}px$/, 'Must be a valid CSS radius (e.g. 12px)');
export const cssFontStack = z.string().regex(/^[a-zA-Z0-9,\s"'-]{1,200}$/, 'Must be a valid CSS font-family value');
export const cssRgbaColor = z.string().regex(/^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[01]?\.\d+\s*\)$|^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex or rgba color');

export const merchantUpdateStoreSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  domain: z.string().min(1).max(255).optional(),
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  backgroundColor: hexColor.optional(),
  surfaceColor: hexColor.optional(),
  textColor: hexColor.optional(),
  textSecondaryColor: hexColor.optional(),
  borderColor: cssRgbaColor.optional(),
  borderRadius: cssRadius.optional(),
  fontFamily: cssFontStack.optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  activeTheme: z.string().max(50).optional(),
  currency: z.string().max(3).optional(),
  language: z.string().max(5).optional(),
  heroImage: z.string().url().optional(),
  heroTitle: z.string().max(255).optional(),
  heroSubtitle: z.string().max(500).optional(),
  heroCtaText: z.string().max(100).optional(),
  heroCtaLink: z.string().max(500).optional(),
  heroEnabled: z.boolean().optional(),
});