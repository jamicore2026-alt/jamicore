// apps/backend/src/modules/theme/theme.schema.ts
import { z } from 'zod';

const customizationSchema = z.strictObject({
  primaryColor: z.string().max(50).optional(),
  primaryLight: z.string().max(50).optional(),
  textColor: z.string().max(50).optional(),
  textMuted: z.string().max(50).optional(),
  bgColor: z.string().max(50).optional(),
  cardBg: z.string().max(50).optional(),
  borderColor: z.string().max(50).optional(),
  footerBg: z.string().max(50).optional(),
  footerText: z.string().max(50).optional(),
  fontFamily: z.enum(['inter', 'playfair', 'roboto', 'poppins']).optional(),
  borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'xl']).optional(),
  buttonStyle: z.enum(['filled', 'outline', 'rounded']).optional(),
  cardShadow: z.enum(['none', 'sm', 'md', 'lg']).optional(),
  headerStyle: z.enum(['light', 'dark', 'transparent']).optional(),
  heroOverlay: z.enum(['none', 'light', 'dark']).optional(),
  spacing: z.enum(['compact', 'normal', 'spacious']).optional(),
}).optional();

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
  customization: customizationSchema,
});

export type ThemeSettingsInput = z.infer<typeof themeSettingsSchema>;
