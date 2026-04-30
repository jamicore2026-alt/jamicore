// Bundle repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { productBundles, productBundleItems, products } from '../../db/schema.js';
import { eq, and, desc, count, inArray, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export type BundleSelect = typeof productBundles.$inferSelect;
export type BundleInsert = typeof productBundles.$inferInsert;
export type BundleItemSelect = typeof productBundleItems.$inferSelect;
export type BundleItemInsert = typeof productBundleItems.$inferInsert;

export const bundleRepo = {
  async findManyByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number; isActive?: boolean },
    tx?: DbOrTx,
  ) {
    const executor = tx ?? db;
    const conditions: SQL<unknown>[] = [eq(productBundles.storeId, storeId)];

    if (options?.isActive !== undefined) {
      conditions.push(eq(productBundles.isActive, options.isActive));
    }

    const items = await executor.query.productBundles.findMany({
      where: and(...conditions),
      orderBy: [desc(productBundles.createdAt)],
      limit: options?.limit,
      offset: options?.offset,
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    const [{ count: total }] = await executor
      .select({ count: sql<number>`count(*)::int` })
      .from(productBundles)
      .where(and(...conditions));

    return { items, total };
  },

  async findById(bundleId: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.query.productBundles.findFirst({
      where: and(eq(productBundles.id, bundleId), eq(productBundles.storeId, storeId)),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });
  },

  async createBundle(data: BundleInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [bundle] = await executor.insert(productBundles).values(data).returning();
    return bundle;
  },

  async createBundleItems(items: BundleItemInsert[], tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.insert(productBundleItems).values(items).returning();
  },

  async updateBundle(bundleId: string, storeId: string, data: Partial<BundleInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [bundle] = await executor
      .update(productBundles)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(productBundles.id, bundleId), eq(productBundles.storeId, storeId)))
      .returning();
    return bundle;
  },

  async deleteBundleItemsByBundleId(bundleId: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .delete(productBundleItems)
      .where(and(
        eq(productBundleItems.bundleId, bundleId),
        eq(productBundleItems.storeId, storeId),
      ));
  },

  async deleteBundle(bundleId: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [bundle] = await executor
      .delete(productBundles)
      .where(and(eq(productBundles.id, bundleId), eq(productBundles.storeId, storeId)))
      .returning();
    return bundle;
  },

  async countByStoreId(storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    const rows = await executor
      .select({ count: count() })
      .from(productBundles)
      .where(eq(productBundles.storeId, storeId));
    return rows[0]?.count ?? 0;
  },

  async findProductsByIds(productIds: string[], storeId: string, tx?: DbOrTx): Promise<Array<typeof products.$inferSelect>> {
    const executor = tx ?? db;
    return executor.query.products.findMany({
      where: and(
        inArray(products.id, productIds),
        eq(products.storeId, storeId),
      ),
    });
  },

  async findBundlesByProductId(productId: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    // Step 1: find bundle IDs that contain this product
    const bundleIdRows = await executor
      .select({ bundleId: productBundleItems.bundleId })
      .from(productBundleItems)
      .where(eq(productBundleItems.productId, productId));
    const bundleIds = bundleIdRows.map((r) => r.bundleId);
    if (bundleIds.length === 0) return [];

    // Step 2: fetch active bundles with items
    return executor.query.productBundles.findMany({
      where: and(
        inArray(productBundles.id, bundleIds),
        eq(productBundles.storeId, storeId),
        eq(productBundles.isActive, true),
      ),
      with: {
        items: {
          with: {
            product: {
              columns: {
                id: true,
                titleEn: true,
                titleAr: true,
                descriptionEn: true,
                images: true,
                salePrice: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  },
};
