import { db } from '../../db/index.js';
import { cookieConsents } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

export const consentService = {
  async createConsent(storeId: string, data: {
    customerId?: string;
    ipAddress?: string;
    userAgent?: string;
    essential?: boolean;
    analytics?: boolean;
    marketing?: boolean;
  }) {
    const [row] = await db.insert(cookieConsents).values({
      storeId,
      ...data,
      essential: data.essential ?? true,
    }).returning();
    return row;
  },

  async getConsent(storeId: string, customerId?: string) {
    if (!customerId) return null;
    const [row] = await db.select().from(cookieConsents)
      .where(and(eq(cookieConsents.storeId, storeId), eq(cookieConsents.customerId, customerId)))
      .orderBy(cookieConsents.createdAt)
      .limit(1);
    return row ?? null;
  },

  async updateConsent(id: string, data: { analytics?: boolean; marketing?: boolean }) {
    const [row] = await db.update(cookieConsents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cookieConsents.id, id))
      .returning();
    return row;
  },
};
