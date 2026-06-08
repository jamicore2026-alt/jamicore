import { db } from '../../db/index.js';
import { and, eq, ilike, desc, count, sql } from 'drizzle-orm';
import { products, productVariantOptions, orders, orderItems } from '../../db/schema.js';
import type { DbOrTx } from '../_shared/db-types.js';
import { randomBytes } from 'node:crypto';

export const posRepo = {
  async searchProducts(
    storeId: string,
    opts: { search?: string; barcode?: string; limit: number },
  ) {
    if (opts.barcode) {
      return db.query.products.findMany({
        where: and(
          eq(products.storeId, storeId),
          eq(products.barcode, opts.barcode),
        ),
        with: {
          variants: {
            with: { options: true },
          },
        },
        limit: 1,
      });
    }

    if (opts.search) {
      return db.query.products.findMany({
        where: and(
          eq(products.storeId, storeId),
          ilike(products.titleEn, `%${opts.search}%`),
        ),
        with: {
          variants: {
            with: { options: true },
          },
        },
        limit: opts.limit,
        orderBy: desc(products.updatedAt),
      });
    }

    return db.query.products.findMany({
      where: eq(products.storeId, storeId),
      with: {
        variants: {
          with: { options: true },
        },
      },
      limit: opts.limit,
      orderBy: desc(products.updatedAt),
    });
  },

  async findProductsByIds(storeId: string, _productIds: string[], tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.query.products.findMany({
      where: eq(products.storeId, storeId),
      with: {
        variants: {
          with: { options: true },
        },
      },
    });
  },

  async decrementInventory(
    productId: string,
    storeId: string,
    quantity: number,
    variantOptionId: string | null,
    tx: DbOrTx,
  ) {
    if (variantOptionId) {
      // Decrement variant option stock
      const [result] = await tx
        .update(productVariantOptions)
        .set({ stockQuantity: sql`${productVariantOptions.stockQuantity} - ${quantity}` })
        .where(
          and(
            eq(productVariantOptions.id, variantOptionId),
            sql`${productVariantOptions.stockQuantity} >= ${quantity}`,
          ),
        )
        .returning({ stockQuantity: productVariantOptions.stockQuantity });

      if (!result) {
        throw Object.assign(new Error(`Insufficient inventory for variant option ${variantOptionId}`), {
          code: 'INSUFFICIENT_INVENTORY',
        });
      }
      return result;
    }

    // Decrement product-level stock
    const [result] = await tx
      .update(products)
      .set({ currentQuantity: sql`${products.currentQuantity} - ${quantity}` })
      .where(
        and(
          eq(products.id, productId),
          eq(products.storeId, storeId),
          sql`${products.currentQuantity} >= ${quantity}`,
        ),
      )
      .returning({ currentQuantity: products.currentQuantity });

    if (!result) {
      throw Object.assign(new Error(`Insufficient inventory for product ${productId}`), {
        code: 'INSUFFICIENT_INVENTORY',
      });
    }
    return result;
  },

  async generateOrderNumber(): Promise<string> {
    const MAX_RETRIES = 3;
    for (let i = 0; i < MAX_RETRIES; i++) {
      const num = `POS-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
      const existing = await db.query.orders.findFirst({
        where: eq(orders.orderNumber, num),
      });
      if (!existing) return num;
    }
    throw new Error('Failed to generate unique POS order number');
  },

  async createOrder(
    data: {
      storeId: string;
      cashierId: string;
      customerId?: string | null;
      customerPhone?: string | null;
      email: string;
      currency: string;
      orderType: string;
      paymentMethod: string;
      items: Array<{
        productId: string;
        variantId?: string | null;
        productImage?: string | null;
        productTitle: string;
        variantName?: string | null;
        quantity: number;
        price: number;
        total: number;
      }>;
      subtotal: number;
      tax: number;
      total: number;
      amountTendered?: number | null;
      changeGiven?: number | null;
      status: string;
    },
    tx: DbOrTx,
  ) {
    const orderNumber = await this.generateOrderNumber();

    const [order] = await tx
      .insert(orders)
      .values({
        storeId: data.storeId,
        cashierId: data.cashierId,
        customerId: data.customerId ?? null,
        email: data.email,
        phone: data.customerPhone ?? null,
        currency: data.currency,
        orderNumber,
        orderType: data.orderType,
        status: data.status,
        paymentStatus: 'paid',
        subtotal: String(data.subtotal),
        tax: String(data.tax),
        total: String(data.total),
        paymentMethod: data.paymentMethod,
        posPaymentMethod: data.paymentMethod,
        amountTendered: data.amountTendered != null ? String(data.amountTendered) : null,
        changeGiven: data.changeGiven != null ? String(data.changeGiven) : null,
      })
      .returning();

    if (data.items.length > 0) {
      await tx.insert(orderItems).values(
        data.items.map((item) => ({
          orderId: order!.id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          productTitle: item.productTitle,
          productImage: item.productImage ?? null,
          variantName: item.variantName ?? null,
          quantity: item.quantity,
          price: String(item.price),
          total: String(item.total),
          storeId: data.storeId,
        })),
      );
    }

    return order!;
  },

  async listPosOrders(
    storeId: string,
    opts: { date?: string; cashierId?: string; page: number; limit: number },
  ) {
    const conditions = [eq(orders.storeId, storeId), eq(orders.orderType, 'pos')];

    if (opts.cashierId) {
      conditions.push(eq(orders.cashierId, opts.cashierId));
    }

    const offset = (opts.page - 1) * opts.limit;

    const rows = await db.query.orders.findMany({
      where: and(...conditions),
      with: { items: true },
      limit: opts.limit,
      offset,
      orderBy: desc(orders.createdAt),
    });

    const totalResult = await db
      .select({ count: count() })
      .from(orders)
      .where(and(...conditions));

    return { data: rows, total: totalResult[0]?.count ?? 0 };
  },

  async findPosOrderById(orderId: string, storeId: string) {
    return db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.storeId, storeId),
        eq(orders.orderType, 'pos'),
      ),
      with: { items: true },
    });
  },
};
