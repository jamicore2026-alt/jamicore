import type { Job } from 'bullmq';
import { carts, cartItems, customers, products } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { withTenant } from '../lib/withTenant.js';
import type { QueueService } from './queue.service.js';

export interface AbandonedCartJobData {
  storeId: string;
  cartId: string;
  customerId?: string;
}

export function createAbandonedCartProcessor(queueService: QueueService) {
  return async function processAbandonedCartJob(job: Job<AbandonedCartJobData>): Promise<void> {
    const { storeId, cartId, customerId } = job.data;

    // All tenant-scoped reads (carts/cart_items/customers/products) run inside
    // withTenant so they ride the app_tenant client with app.tenant_id set
    // transaction-locally — correct once these tables get RLS. The emailQueue.add
    // enqueue is an external Redis op and stays OUTSIDE the tx: it must fire only
    // after the read tx commits (and never inside a rollback).
    const emailPayload = await withTenant(storeId, async (tx) => {
      // Re-check cart is still abandoned (not checked out or cleared)
      const [cart] = await tx.select().from(carts)
        .where(and(eq(carts.id, cartId), eq(carts.storeId, storeId)))
        .limit(1);

      if (!cart || cart.itemCount === 0) return null;

      // Only send if customer exists with email
      if (!customerId) return null;
      const [customer] = await tx.select().from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
        .limit(1);

      if (!customer?.email) return null;

      const items = await tx.select().from(cartItems)
        .where(eq(cartItems.cartId, cartId));

      if (items.length === 0) return null;

      // Fetch only the product titles referenced by this cart's items.
      // PERF-001: previously this scanned every product in the store
      // (O(store size) rows read per job) even though only N items
      // (where N = cart item count, typically 1-5) needed titles.
      const itemProductIds = Array.from(new Set(items.map((i) => i.productId)));
      const productRows = itemProductIds.length === 0
        ? []
        : await tx.select({ id: products.id, titleEn: products.titleEn })
            .from(products)
            .where(and(inArray(products.id, itemProductIds), eq(products.storeId, storeId)));
      const productMap = new Map(productRows.map((p) => [p.id, p.titleEn]));

      const itemList = items.map((i) => `- ${productMap.get(i.productId) ?? 'Product'} x${i.quantity}`).join('\n');

      return {
        to: customer.email,
        subject: 'You left something in your cart!',
        html: `<p>Hi ${customer.firstName ?? ''},</p>
<p>You have items waiting in your cart:</p>
<pre>${itemList}</pre>
<p><a href="https://cart-link">Complete your purchase</a></p>`,
        text: `Hi ${customer.firstName ?? ''},\n\nYou have items waiting in your cart:\n${itemList}\n\nComplete your purchase: https://cart-link`,
      };
    });

    if (emailPayload) {
      // Queue email — outside the withTenant tx (external Redis op).
      await queueService.emailQueue.add('abandoned-cart', emailPayload);
    }
  };
}