// Public Order Routes - Guest order tracking + creation
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { orderRepo } from './order.repo.js';
import { orderService } from './order.service.js';
import { productRepo } from '../product/product.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

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

    // Verify product prices server-side and compute totals
    let subtotal = 0;
    const orderItems: Array<{
      productId: string;
      productTitle: string;
      productImage?: string;
      quantity: number;
      price: string;
      total: string;
      modifiers?: unknown;
    }> = [];

    for (const item of parsed.items) {
      const product = await productRepo.findById(item.productId, storeId);
      if (!product) {
        reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.PRODUCT_NOT_FOUND, message: `Product ${item.productId} not found` });
        return;
      }

      const serverPrice = Number(product.salePrice || product.purchasePrice || 0);
      const clientPrice = Number(item.price);
      if (Math.abs(serverPrice - clientPrice) > 0.01) {
        reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.PRICE_MISMATCH, message: `Price mismatch for ${product.titleEn}` });
        return;
      }

      const lineTotal = serverPrice * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: item.productId,
        productTitle: product.titleEn || product.titleAr || 'Product',
        productImage: product.images?.[0],
        quantity: item.quantity,
        price: String(serverPrice),
        total: String(lineTotal.toFixed(2)),
        modifiers: item.variants || item.instructions ? { variants: item.variants, instructions: item.instructions } : undefined,
      });
    }

    const computedTotal = subtotal.toFixed(2);
    if (Math.abs(Number(computedTotal) - Number(parsed.total)) > 0.01) {
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

    const order = await orderRepo.findByOrderNumber(orderNumber, request.storeId);

    if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.ORDER_NOT_FOUND, message: 'Order not found' });
      return;
    }

    return { order };
  });
}
