/* eslint-disable @typescript-eslint/no-explicit-any */
// RLS Phase 1 final-review — verifies the public /payments/intent pre-check
// order read is wrapped in withTenant(request.storeId) and that findByIdSimple
// receives the forwarded tx (was bare-db → would 404 valid guest orders under
// orders-RLS at checkout).
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
vi.mock('../order/order.repo.js', () => ({
  orderRepo: {
    findByIdSimple: vi.fn(),
  },
}));

// ─── Mock payment service facade (route imports createPaymentIntent) ───
vi.mock('./payment.service.js', () => ({
  paymentService: {
    createPaymentIntent: vi.fn(),
    getProviders: vi.fn(),
  },
  verifyRazorpaySignature: vi.fn(),
  verifyStripeSignature: vi.fn(),
}));

import publicPaymentRoutes from './payment.route.public.js';
import { orderRepo } from '../order/order.repo.js';
import { paymentService } from './payment.service.js';

const STORE_ID = 'store-1';
const ORDER_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
});

async function buildApp() {
  const fastify = Fastify({ logger: false });
  fastify.addHook('onRequest', async (request: any) => {
    request.storeId = STORE_ID;
  });
  await fastify.register(publicPaymentRoutes, { prefix: '/payments' });
  return fastify;
}

describe('POST /payments/intent (public guest) — withTenant wrapping', () => {
  it('wraps the pre-check findByIdSimple in withTenant(storeId) and threads tx', async () => {
    vi.mocked(orderRepo.findByIdSimple).mockResolvedValue({
      id: ORDER_ID,
      storeId: STORE_ID,
      paymentStatus: 'pending',
      customerId: null,
    } as any);
    vi.mocked(paymentService.createPaymentIntent).mockResolvedValue({
      provider: 'cod',
      status: 'completed',
      paymentId: 'pay-1',
    } as any);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/payments/intent',
      payload: { orderId: ORDER_ID, provider: 'cod' },
      headers: { 'content-type': 'application/json' },
    });

    expect(response.statusCode).toBe(200);
    // pre-check order read wrapped in withTenant(request.storeId)
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    // findByIdSimple received the forwarded sentinel tx
    expect(orderRepo.findByIdSimple).toHaveBeenCalledWith(ORDER_ID, STORE_ID, sentinelTx);
    await fastify.close();
  });

  it('returns 404 when the order is not found (still wrapped in withTenant)', async () => {
    vi.mocked(orderRepo.findByIdSimple).mockResolvedValue(undefined as any);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/payments/intent',
      payload: { orderId: ORDER_ID, provider: 'cod' },
      headers: { 'content-type': 'application/json' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('ORDER_NOT_FOUND');
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    expect(orderRepo.findByIdSimple).toHaveBeenCalledWith(ORDER_ID, STORE_ID, sentinelTx);
    await fastify.close();
  });
});