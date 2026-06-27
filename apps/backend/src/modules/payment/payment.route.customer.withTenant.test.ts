/* eslint-disable @typescript-eslint/no-explicit-any */
// RLS Phase 1 final-review — verifies the customer payment routes' pre-check
// order reads (POST /intent + GET /orders/:orderId) are wrapped in
// withTenant(request.storeId) and that findByIdSimple receives the forwarded
// tx (was bare-db → would 404 valid orders under orders-RLS at customer
// checkout / payment-status lookup).
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

// ─── Mock payment service facade ───
vi.mock('./payment.service.js', () => ({
  paymentService: {
    createPaymentIntent: vi.fn(),
    getPaymentStatus: vi.fn(),
    getProviders: vi.fn(),
  },
  verifyRazorpaySignature: vi.fn(),
  verifyStripeSignature: vi.fn(),
}));

import customerPaymentRoutes from './payment.route.customer.js';
import { orderRepo } from '../order/order.repo.js';
import { paymentService } from './payment.service.js';

const STORE_ID = 'store-1';
const CUSTOMER_ID = 'cust-1';
const ORDER_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
});

async function buildApp() {
  const fastify = Fastify({ logger: false });
  fastify.addHook('onRequest', async (request: any) => {
    request.storeId = STORE_ID;
    request.customerId = CUSTOMER_ID;
  });
  await fastify.register(customerPaymentRoutes, { prefix: '/payments' });
  return fastify;
}

describe('POST /payments/intent (customer) — withTenant wrapping', () => {
  it('wraps the pre-check findByIdSimple in withTenant(storeId) and threads tx', async () => {
    vi.mocked(orderRepo.findByIdSimple).mockResolvedValue({
      id: ORDER_ID,
      storeId: STORE_ID,
      customerId: CUSTOMER_ID,
      paymentStatus: 'pending',
    } as any);
    vi.mocked(paymentService.createPaymentIntent).mockResolvedValue({
      provider: 'stripe',
      status: 'processing',
      paymentId: 'pay-1',
    } as any);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/payments/intent',
      payload: { orderId: ORDER_ID, provider: 'stripe' },
      headers: { 'content-type': 'application/json' },
    });

    expect(response.statusCode).toBe(200);
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    expect(orderRepo.findByIdSimple).toHaveBeenCalledWith(ORDER_ID, STORE_ID, sentinelTx);
    await fastify.close();
  });

  it('returns 404 when the order is not found (still wrapped in withTenant)', async () => {
    vi.mocked(orderRepo.findByIdSimple).mockResolvedValue(undefined as any);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/payments/intent',
      payload: { orderId: ORDER_ID, provider: 'stripe' },
      headers: { 'content-type': 'application/json' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('ORDER_NOT_FOUND');
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    await fastify.close();
  });
});

describe('GET /payments/orders/:orderId (customer) — withTenant wrapping', () => {
  it('wraps the pre-check findByIdSimple in withTenant(storeId) and threads tx', async () => {
    vi.mocked(orderRepo.findByIdSimple).mockResolvedValue({
      id: ORDER_ID,
      storeId: STORE_ID,
      customerId: CUSTOMER_ID,
      paymentStatus: 'paid',
    } as any);
    vi.mocked(paymentService.getPaymentStatus).mockResolvedValue({
      orderId: ORDER_ID,
      status: 'paid',
    } as any);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: `/payments/orders/${ORDER_ID}`,
    });

    expect(response.statusCode).toBe(200);
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    expect(orderRepo.findByIdSimple).toHaveBeenCalledWith(ORDER_ID, STORE_ID, sentinelTx);
    await fastify.close();
  });
});