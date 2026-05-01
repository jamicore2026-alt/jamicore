// Fastify API integration tests for public payment webhook routes.
// Tests Stripe and Razorpay webhook handlers including signature verification,
// payment lookup, provider config lookup, and idempotency.
import Fastify from 'fastify';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// ─── Mock DB ───
vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      payments: {
        findFirst: vi.fn(),
      },
    },
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb({})),
  },
}));

// ─── Mock Payment Repo ───
vi.mock('./payment.repo.js', () => ({
  findProvidersByStoreId: vi.fn(),
  findProvider: vi.fn(),
  upsertProvider: vi.fn(),
  insertPayment: vi.fn(),
  findPaymentById: vi.fn(),
  findPaymentByOrderId: vi.fn(),
  updatePaymentStatus: vi.fn(),
}));

// ─── Mock Order Repo ───
vi.mock('../order/order.repo.js', () => ({
  orderRepo: {
    findByIdSimple: vi.fn(),
    updateOrder: vi.fn(),
  },
}));

import publicPaymentRoutes from './payment.route.public.js';
import { db } from '../../db/index.js';
import * as paymentRepo from './payment.repo.js';
import { orderRepo } from '../order/order.repo.js';

const WEBHOOK_SECRET = 'whsec_test_secret_12345';
const STORE_ID = 'test-store-id';

function buildStripeSignature(payload: Record<string, unknown>, secret: string): string {
  const rawBody = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${expected}`;
}

function buildRazorpaySignature(rawBody: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

async function buildApp() {
  const fastify = Fastify({ logger: false });

  fastify.setErrorHandler((error: unknown, _request, reply) => {
    if (error && typeof error === 'object' && 'issues' in (error as object)) {
      const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
      reply.status(400).send({
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        message: zodError.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
      return;
    }
    const err = error instanceof Error ? error : new Error(String(error));
    const code = 'code' in err ? (err as unknown as { code: string }).code : undefined;
    reply.status((code && code === 'STORE_NOT_FOUND') ? 400 : 500).send({
      error: err.name || 'Internal Server Error',
      ...(code ? { code } : {}),
      message: err.message,
    });
  });

  fastify.addHook('onRequest', async (request: any) => {
    request.storeId = STORE_ID;
  });

  await fastify.register(publicPaymentRoutes, { prefix: '/payments' });
  return fastify;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /payments/webhook/stripe', () => {
  it('returns 200 and updates order to paid on valid signature', async () => {
    const paymentId = 'pi_test_123';
    const payload = {
      id: 'evt_test',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentId,
          status: 'succeeded',
        },
      },
    };
    const signature = buildStripeSignature(payload, WEBHOOK_SECRET);

    vi.mocked(db.query.payments.findFirst)
      .mockResolvedValueOnce({
        id: 'pay-1',
        storeId: STORE_ID,
        orderId: 'order-1',
        providerPaymentId: paymentId,
        status: 'processing',
      } as any)
      .mockResolvedValueOnce({
        id: 'pay-1',
        storeId: STORE_ID,
        orderId: 'order-1',
        providerPaymentId: paymentId,
        status: 'processing',
      } as any);

    vi.mocked(paymentRepo.findProvider).mockResolvedValueOnce({
      provider: 'stripe',
      isEnabled: true,
      config: { webhook_secret: WEBHOOK_SECRET },
    } as any);

    vi.mocked(paymentRepo.updatePaymentStatus).mockResolvedValueOnce({
      id: 'pay-1',
      status: 'completed',
    } as any);

    vi.mocked(orderRepo.updateOrder).mockResolvedValueOnce({
      id: 'order-1',
      paymentStatus: 'paid',
    } as any);

    const fastify = await buildApp();

    const response = await fastify.inject({
      method: 'POST',
      url: '/payments/stripe',
      payload,
      headers: {
        'stripe-signature': signature,
        'content-type': 'application/json',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.received).toBe(true);

    // Verify payment status was updated to completed
    expect(paymentRepo.updatePaymentStatus).toHaveBeenCalledWith(
      'pay-1',
      STORE_ID,
      expect.objectContaining({ status: 'completed' }),
      expect.anything(),
    );

    // Verify order was updated to paid
    expect(orderRepo.updateOrder).toHaveBeenCalledWith(
      'order-1',
      STORE_ID,
      expect.objectContaining({ paymentStatus: 'paid' }),
      expect.anything(),
    );

    await fastify.close();
  });

  it('returns 400 for invalid signature', async () => {
    const payload = {
      id: 'evt_test',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test_123', status: 'succeeded' } },
    };

    vi.mocked(db.query.payments.findFirst).mockResolvedValueOnce({
      id: 'pay-1',
      storeId: STORE_ID,
      providerPaymentId: 'pi_test_123',
      status: 'processing',
    } as any);

    vi.mocked(paymentRepo.findProvider).mockResolvedValueOnce({
      provider: 'stripe',
      isEnabled: true,
      config: { webhook_secret: WEBHOOK_SECRET },
    } as any);

    const fastify = await buildApp();

    const response = await fastify.inject({
      method: 'POST',
      url: '/payments/stripe',
      payload,
      headers: {
        'stripe-signature': 't=123,v1=invalid',
        'content-type': 'application/json',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('VALIDATION_ERROR');

    await fastify.close();
  });
});

describe('POST /payments/webhook/razorpay', () => {
  it('returns 200 on valid signature', async () => {
    const razorpayOrderId = 'order_razorpay_123';
    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_razorpay_123',
            order_id: razorpayOrderId,
            status: 'captured',
          },
        },
      },
    });
    const signature = buildRazorpaySignature(rawBody, WEBHOOK_SECRET);

    vi.mocked(db.query.payments.findFirst)
      .mockResolvedValueOnce({
        id: 'pay-1',
        storeId: STORE_ID,
        orderId: 'order-1',
        providerPaymentId: razorpayOrderId,
        status: 'processing',
      } as any)
      .mockResolvedValueOnce({
        id: 'pay-1',
        storeId: STORE_ID,
        orderId: 'order-1',
        providerPaymentId: razorpayOrderId,
        status: 'processing',
      } as any);

    vi.mocked(paymentRepo.findProvider).mockResolvedValueOnce({
      provider: 'razorpay',
      isEnabled: true,
      config: { webhook_secret: WEBHOOK_SECRET },
    } as any);

    vi.mocked(paymentRepo.updatePaymentStatus).mockResolvedValueOnce({
      id: 'pay-1',
      status: 'completed',
      providerPaymentId: 'pay_razorpay_123',
    } as any);

    vi.mocked(orderRepo.updateOrder).mockResolvedValueOnce({
      id: 'order-1',
      paymentStatus: 'paid',
    } as any);

    const fastify = await buildApp();

    const response = await fastify.inject({
      method: 'POST',
      url: '/payments/razorpay',
      payload: JSON.parse(rawBody),
      headers: {
        'x-razorpay-signature': signature,
        'content-type': 'application/json',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().received).toBe(true);

    await fastify.close();
  });

  it('returns 400 for missing signature', async () => {
    const fastify = await buildApp();

    const response = await fastify.inject({
      method: 'POST',
      url: '/payments/razorpay',
      payload: { event: 'payment.captured' },
      headers: { 'content-type': 'application/json' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe('Missing webhook signature');

    await fastify.close();
  });
});

describe('Webhook idempotency', () => {
  it('returns 200 for duplicate events without duplicate updates', async () => {
    const paymentId = 'pi_test_123';
    const payload = {
      id: 'evt_test',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentId,
          status: 'succeeded',
        },
      },
    };
    const signature = buildStripeSignature(payload, WEBHOOK_SECRET);

    const processingPayment = {
      id: 'pay-1',
      storeId: STORE_ID,
      orderId: 'order-1',
      providerPaymentId: paymentId,
      status: 'processing',
    };

    const completedPayment = {
      id: 'pay-1',
      storeId: STORE_ID,
      orderId: 'order-1',
      providerPaymentId: paymentId,
      status: 'completed',
    };

    // First call: payment is processing → handleWebhook updates it
    vi.mocked(db.query.payments.findFirst)
      .mockResolvedValueOnce(processingPayment as any)
      .mockResolvedValueOnce(processingPayment as any);

    vi.mocked(paymentRepo.findProvider).mockResolvedValue({
      provider: 'stripe',
      isEnabled: true,
      config: { webhook_secret: WEBHOOK_SECRET },
    } as any);

    vi.mocked(paymentRepo.updatePaymentStatus).mockResolvedValueOnce({ ...completedPayment } as any);
    vi.mocked(orderRepo.updateOrder).mockResolvedValueOnce({ id: 'order-1', paymentStatus: 'paid' } as any);

    const fastify = await buildApp();

    const firstResponse = await fastify.inject({
      method: 'POST',
      url: '/payments/stripe',
      payload,
      headers: {
        'stripe-signature': signature,
        'content-type': 'application/json',
      },
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(firstResponse.json().received).toBe(true);

    // Second call: payment is already completed → idempotent return
    vi.mocked(db.query.payments.findFirst)
      .mockResolvedValueOnce(completedPayment as any)
      .mockResolvedValueOnce(completedPayment as any);

    const secondResponse = await fastify.inject({
      method: 'POST',
      url: '/payments/stripe',
      payload,
      headers: {
        'stripe-signature': signature,
        'content-type': 'application/json',
      },
    });

    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.json().received).toBe(true);

    // updatePaymentStatus should only have been called once (during first request)
    expect(paymentRepo.updatePaymentStatus).toHaveBeenCalledTimes(1);

    await fastify.close();
  });
});
