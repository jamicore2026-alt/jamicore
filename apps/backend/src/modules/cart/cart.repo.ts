// Cart repository — Drizzle queries only. No business logic, no ErrorCodes.
import { eq, and, or, isNull, gt, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { carts, cartItems } from '../../db/schema.js';
import type { DbOrTx } from '../_shared/db-types.js';

export const cartRepo = {
  // ─── Read operations ───

  /**
   * Find cart by ID and store ID. Returns full cart row including
   * customerId and sessionId for ownership verification.
   */
  async findCartById(cartId: string, storeId: string) {
    return db.query.carts.findFirst({
      where: and(
        eq(carts.id, cartId),
        eq(carts.storeId, storeId),
        or(isNull(carts.expiresAt), gt(carts.expiresAt, new Date())),
      ),
      with: {
        items: {
          with: {
            product: true,
            bundle: {
              with: {
                items: {
                  with: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async findCartBySessionId(sessionId: string) {
    return db.query.carts.findFirst({
      where: eq(carts.sessionId, sessionId),
      with: {
        items: {
          with: {
            product: true,
            bundle: {
              with: {
                items: {
                  with: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async findCartItemsByCartId(cartId: string): Promise<typeof cartItems.$inferSelect[]> {
    return db.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  },

  async findCartItemById(itemId: string, cartId: string): Promise<typeof cartItems.$inferSelect | null> {
    return db.select().from(cartItems).where(
      and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId))
    ).then(rows => rows[0] ?? null);
  },

  async findCartItemsByProductId(cartId: string, productId: string): Promise<typeof cartItems.$inferSelect[]> {
    return db.select().from(cartItems).where(
      and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId))
    );
  },

  // ─── Write operations (transaction-aware) ───

  async insertCart(data: typeof carts.$inferInsert, tx?: DbOrTx): Promise<typeof carts.$inferSelect> {
    const executor = tx ?? db;
    const [cart] = await executor.insert(carts).values(data).returning();
    return cart;
  },

  async insertCartItem(data: typeof cartItems.$inferInsert, tx?: DbOrTx): Promise<typeof cartItems.$inferSelect> {
    const executor = tx ?? db;
    const [item] = await executor.insert(cartItems).values(data).returning();
    return item;
  },

  // Batched insert of multiple cart items in a single SQL statement.
  // Used by mergeCartOnLogin to avoid the N round-trips of insertCartItem.
  async insertCartItemsBatch(
    data: Array<typeof cartItems.$inferInsert>,
    tx?: DbOrTx,
  ): Promise<typeof cartItems.$inferSelect[]> {
    if (data.length === 0) return [];
    const executor = tx ?? db;
    return executor.insert(cartItems).values(data).returning();
  },

  // Batched increment of cart item quantities via a single UPDATE ... FROM (VALUES).
  // Each entry provides the item id, the quantity to add, and the new precomputed
  // total (the caller has already done the price * (existing+qty) arithmetic).
  async incrementCartItemQuantities(
    updates: Array<{ id: string; quantity: number; total: string }>,
    tx?: DbOrTx,
  ): Promise<typeof cartItems.$inferSelect[]> {
    if (updates.length === 0) return [];
    const executor = tx ?? db;
    // Build VALUES (('id1', qty1, total1), ('id2', qty2, total2), ...)
    // Drizzle doesn't have a direct "UPDATE FROM VALUES" helper, so use sql.raw
    // for the VALUES clause. The ids are UUIDs validated upstream, and the totals
    // are precomputed decimal strings, so injection is not a concern.
    const valuesSql = sql.join(
      updates.map((u) => sql`(${u.id}::uuid, ${u.quantity}::int, ${u.total}::numeric)`),
      sql`, `,
    );
    return executor
      .update(cartItems)
      .set({
        quantity: sql`cart_items.quantity + v.qty`,
        total: sql`v.total`,
        updatedAt: new Date(),
      })
      .from(sql`(${valuesSql}) AS v(id, qty, total)`)
      .where(sql`cart_items.id = v.id`)
      .returning();
  },

  async updateCartItem(itemId: string, data: Partial<typeof cartItems.$inferInsert>, tx?: DbOrTx): Promise<typeof cartItems.$inferSelect | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(cartItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cartItems.id, itemId))
      .returning();
    return updated;
  },

  async deleteCartItem(itemId: string, cartId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.delete(cartItems).where(
      and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)),
    );
  },

  async findCartByCustomerId(customerId: string, storeId: string) {
    return db.query.carts.findFirst({
      where: and(eq(carts.customerId, customerId), eq(carts.storeId, storeId)),
      with: {
        items: {
          with: {
            product: true,
            bundle: {
              with: {
                items: {
                  with: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async updateCartCustomerId(cartId: string, customerId: string, tx?: DbOrTx): Promise<typeof carts.$inferSelect | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(carts)
      .set({ customerId, updatedAt: new Date() })
      .where(eq(carts.id, cartId))
      .returning();
    return updated;
  },

  async deleteCart(cartId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.delete(carts).where(eq(carts.id, cartId));
  },

  async updateCartTotals(cartId: string, subtotal: string, total: string, itemCount: number, tx?: DbOrTx): Promise<typeof carts.$inferSelect | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(carts)
      .set({
        subtotal,
        total,
        itemCount,
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cartId))
      .returning();
    return updated;
  },

  /**
   * PERF-006: Single SQL UPDATE that recomputes cart totals in the database
   * using aggregate subqueries — replaces the previous
   * findCartItemsByCartId + JS loop + updateCartTotals (3 round-trips).
   *
   * One round-trip total: a single UPDATE that sets subtotal, total, and
   * itemCount from aggregates over cart_items.
   */
  async recalculateCartTotalsInDb(cartId: string, tx?: DbOrTx): Promise<typeof carts.$inferSelect | undefined> {
    const executor = tx ?? db;
    // COALESCE so an empty cart reads as 0 / 0.00 instead of NULL.
    const [updated] = await executor
      .update(carts)
      .set({
        subtotal: sql`COALESCE((SELECT SUM(${cartItems.total}) FROM ${cartItems} WHERE ${cartItems.cartId} = ${carts.id}), 0)::decimal(10,2)`,
        total: sql`COALESCE((SELECT SUM(${cartItems.total}) FROM ${cartItems} WHERE ${cartItems.cartId} = ${carts.id}), 0)::decimal(10,2)`,
        itemCount: sql`COALESCE((SELECT SUM(${cartItems.quantity}) FROM ${cartItems} WHERE ${cartItems.cartId} = ${carts.id}), 0)::int`,
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cartId))
      .returning();
    return updated;
  },
};