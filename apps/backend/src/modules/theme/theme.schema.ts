// apps/backend/src/modules/theme/theme.schema.ts
import { z } from 'zod';

export const themeSettingsSchema = z.strictObject({
  themeName: z.enum(['classic', 'brio']).optional(),
  heroHeadline: z.string().max(255).optional(),
  heroSubtitle: z.string().max(500).optional(),
  heroButtonText: z.string().max(100).optional(),
  heroImageUrl: z.string().url().optional(),
  storyText: z.string().max(2000).optional(),
  featuredProductIds: z.array(z.string().uuid()).max(8).optional(),
  contactPhone: z.string().max(50).optional(),
  contactAddress: z.string().max(500).optional(),
  contactHours: z.string().max(200).optional(),
  googleMapsUrl: z.string().url().optional(),
});

export type ThemeSettingsInput = z.infer<typeof themeSettingsSchema>;
