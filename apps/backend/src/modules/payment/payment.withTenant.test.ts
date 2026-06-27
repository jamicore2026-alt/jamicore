/* eslint-disable @typescript-eslint/no-explicit-any */
// RLS Phase 1 prep — verifies payment intent + webhook order work is wrapped in
// withTenant and that findOrderItemsByOrderId rides the tx (was bare-db → would
// return [] under order_items-RLS → silent inventory under-decrement on paid orders).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// ─── Hoisted mock state ───
const { withTenantMock, sentinelTx } = vi.hoisted(() => {
  const withTenantMock = vi.fn();
  const sentinelTx = { __sentinel: 'tx' };
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
    updateOrder: vi.fn(),
    findOrderItemsByOrderId: vi.fn(),
    decrementInventory: vi.fn(),
  },
}));

// ─── Mock product repo ───
vi.mock('../product/product.repo.js', () => ({
  productRepo: {
    decrementVariantOptionStock: vi.fn(),
  },
}));

// ─── Mock payment repo (imported as `* as repo` in both services) ───
vi.mock('./payment.repo.js', () => ({
  findProvidersByStoreId: vi.fn(),
  findProvider: vi.fn(),
  upsertProvider: vi.fn(),
  insertPayment: vi.fn(),
  findPaymentById: vi.fn(),
  findPaymentByOrderId: vi.fn(),
  findCompletedPaymentByOrderId: vi.fn(),
  updatePaymentStatus: vi.fn(),
  transitionPaymentToCompleted: vi.fn(),
}));

// ─── Mock db (payments lookups stay on bare db — no RLS this phase) ───
vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      payments: {
        findFirst: vi.fn(),
      },
    },
  },
}));

// ─── Mock encryption (webhook.service imports decryptConfig at module load) ───
vi.mock('../../lib/encryption.js', () => ({
  encryptConfig: vi.fn(),
  decryptConfig: vi.fn(),
}));

import { intentService } from './payment.intent.service.js';
import { webhookService } from './payment.webhook.service.js';
import { orderRepo } from '../order/order.repo.js';
import { productRepo } from '../product/product.repo.js';
import * as paymentRepo from './payment.repo.js';
import { db } from '../../db/index.js';

const STORE_ID = 'store-1';
const ORDER_ID = 'order-1';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('intentService.createPaymentIntent (COD) — withTenant wrapping', () => {
  it('wraps the pre-tx order read and the write tx in withTenant(storeId) and threads tx into findOrderItemsByOrderId', async () => {
    // Pre-tx order read returns a pending order
    vi.mocked(orderRepo.findByIdSimple).mockResolvedValue({
      id: ORDER_ID,
      storeId: STORE_ID,
      status: 'pending',
      paymentStatus: 'pending',
      currency: 'USD',
      total: '10.00',
    } as any);
    // No existing processing payment
    vi.mocked(paymentRepo.findPaymentByOrderId).mockResolvedValue(undefined as any);
    // Provider enabled for COD
    vi.spyOn(webhookService, 'findProviderByStoreId').mockResolvedValue({
      isEnabled: true,
      config: {},
    } as any);
    // Write tx mocks
    vi.mocked(paymentRepo.insertPayment).mockResolvedValue({
      id: 'pay-1',
      amount: '10.00',
      currency: 'USD',
    } as any);
    vi.mocked(orderRepo.updateOrder).mockResolvedValue({ id: ORDER_ID } as any);
    vi.mocked(orderRepo.findOrderItemsByOrderId).mockResolvedValue([] as any);

    const result = await intentService.createPaymentIntent(STORE_ID, ORDER_ID, 'cod');

    // (b) pre-tx findByIdSimple wrapped in withTenant(storeId)
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    // pre-tx read received the sentinel tx
    expect(orderRepo.findByIdSimple).toHaveBeenCalledWith(ORDER_ID, STORE_ID, sentinelTx);

    // (a) write tx wrapped in withTenant(storeId) — withTenant called at least twice
    expect(withTenantMock).toHaveBeenCalledTimes(2);

    // findOrderItemsByOrderId received the sentinel tx (the latent-defect fix)
    expect(orderRepo.findOrderItemsByOrderId).toHaveBeenCalledWith(ORDER_ID, STORE_ID, sentinelTx);

    // Sanity: COD result shape
    expect(result).toMatchObject({ provider: 'cod', status: 'completed', paymentId: 'pay-1' });

    vi.mocked(webhookService.findProviderByStoreId).mockRestore();
  });
});

describe('webhookService.getPaymentStatus — withTenant wrapping', () => {
  it('wraps the order read in withTenant(storeId) and threads tx into findByIdSimple', async () => {
    vi.mocked(orderRepo.findByIdSimple).mockResolvedValue({
      id: ORDER_ID,
      storeId: STORE_ID,
      status: 'pending',
      paymentStatus: 'pending',
    } as any);
    vi.mocked(paymentRepo.findPaymentByOrderId).mockResolvedValue(undefined as any);

    await webhookService.getPaymentStatus(ORDER_ID, STORE_ID);

    // (c) getPaymentStatus wraps findByIdSimple in withTenant(storeId)
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    expect(orderRepo.findByIdSimple).toHaveBeenCalledWith(ORDER_ID, STORE_ID, sentinelTx);

    // payments lookup stays on bare db (no RLS this phase) — not wrapped
    expect(paymentRepo.findPaymentByOrderId).toHaveBeenCalledWith(ORDER_ID, STORE_ID);
  });
});

describe('webhookService.handleWebhook (Razorpay) — withTenant wrapping', () => {
  it('wraps the write tx in withTenant(payment.storeId) and threads tx into findOrderItemsByOrderId', async () => {
    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rp_1',
            order_id: 'order_rp_1',
            status: 'captured',
          },
        },
      },
    });
    const SECRET = 'whsec_test';
    const signature = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');

    vi.mocked(paymentRepo.findProvider).mockResolvedValue({
      provider: 'razorpay',
      isEnabled: true,
      config: { webhook_secret: SECRET },
    } as any);
    vi.mocked(db.query.payments.findFirst).mockResolvedValue({
      id: 'pay-1',
      storeId: STORE_ID,
      orderId: ORDER_ID,
      providerPaymentId: 'order_rp_1',
      status: 'processing',
    } as any);
    vi.mocked(paymentRepo.transitionPaymentToCompleted).mockResolvedValue({
      id: 'pay-1',
      status: 'completed',
    } as any);
    vi.mocked(orderRepo.updateOrder).mockResolvedValue({ id: ORDER_ID } as any);
    vi.mocked(orderRepo.findOrderItemsByOrderId).mockResolvedValue([
      { orderId: ORDER_ID, productId: 'p1', variantId: null, quantity: 1, storeId: STORE_ID },
    ] as any);
    vi.mocked(orderRepo.decrementInventory).mockResolvedValue([{ id: 1 }] as any);

    await webhookService.handleWebhook('razorpay', JSON.parse(rawBody), signature, rawBody, STORE_ID);

    // write tx wrapped in withTenant(payment.storeId)
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    // findOrderItemsByOrderId received the sentinel tx (latent-defect fix)
    expect(orderRepo.findOrderItemsByOrderId).toHaveBeenCalledWith(ORDER_ID, STORE_ID, sentinelTx);
  });
});

describe('webhookService.handleWebhook (Stripe) — withTenant wrapping', () => {
  it('wraps the write tx in withTenant(payment.storeId) and threads tx into findOrderItemsByOrderId', async () => {
    const payload = {
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', status: 'succeeded' } },
    };
    const rawBody = JSON.stringify(payload);
    const SECRET = 'whsec_test';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const sig = crypto.createHmac('sha256', SECRET).update(`${timestamp}.${rawBody}`).digest('hex');
    const signature = `t=${timestamp},v1=${sig}`;

    vi.mocked(paymentRepo.findProvider).mockResolvedValue({
      provider: 'stripe',
      isEnabled: true,
      config: { webhook_secret: SECRET },
    } as any);
    vi.mocked(db.query.payments.findFirst).mockResolvedValue({
      id: 'pay-1',
      storeId: STORE_ID,
      orderId: ORDER_ID,
      providerPaymentId: 'pi_1',
      status: 'processing',
    } as any);
    vi.mocked(paymentRepo.transitionPaymentToCompleted).mockResolvedValue({
      id: 'pay-1',
      status: 'completed',
    } as any);
    vi.mocked(orderRepo.updateOrder).mockResolvedValue({ id: ORDER_ID } as any);
    vi.mocked(orderRepo.findOrderItemsByOrderId).mockResolvedValue([
      { orderId: ORDER_ID, productId: 'p1', variantId: null, quantity: 1, storeId: STORE_ID },
    ] as any);
    vi.mocked(orderRepo.decrementInventory).mockResolvedValue([{ id: 1 }] as any);

    await webhookService.handleWebhook('stripe', payload, signature, rawBody, STORE_ID);

    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    expect(orderRepo.findOrderItemsByOrderId).toHaveBeenCalledWith(ORDER_ID, STORE_ID, sentinelTx);
  });
});