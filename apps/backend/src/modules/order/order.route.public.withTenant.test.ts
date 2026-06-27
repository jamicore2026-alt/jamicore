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