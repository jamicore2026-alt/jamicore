// Webhook Repository � DB operations
import { db } from '../../db/index.js';
import { webhooks, webhookDeliveries } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

export const webhookRepo = {
  async findByStoreId(storeId: string) {
    return db.query.webhooks.findMany({
      where: eq(webhooks.storeId, storeId),
      orderBy: desc(webhooks.createdAt),
    });
  },

  async findById(id: string) {
    return db.query.webhooks.findFirst({
      where: eq(webhooks.id, id),
    });
  },

  async create(data: typeof webhooks.$inferInsert) {
    const [row] = await db.insert(webhooks).values(data).returning();
    return row;
  },

  async update(id: string, data: Partial<typeof webhooks.$inferInsert>) {
    const [row] = await db.update(webhooks).set(data).where(eq(webhooks.id, id)).returning();
    return row;
  },

  async delete(id: string) {
    await db.delete(webhooks).where(eq(webhooks.id, id));
  },

  async findActiveByEvent(storeId: string, _event: string) {
    return db.select().from(webhooks).where(
      and(
        eq(webhooks.storeId, storeId),
        eq(webhooks.isActive, true),
      ),
    );
  },

  async createDelivery(data: typeof webhookDeliveries.$inferInsert) {
    const [row] = await db.insert(webhookDeliveries).values(data).returning();
    return row;
  },

  async updateDelivery(id: string, data: Partial<typeof webhookDeliveries.$inferInsert>) {
    await db.update(webhookDeliveries).set(data).where(eq(webhookDeliveries.id, id));
  },

  async findDeliveries(webhookId: string, limit = 20) {
    return db.query.webhookDeliveries.findMany({
      where: eq(webhookDeliveries.webhookId, webhookId),
      orderBy: desc(webhookDeliveries.createdAt),
      limit,
    });
  },
};
