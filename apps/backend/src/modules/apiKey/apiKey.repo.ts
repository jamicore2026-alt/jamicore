// API Key repository — all Drizzle queries, no business logic
import { db } from '../../db/index.js';
import { apiKeys } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

type DbExecutor = DbOrTx;

export const apiKeyRepo = {
  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number },
    tx?: DbExecutor,
  ) {
    const executor = tx ?? db;
    const items = await executor.query.apiKeys.findMany({
      where: eq(apiKeys.storeId, storeId),
      orderBy: [desc(apiKeys.createdAt)],
      limit: options?.limit,
      offset: options?.offset,
    });

    const [{ count }] = await executor
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(eq(apiKeys.storeId, storeId));

    return { items, total: count };
  },

  async findById(id: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, id), eq(apiKeys.storeId, storeId)),
    });
  },

  async findByKeyHash(keyHash: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.apiKeys.findFirst({
      where: and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)),
    });
  },

  async create(data: typeof apiKeys.$inferInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [key] = await executor.insert(apiKeys).values(data).returning();
    return key;
  },

  async update(id: string, storeId: string, data: Partial<typeof apiKeys.$inferInsert>, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [key] = await executor
      .update(apiKeys)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.storeId, storeId)))
      .returning();
    return key;
  },

  async delete(id: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [key] = await executor
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.storeId, storeId)))
      .returning();
    return key;
  },

  async touchLastUsed(id: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    await executor
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  },
};
