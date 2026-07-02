/* eslint-disable @typescript-eslint/no-explicit-any */
// Customer checkout route — regression guard for the duplicate-productId modifiers
// bug: when two checkout lines share the same productId (e.g. same product in two
// variants), each order line must record ITS OWN variant/modifier selections, not
// the first matching line's. pricing.items is 1:1 by index with parsed.items, so
// the route must zip by index, not find-by-productId.
import Fastify from 'fastify';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock orderService (checkout calls orderService.create) ───
const { orderServiceMock } = vi.hoisted(() => ({
  orderServiceMock: {
    create: vi.fn().mockResolvedValue({ id: 'order-1', orderNumber: 'O1' }),
  },
}));
vi.mock('../order/order.service.js', () => ({ orderService: orderServiceMock }));

import customerCheckoutRoutes from './checkout.route.customer.js';

const STORE_ID = 'store-1';
const CUSTOMER_ID = 'cust-1';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440001';

async function buildApp() {
  const fastify = Fastify({ logger: false });
  fastify.addHook('onRequest', async (request: any) => {
    request.storeId = STORE_ID;
    request.customerId = CUSTOMER_ID;
  });
  // Stub the pricing decorator the route calls (decorate so it propagates to the
  // encapsulated plugin context).
  fastify.decorate('pricingService', {
    computeOrderPricing: vi.fn().mockResolvedValue({
      items: [
        {
          productId: PRODUCT_ID,
          productTitle: 'Shirt',
          productImage: null,
          variantName: 'Small',
          combinationId: 'combo-small',
          effectivePrice: '10.00',
          lineTotal: '10.00',
          quantityRequested: 1,
        },
        {
          productId: PRODUCT_ID,
          productTitle: 'Shirt',
          productImage: null,
          variantName: 'Large',
          combinationId: 'combo-large',
          effectivePrice: '10.00',
          lineTotal: '10.00',
          quantityRequested: 1,
        },
      ],
      subtotal: '20.00',
      discount: '0.00',
      shipping: '0.00',
      tax: '0.00',
      total: '20.00',
      coupon: null,
    } as any),
  } as any);
  fastify.register(customerCheckoutRoutes);
  await fastify.ready();
  return fastify;
}

describe('POST /customer/checkout — duplicate productId modifiers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records each line its own variant selections (zips by index, not find-by-productId)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: {
        email: 'buyer@example.com',
        items: [
          { productId: PRODUCT_ID, quantity: 1, variantOptionIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'] },
          { productId: PRODUCT_ID, quantity: 1, variantOptionIds: ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'] },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(orderServiceMock.create).toHaveBeenCalledTimes(1);
    const createArg = (orderServiceMock.create as any).mock.calls[0][0];
    const items = createArg.items as Array<{ productId: string; modifiers?: string }>;
    expect(items).toHaveLength(2);

    const mods0 = items[0].modifiers ? JSON.parse(items[0].modifiers) : null;
    const mods1 = items[1].modifiers ? JSON.parse(items[1].modifiers) : null;
    // First line -> Small variant
    expect(mods0.variantOptionIds).toEqual(['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']);
    // Second line -> Large variant (NOT the first line's selection)
    expect(mods1.variantOptionIds).toEqual(['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']);
    await app.close();
  });
});