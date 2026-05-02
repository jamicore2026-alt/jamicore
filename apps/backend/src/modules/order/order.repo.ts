// Order repository — Drizzle queries only. No business logic, no ErrorCodes.
import { db } from '../../db/index.js';
import { orders, orderItems, products, carts, cartItems, coupons, couponUsages, customers } from '../../db/schema.js';
import { eq, and, desc, sql, count, ilike, or, gte, lte, inArray } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

type ProductLite = Pick<typeof products.$inferSelect, 'id' | 'titleEn' | 'titleAr' | 'images'>;
type CustomerLite = Pick<typeof customers.$inferSelect, 'id' | 'email' | 'firstName' | 'lastName' | 'phone' | 'storeId'>;
type OrderItemWithProduct = typeof orderItems.$inferSelect & { product: ProductLite | null };
type OrderWithDetails = typeof orders.$inferSelect & {
  items: OrderItemWithProduct[];
  customer: CustomerLite | null;
  coupon: typeof coupons.$inferSelect | null;
};

export const orderRepo = {
  // ─── Read operations ───

  async findByStoreId(storeId: string, opts: { page: number; limit: number; status?: string; search?: string }) {
    const conditions = [eq(orders.storeId, storeId)];
    if (opts.status) {
      conditions.push(eq(orders.status, opts.status));
    }
    if (opts.search) {
      const term = `%${opts.search}%`;
      conditions.push(or(
        ilike(orders.orderNumber, term),
        ilike(orders.email, term),
        ilike(orders.billingFirstName, term),
        ilike(orders.billingLastName, term),
        ilike(orders.shippingFirstName, term),
        ilike(orders.shippingLastName, term),
      ) as any);
    }
    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db.query.orders.findMany({
        where,
        orderBy: desc(orders.createdAt),
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
        with: {
          customer: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              storeId: true,
            },
          },
          items: true,
          coupon: true,
        },
      }),
      db.select({ count: count() })
        .from(orders)
        .where(where),
    ]);

    return {
      data: rows,
      total: totalResult[0]?.count ?? 0,
    };
  },

  async findAll(opts: { page: number; limit: number; status?: string; search?: string; dateFrom?: Date; dateTo?: Date }) {
    const conditions = [];
    if (opts.status) {
      conditions.push(eq(orders.status, opts.status));
    }
    if (opts.search) {
      const term = `%${opts.search}%`;
      conditions.push(or(
        ilike(orders.orderNumber, term),
        ilike(orders.email, term),
        ilike(orders.billingFirstName, term),
        ilike(orders.billingLastName, term),
        ilike(orders.shippingFirstName, term),
        ilike(orders.shippingLastName, term),
      ) as any);
    }
    if (opts.dateFrom) {
      conditions.push(gte(orders.createdAt, opts.dateFrom));
    }
    if (opts.dateTo) {
      conditions.push(lte(orders.createdAt, opts.dateTo));
    }
    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db.query.orders.findMany({
        where,
        orderBy: desc(orders.createdAt),
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
        with: {
          customer: {
            columns: { id: true, email: true, firstName: true, lastName: true, phone: true, storeId: true },
          },
          items: true,
        },
      }),
      db.select({ count: count() }).from(orders).where(where),
    ]);

    return { data: rows, total: totalResult[0]?.count ?? 0 };
  },

  async findByIdAdmin(orderId: string): Promise<OrderWithDetails | undefined> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        customer: {
          columns: { id: true, email: true, firstName: true, lastName: true, phone: true, storeId: true },
        },
        items: true,
        coupon: true,
      },
    });
    if (!order) return undefined;

    // Batch-load products to eliminate N+1
    const productIds = (order.items?.map((i) => i.productId).filter((id): id is string => !!id) ?? []);
    if (productIds.length > 0) {
      const productRows = await db.query.products.findMany({
        where: and(inArray(products.id, productIds)),
        columns: { id: true, titleEn: true, titleAr: true, images: true },
      });
      const productMap = new Map(productRows.map((p) => [p.id, p]));
      for (const item of order.items) {
        (item as OrderItemWithProduct).product = item.productId ? productMap.get(item.productId) ?? null : null;
      }
    }

    return order as OrderWithDetails;
  },

  async findById(orderId: string, storeId: string): Promise<OrderWithDetails | undefined> {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.storeId, storeId)),
      with: {
        customer: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            storeId: true,
          },
        },
        items: true,
        coupon: true,
      },
    });
    if (!order) return undefined;

    // Batch-load products to eliminate N+1
    const productIds = (order.items?.map((i) => i.productId).filter((id): id is string => !!id) ?? []);
    if (productIds.length > 0) {
      const productRows = await db.query.products.findMany({
        where: and(inArray(products.id, productIds), eq(products.storeId, storeId)),
        columns: { id: true, titleEn: true, titleAr: true, images: true },
      });
      const productMap = new Map(productRows.map((p) => [p.id, p]));
      for (const item of order.items) {
        (item as OrderItemWithProduct).product = item.productId ? productMap.get(item.productId) ?? null : null;
      }
    }

    return order as OrderWithDetails;
  },

  async findByIdSimple(orderId: string, storeId: string): Promise<typeof orders.$inferSelect | undefined> {
    return db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.storeId, storeId)),
    });
  },

  async findByOrderNumber(orderNumber: string, storeId: string) {
    return db.query.orders.findFirst({
      where: and(eq(orders.orderNumber, orderNumber), eq(orders.storeId, storeId)),
      with: {
        items: {
          with: {
            product: true,
          },
        },
        coupon: true,
      },
    });
  },

  async findOrderItems(orderId: string): Promise<typeof orderItems.$inferSelect[]> {
    return db.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
    });
  },

  // ─── Write operations (transaction-aware) ───

  async insertOrder(data: typeof orders.$inferInsert, tx?: DbOrTx): Promise<typeof orders.$inferSelect> {
    const executor = tx ?? db;
    const [order] = await executor.insert(orders).values(data).returning();
    return order;
  },

  async insertOrderItems(items: Array<typeof orderItems.$inferInsert>, tx?: DbOrTx): Promise<typeof orderItems.$inferSelect[]> {
    if (items.length === 0) return [];
    const executor = tx ?? db;
    return executor.insert(orderItems).values(items).returning();
  },

  /**
   * Decrement product inventory with race-condition guard.
   * Returns 0 rows if insufficient stock — caller must check and throw.
   */
  async decrementInventory(productId: string, storeId: string, quantity: number, tx?: DbOrTx): Promise<typeof products.$inferSelect[]> {
    const executor = tx ?? db;
    return executor
      .update(products)
      .set({
        currentQuantity: sql`${products.currentQuantity} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, productId),
          eq(products.storeId, storeId),
          sql`${products.currentQuantity} >= ${quantity}`,
        ),
      )
      .returning();
  },

  /**
   * Restore product inventory (e.g. on order cancellation).
   */
  async restoreInventory(productId: string, storeId: string, quantity: number, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .update(products)
      .set({
        currentQuantity: sql`${products.currentQuantity} + ${quantity}`,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)));
  },

  async deleteCartItems(cartId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.delete(cartItems).where(eq(cartItems.cartId, cartId));
  },

  async resetCartTotals(cartId: string, tx?: DbOrTx): Promise<typeof carts.$inferSelect | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(carts)
      .set({
        subtotal: '0',
        total: '0',
        itemCount: 0,
        couponCode: null,
        couponDiscount: '0',
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cartId))
      .returning();
    return updated;
  },

  async findCouponById(couponId: string, tx?: DbOrTx): Promise<typeof coupons.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.coupons.findFirst({
      where: eq(coupons.id, couponId),
    });
  },

  async incrementCouponUsage(
    couponId: string,
    customerId: string | undefined,
    orderId: string,
    storeId: string,
    tx?: DbOrTx,
  ): Promise<typeof coupons.$inferSelect[]> {
    const executor = tx ?? db;

    // Per-customer atomic guard
    if (customerId) {
      const coupon = await executor.query.coupons.findFirst({
        where: eq(coupons.id, couponId),
      });
      if (coupon && coupon.usageLimitPerCustomer) {
        const customerUsageCount = await executor
          .select({ count: sql<number>`count(*)` })
          .from(couponUsages)
          .where(and(
            eq(couponUsages.couponId, couponId),
            eq(couponUsages.customerId, customerId),
          ));

        if (customerUsageCount[0].count >= coupon.usageLimitPerCustomer) {
          throw new Error('Coupon per-customer usage limit exceeded');
        }
      }
    }

    const rows = await executor
      .update(coupons)
      .set({
        usageCount: sql`${coupons.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(coupons.id, couponId),
          sql`(${coupons.usageLimit} IS NULL OR ${coupons.usageCount} < ${coupons.usageLimit})`,
        ),
      )
      .returning();

    // Track per-customer usage
    if (rows.length > 0 && customerId) {
      await executor.insert(couponUsages).values({
        couponId,
        customerId,
        orderId,
        storeId,
        usedAt: new Date(),
      });
    }

    return rows;
  },

  async updateOrder(orderId: string, storeId: string, data: Partial<typeof orders.$inferInsert>, tx?: DbOrTx): Promise<typeof orders.$inferSelect | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(orders)
      .set(data)
      .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
      .returning();
    return updated;
  },
};