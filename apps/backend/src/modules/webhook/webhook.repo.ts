// Webhook Repository � DB operations
import { db } from '../../db/index.js';
import { webhooks, webhookDeliveries } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

export const webhookRepo = {
  async findByStoreId(storeId: string, limit = 50): Promise<typeof webhooks.$inferSelect[]> {
    return db.query.webhooks.findMany({
      where: eq(webhooks.storeId, storeId),
      orderBy: desc(webhooks.createdAt),
      limit,
    });
  },

  async findById(id: string, storeId: string): Promise<typeof webhooks.$inferSelect | undefined> {
    return db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, id), eq(webhooks.storeId, storeId)),
    });
  },

  async create(data: typeof webhooks.$inferInsert): Promise<typeof webhooks.$inferSelect> {
    const [row] = await db.insert(webhooks).values(data).returning();
    return row;
  },

  async update(id: string, storeId: string, data: Partial<typeof webhooks.$inferInsert>): Promise<typeof webhooks.$inferSelect | undefined> {
    const [row] = await db.update(webhooks)
      .set(data)
      .where(and(eq(webhooks.id, id), eq(webhooks.storeId, storeId)))
      .returning();
    return row;
  },

  async delete(id: string, storeId: string): Promise<void> {
    await db.delete(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.storeId, storeId)));
  },

  async findActiveByEvent(storeId: string, _event: string, limit = 50): Promise<typeof webhooks.$inferSelect[]> {
    return db.select().from(webhooks).where(
      and(
        eq(webhooks.storeId, storeId),
        eq(webhooks.isActive, true),
      ),
    ).limit(limit);
  },

  async createDelivery(data: typeof webhookDeliveries.$inferInsert): Promise<typeof webhookDeliveries.$inferSelect> {
    const [row] = await db.insert(webhookDeliveries).values(data).returning();
    return row;
  },

  async updateDelivery(id: string, data: Partial<typeof webhookDeliveries.$inferInsert>): Promise<void> {
    await db.update(webhookDeliveries).set(data).where(eq(webhookDeliveries.id, id));
  },

  async findDeliveries(webhookId: string, limit = 20): Promise<typeof webhookDeliveries.$inferSelect[]> {
    return db.query.webhookDeliveries.findMany({
      where: eq(webhookDeliveries.webhookId, webhookId),
      orderBy: desc(webhookDeliveries.createdAt),
      limit,
    });
  },
};
