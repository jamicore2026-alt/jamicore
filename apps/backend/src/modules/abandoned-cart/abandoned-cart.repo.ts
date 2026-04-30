// Abandoned Cart repository — queries existing carts table for stale carts with items
import { db } from '../../db/index.js';
import { carts } from '../../db/schema.js';
import { eq, and, desc, sql, lt, gt } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export const abandonedCartRepo = {
  async findMany(
    storeId: string,
    options?: { limit?: number; offset?: number; hoursSinceUpdate?: number },
    tx?: DbOrTx,
  ) {
    const executor = tx ?? db;
    const hours = options?.hoursSinceUpdate ?? 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const conditions: SQL<unknown>[] = [
      eq(carts.storeId, storeId),
      gt(carts.itemCount, 0),
      lt(carts.updatedAt, cutoff),
    ];

    const items = await executor.query.carts.findMany({
      where: and(...conditions),
      orderBy: [desc(carts.updatedAt)],
      limit: options?.limit,
      offset: options?.offset,
      with: {
        customer: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          with: {
            product: {
              columns: {
                id: true,
                titleEn: true,
                titleAr: true,
                images: true,
                salePrice: true,
              },
            },
          },
        },
      },
    });

    const [{ count: total }] = await executor
      .select({ count: sql<number>`count(*)::int` })
      .from(carts)
      .where(and(...conditions));

    return { items, total };
  },

  async countByStoreId(storeId: string, hoursSinceUpdate?: number, tx?: DbOrTx) {
    const executor = tx ?? db;
    const hours = hoursSinceUpdate ?? 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const rows = await executor
      .select({ count: sql<number>`count(*)::int` })
      .from(carts)
      .where(
        and(
          eq(carts.storeId, storeId),
          gt(carts.itemCount, 0),
          lt(carts.updatedAt, cutoff),
        ),
      );

    return rows[0]?.count ?? 0;
  },
};
