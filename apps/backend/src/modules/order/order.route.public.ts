// Public Order Routes - Guest order tracking + creation
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { orderRepo } from './order.repo.js';
import { orderService } from './order.service.js';
import { productRepo } from '../product/product.repo.js';
import { intentService } from '../payment/payment.intent.service.js';
import { toCents, fromCents, multiplyDecimalByInt, decimalsEqual } from '../../lib/decimal.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withTenant } from '../../lib/withTenant.js';

const publicOrderItemSchema = z.strictObject({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  variants: z.array(z.strictObject({ name: z.string(), value: z.string() })).optional(),
  instructions: z.string().optional(),
});

const publicOrderSchema = z.strictObject({
  items: z.array(publicOrderItemSchema).min(1),
  customerName: z.string().min(1).max(255),
  customerPhone: z.string().min(1).max(50),
  shippingAddress: z.string().min(1).max(1000),
  deliveryType: z.enum(['delivery', 'pickup']).optional(),
  deliveryTime: z.string().optional(),
  paymentMethod: z.enum(['cod', 'stripe', 'razorpay']).default('cod'),
  total: z.string().regex(/^\d+(\.\d{1,2})?$/),
  notes: z.string().optional(),
});

export default async function publicOrderRoutes(fastify: FastifyInstance) {
  // POST /api/v1/public/orders - Guest order creation (food storefront)
  fastify.post('/', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Public Orders'],
      summary: 'Create guest order',
      description: 'Create an order without authentication (guest checkout). Prices are verified server-side.',
    },
  }, async (request, reply) => {
    const parsed = publicOrderSchema.parse(request.body);
    const storeId = request.storeId;

    // Verify product prices server-side and compute totals.
    // PERF-003: batch-load all referenced products in one query to avoid
    // an N+1 pattern (one findById per cart item, which loads deep
    // variant/modifier relations we don't need for price verification).
    // RLS Phase 1: the product read + per-item price/stock verification run
    // inside a tenant-scoped withTenant tx so the read is visible once
    // catalog RLS is enabled. Early-fail cases return an earlyReply sentinel
    // which the handler translates to a 400 below; the orderItems + subtotalCents
    // are returned to the caller for the downstream total-check + orderService.create.
    const productIds = parsed.items.map((i) => i.productId);

    const { orderItems, subtotalCents, earlyReply } = await withTenant(storeId, async (tx) => {
      const rows = await productRepo.findManyByIds(productIds, storeId, tx);
      const productById = new Map(rows.map((p) => [p.id, p]));

      let subtotal = 0;
      const items: Array<{
        productId: string;
        productTitle: string;
        productImage?: string;
        quantity: number;
        price: string;
        total: string;
        modifiers?: unknown;
      }> = [];

      for (const item of parsed.items) {
        const product = productById.get(item.productId);
        if (!product) {
          return { earlyReply: { status: 400, code: ErrorCodes.PRODUCT_NOT_FOUND, message: `Product ${item.productId} not found` } as const };
        }

        // M5: verify the unit price in integer cents (no float math / 0.01
        // tolerance — exact cents equality is correct for 2dp decimal strings).
        const serverPriceStr = product.salePrice || product.purchasePrice || '0';
        const serverCents = toCents(serverPriceStr);
        const clientCents = toCents(item.price);
        if (serverCents !== clientCents) {
          return { earlyReply: { status: 400, code: ErrorCodes.PRICE_MISMATCH, message: `Price mismatch for ${product.titleEn}` } as const };
        }

        // M5: fast-fail on insufficient stock for simple products. Variant
        // products carry stock on their options (not currentQuantity), so we skip
        // the product-level check when the client selected variants — the
        // atomic decrement at payment time (0-row guard) catches variant oversell.
        const available = product.currentQuantity ?? 0;
        if (!item.variants?.length && available < item.quantity) {
          return { earlyReply: { status: 400, code: ErrorCodes.INSUFFICIENT_INVENTORY, message: `Insufficient stock for ${product.titleEn}` } as const };
        }

        const lineTotalStr = multiplyDecimalByInt(serverPriceStr, item.quantity);
        subtotal += toCents(lineTotalStr);

        const images = product.images;
        items.push({
          productId: item.productId,
          productTitle: product.titleEn || product.titleAr || 'Product',
          productImage: Array.isArray(images) && images.length > 0 ? images[0] : undefined,
          quantity: item.quantity,
          price: serverPriceStr,
          total: lineTotalStr,
          modifiers: item.variants || item.instructions ? { variants: item.variants, instructions: item.instructions } : undefined,
        });
      }

      return { orderItems: items, subtotalCents: subtotal, earlyReply: undefined };
    });

    if (earlyReply) {
      reply.status(earlyReply.status).send({ error: 'Bad Request', code: earlyReply.code, message: earlyReply.message });
      return;
    }

    const computedTotal = fromCents(subtotalCents);
    if (!decimalsEqual(computedTotal, parsed.total)) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.PRICE_MISMATCH, message: 'Total amount mismatch' });
      return;
    }

    const order = await orderService.create({
      storeId,
      email: `${parsed.customerPhone}@guest.local`,
      phone: parsed.customerPhone,
      currency: 'USD',
      subtotal: computedTotal,
      total: computedTotal,
      items: orderItems,
      paymentMethod: parsed.paymentMethod,
      shippingAddress: {
        shippingName: parsed.customerName,
        shippingAddressLine1: parsed.shippingAddress,
      },
      billingAddress: {
        billingName: parsed.customerName,
      },
      notes: parsed.notes || (parsed.deliveryType ? `Delivery: ${parsed.deliveryType}${parsed.deliveryTime ? `, Time: ${parsed.deliveryTime}` : ''}` : undefined),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    // M5: for COD, reserve inventory + mark the order paid by creating the COD
    // payment intent (which decrements stock atomically with a 0-row guard).
    // The food storefront's COD flow goes straight to order-confirmed without
    // calling /payments/intent, so without this the COD path would never reserve
    // stock. On any non-idempotent failure we cancel the orphan order so it does
    // not linger as a pending order with no payment.
    if (parsed.paymentMethod === 'cod') {
      try {
        await intentService.createPaymentIntent(storeId, order.id, 'cod');
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code !== ErrorCodes.PAYMENT_ALREADY_PROCESSED) {
          // Best-effort cancel of the unpaid orphan order; the COD intent tx
          // rolled back so no stock was reserved and paymentStatus is still
          // unpaid, so cancel is a safe status-only update.
          try {
            await orderService.updateStatus(order.id, storeId, 'cancelled');
          } catch {
            /* swallow — original error is the one to surface */
          }
          const message = err instanceof Error ? err.message : 'Failed to process COD payment';
          reply.status(400).send({ error: 'Bad Request', code: code ?? ErrorCodes.PAYMENT_FAILED, message });
          return;
        }
      }
      // Reflect the now-paid status in the response.
      const paid = await orderService.findById(order.id, storeId);
      reply.status(201).send({ order: paid ?? order });
      return;
    }

    reply.status(201).send({ order });
  });

  // GET /api/v1/public/orders/track?orderNumber=XXX&email=XXX
  fastify.get('/track', {
    schema: {
      tags: ['Public'],
      summary: 'Track guest order',
      description: 'Look up an order by order number and email address',
    },
  }, async (request, reply) => {
    const { orderNumber, email } = request.query as { orderNumber?: string; email?: string };

    if (!orderNumber || !email) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.VALIDATION_ERROR, message: 'orderNumber and email are required' });
      return;
    }

    const order = await withTenant(request.storeId, (tx) => orderRepo.findByOrderNumber(orderNumber, request.storeId, tx));

    if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.ORDER_NOT_FOUND, message: 'Order not found' });
      return;
    }

    return { order };
  });
}
