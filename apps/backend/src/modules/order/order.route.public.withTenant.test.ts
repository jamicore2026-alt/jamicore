/* eslint-disable @typescript-eslint/no-explicit-any */
// RLS Phase 1 final-review — verifies the public /orders/track guest order
// lookup is wrapped in withTenant(request.storeId) and that findByOrderNumber
// receives the forwarded tx (was bare-db → would 404 valid guest orders under
// orders-RLS at guest order tracking).
import Fastify from 'fastify';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mock state ───
const { withTenantMock, sentinelTx } = vi.hoisted(() => {
  const withTenantMock = vi.fn();
  const sentinelTx = { __sentinel: 'route-tx' };
  return { withTenantMock, sentinelTx };
});

// ─── Mock withTenant: record storeId, forward sentinel tx ───
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: async (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn(sentinelTx);
  },
}));

// ─── Mock order repo ───
vi.mock('./order.repo.js', () => ({
  orderRepo: {
    findByOrderNumber: vi.fn(),
  },
}));

// ─── Mock order service (imported by the POST / route; not exercised here) ───
vi.mock('./order.service.js', () => ({
  orderService: {
    create: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

// ─── Mock product repo (imported by the POST / route; not exercised here) ───
vi.mock('../product/product.repo.js', () => ({
  productRepo: {
    findManyByIds: vi.fn(),
  },
}));

// ─── Mock intent service (imported by the POST / route; not exercised here) ───
vi.mock('../payment/payment.intent.service.js', () => ({
  intentService: {
    createPaymentIntent: vi.fn(),
  },
}));

import publicOrderRoutes from './order.route.public.js';
import { orderRepo } from './order.repo.js';
import { productRepo } from '../product/product.repo.js';
import { orderService } from './order.service.js';
import { intentService } from '../payment/payment.intent.service.js';

const STORE_ID = 'store-1';
const ORDER_NUMBER = 'ORD-12345';
const EMAIL = 'guest@example.com';

beforeEach(() => {
  vi.clearAllMocks();
});

async function buildApp() {
  const fastify = Fastify({ logger: false });
  fastify.addHook('onRequest', async (request: any) => {
    request.storeId = STORE_ID;
  });
  await fastify.register(publicOrderRoutes, { prefix: '/orders' });
  return fastify;
}

describe('GET /orders/track (public guest) — withTenant wrapping', () => {
  it('wraps the findByOrderNumber lookup in withTenant(storeId) and threads tx', async () => {
    vi.mocked(orderRepo.findByOrderNumber).mockResolvedValue({
      id: 'order-1',
      orderNumber: ORDER_NUMBER,
      storeId: STORE_ID,
      email: EMAIL,
    } as any);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: `/orders/track?orderNumber=${ORDER_NUMBER}&email=${encodeURIComponent(EMAIL)}`,
    });

    expect(response.statusCode).toBe(200);
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    expect(orderRepo.findByOrderNumber).toHaveBeenCalledWith(ORDER_NUMBER, STORE_ID, sentinelTx);
    await fastify.close();
  });

  it('returns 404 when the order is not found (still wrapped in withTenant)', async () => {
    vi.mocked(orderRepo.findByOrderNumber).mockResolvedValue(undefined as any);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: `/orders/track?orderNumber=${ORDER_NUMBER}&email=${encodeURIComponent(EMAIL)}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('ORDER_NOT_FOUND');
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    expect(orderRepo.findByOrderNumber).toHaveBeenCalledWith(ORDER_NUMBER, STORE_ID, sentinelTx);
    await fastify.close();
  });
});

describe('POST /orders (public guest) — withTenant wrapping', () => {
  it('guest order creation threads withTenant tx into productRepo.findManyByIds', async () => {
    // Happy-path body: a single item priced at 10.00 with sufficient stock.
    // productId must be a UUID (schema validates z.string().uuid()).
    const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
    vi.mocked(productRepo.findManyByIds).mockResolvedValue([
      { id: PRODUCT_ID, storeId: STORE_ID, salePrice: '10.00', purchasePrice: '10.00', titleEn: 'Item', titleAr: '', images: [], currentQuantity: 100 } as any,
    ]);
    vi.mocked(orderService.create).mockResolvedValue({ id: 'o1', orderNumber: 'ORD-1', email: 'guest@example.com' } as any);
    vi.mocked(intentService.createPaymentIntent).mockResolvedValue({} as any);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/orders',
      payload: {
        items: [{ productId: PRODUCT_ID, quantity: 1, price: '10.00' }],
        customerName: 'Guest',
        customerPhone: '+15551234567',
        shippingAddress: '123 St',
        paymentMethod: 'stripe',
        total: '10.00',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    expect(productRepo.findManyByIds).toHaveBeenCalledWith(expect.any(Array), STORE_ID, sentinelTx);
    await fastify.close();
  });
});