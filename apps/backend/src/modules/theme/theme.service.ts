// apps/backend/src/modules/theme/theme.service.ts
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { storeThemeSettings } from '../../db/schema.js';
import { redis } from '../../services/redis.service.js';
import { ThemeSettingsInput } from './theme.schema.js';

const CACHE_PREFIX = 'theme:';
const CACHE_TTL = 300; // 5 minutes

export const themeService = {
  async findByStoreId(storeId: string) {
    // Try cache first
    const cached = await redis.get(`${CACHE_PREFIX}${storeId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to DB
    const [settings] = await db
      .select()
      .from(storeThemeSettings)
      .where(eq(storeThemeSettings.storeId, storeId))
      .limit(1);

    const result = settings || {
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
    };

    // Cache result
    await redis.setex(`${CACHE_PREFIX}${storeId}`, CACHE_TTL, JSON.stringify(result));
    return result;
  },

  async update(storeId: string, data: ThemeSettingsInput) {
    const now = new Date();

    // Upsert
    const [settings] = await db
      .insert(storeThemeSettings)
      .values({
        storeId,
        ...data,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [storeThemeSettings.storeId],
        set: { ...data, updatedAt: now },
      })
      .returning();

    // Invalidate cache
    await redis.del(`${CACHE_PREFIX}${storeId}`);

    return settings;
  },
};
