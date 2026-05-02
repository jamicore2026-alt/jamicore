// CMS Page repository — all Drizzle queries, no business logic
import { db } from '../../db/index.js';
import { cmsPages } from '../../db/schema.js';
import { eq, and, desc, ilike, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

type DbExecutor = DbOrTx;

export const cmsRepo = {
  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number; search?: string; isPublished?: boolean },
    tx?: DbExecutor,
  ) {
    const executor = tx ?? db;
    const conditions: SQL<unknown>[] = [eq(cmsPages.storeId, storeId)];

    if (options?.search) {
      conditions.push(ilike(cmsPages.title, `%${options.search}%`) as SQL<unknown>);
    }

    if (options?.isPublished !== undefined) {
      conditions.push(eq(cmsPages.isPublished, options.isPublished) as SQL<unknown>);
    }

    const items = await executor.query.cmsPages.findMany({
      where: and(...conditions),
      orderBy: [desc(cmsPages.createdAt)],
      limit: options?.limit,
      offset: options?.offset,
    });

    const [{ count }] = await executor
      .select({ count: sql<number>`count(*)::int` })
      .from(cmsPages)
      .where(and(...conditions));

    return { items, total: count };
  },

  async findById(id: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.cmsPages.findFirst({
      where: and(eq(cmsPages.id, id), eq(cmsPages.storeId, storeId)),
    });
  },

  async findBySlug(slug: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.cmsPages.findFirst({
      where: and(eq(cmsPages.slug, slug), eq(cmsPages.storeId, storeId)),
    });
  },

  async findPublishedBySlug(slug: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.cmsPages.findFirst({
      where: and(
        eq(cmsPages.slug, slug),
        eq(cmsPages.storeId, storeId),
        eq(cmsPages.isPublished, true),
      ),
    });
  },

  async create(data: typeof cmsPages.$inferInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [page] = await executor.insert(cmsPages).values(data).returning();
    return page;
  },

  async update(id: string, storeId: string, data: Partial<typeof cmsPages.$inferInsert>, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [page] = await executor
      .update(cmsPages)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(cmsPages.id, id), eq(cmsPages.storeId, storeId)))
      .returning();
    return page;
  },

  async delete(id: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [page] = await executor
      .delete(cmsPages)
      .where(and(eq(cmsPages.id, id), eq(cmsPages.storeId, storeId)))
      .returning();
    return page;
  },
};
