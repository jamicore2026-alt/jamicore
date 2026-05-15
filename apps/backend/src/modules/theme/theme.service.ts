// apps/backend/src/modules/theme/theme.service.ts
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { storeThemeSettings } from '../../db/schema.js';
import { redis } from '../../services/redis.service.js';
import { ThemeSettingsInput } from './theme.schema.js';

const CACHE_PREFIX = 'theme:';
const CACHE_TTL = 300; // 5 minutes

export interface CustomizationSettings {
  primaryColor?: string;
  primaryLight?: string;
  textColor?: string;
  textMuted?: string;
  bgColor?: string;
  cardBg?: string;
  borderColor?: string;
  footerBg?: string;
  footerText?: string;
  fontFamily?: string;
  borderRadius?: string;
  buttonStyle?: string;
  cardShadow?: string;
  headerStyle?: string;
  heroOverlay?: string;
  spacing?: string;
}

export interface ThemeSettings {
  id: string;
  storeId: string;
  themeName: string;
  heroHeadline: string | null;
  heroSubtitle: string | null;
  heroButtonText: string | null;
  heroImageUrl: string | null;
  storyText: string | null;
  featuredProductIds: string[] | null;
  contactPhone: string | null;
  contactAddress: string | null;
  contactHours: string | null;
  googleMapsUrl: string | null;
  customization: CustomizationSettings | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export const themeService = {
  async findByStoreId(storeId: string): Promise<ThemeSettings> {
    // Try cache first
    const cached = await redis.get(`${CACHE_PREFIX}${storeId}`);
    if (cached) {
      return JSON.parse(cached) as ThemeSettings;
    }

    // Fallback to DB
    const [settings] = await db
      .select()
      .from(storeThemeSettings)
      .where(eq(storeThemeSettings.storeId, storeId))
      .limit(1);

    const result: ThemeSettings = settings || {
      id: '',
      storeId,
      themeName: 'classic',
      heroHeadline: null,
      heroSubtitle: null,
      heroButtonText: null,
      heroImageUrl: null,
      storyText: null,
      featuredProductIds: null,
      contactPhone: null,
      contactAddress: null,
      contactHours: null,
      googleMapsUrl: null,
      customization: null,
      createdAt: null,
      updatedAt: null,
    };

    // Cache result
    await redis.setex(`${CACHE_PREFIX}${storeId}`, CACHE_TTL, JSON.stringify(result));
    return result;
  },

  async update(storeId: string, data: ThemeSettingsInput) {
    const [settings] = await db
      .insert(storeThemeSettings)
      .values({ storeId, ...data })
      .onConflictDoUpdate({
        target: [storeThemeSettings.storeId],
        set: data,
      })
      .returning();

    // Invalidate cache
    await redis.del(`${CACHE_PREFIX}${storeId}`);

    return settings;
  },
};
