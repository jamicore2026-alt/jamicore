/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentService } from './payment.service.js';
import { ErrorCodes } from '../../errors/codes.js';

// ─── Mock payment repo ───
vi.mock('./payment.repo.js', () => ({
  findProvidersByStoreId: vi.fn(),
  upsertProvider: vi.fn(),
  findProviderByStoreId: vi.fn(),
  findProvider: vi.fn(),
  findPaymentByOrderId: vi.fn(),
  insertPayment: vi.fn(),
}));
import * as paymentRepo from './payment.repo.js';
const mockRepo = paymentRepo as any;

// ─── Mock orderRepo ───
vi.mock('../order/order.repo.js', () => ({
  orderRepo: {
    findByIdSimple: vi.fn(),
    updateOrder: vi.fn(),
  },
}));
import { orderRepo as _orderRepo } from '../order/order.repo.js';
const mockOrderRepo = _orderRepo as any;

// ─── Mock db ───
vi.mock('../../db/index.js', () => ({
  db: {
    transaction: vi.fn(async (cb: any) => cb({})),
  },
}));

// ─── Mock encryption ───
vi.mock('../../lib/encryption.js', () => ({
  encryptConfig: vi.fn().mockReturnValue('encrypted'),
  decryptConfig: vi.fn().mockReturnValue({ secret_key: 'sk_test' }),
}));

describe('paymentService.createPaymentIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws ORDER_NOT_FOUND when order does not exist', async () => {
    mockOrderRepo.findByIdSimple.mockResolvedValue(undefined);
    await expect(
      paymentService.createPaymentIntent('store-1', 'order-1', 'stripe'),
    ).rejects.toMatchObject({ code: ErrorCodes.ORDER_NOT_FOUND });
  });

  it('throws PAYMENT_ALREADY_PROCESSED when order is not pending', async () => {
    mockOrderRepo.findByIdSimple.mockResolvedValue({
      id: 'order-1',
      status: 'shipped',
      total: '100.00',
      currency: 'USD',
      paymentStatus: 'pending',
    });
    await expect(
      paymentService.createPaymentIntent('store-1', 'order-1', 'stripe'),
    ).rejects.toMatchObject({ code: ErrorCodes.PAYMENT_ALREADY_PROCESSED });
  });

  it('throws PAYMENT_ALREADY_PROCESSED when order is already paid', async () => {
    mockOrderRepo.findByIdSimple.mockResolvedValue({
      id: 'order-1',
      status: 'pending',
      total: '100.00',
      currency: 'USD',
      paymentStatus: 'paid',
    });
    await expect(
      paymentService.createPaymentIntent('store-1', 'order-1', 'stripe'),
    ).rejects.toMatchObject({ code: ErrorCodes.PAYMENT_ALREADY_PROCESSED });
  });

  it('throws PAYMENT_PROVIDER_NOT_ENABLED when provider is not configured', async () => {
    mockOrderRepo.findByIdSimple.mockResolvedValue({
      id: 'order-1',
      status: 'pending',
      total: '100.00',
      currency: 'USD',
      paymentStatus: 'pending',
    });
    mockRepo.findProviderByStoreId.mockResolvedValue(null);
    await expect(
      paymentService.createPaymentIntent('store-1', 'order-1', 'stripe'),
    ).rejects.toMatchObject({ code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED });
  });

  it('returns existing processing payment to prevent duplicate intents', async () => {
    mockOrderRepo.findByIdSimple.mockResolvedValue({
      id: 'order-1',
      status: 'pending',
      total: '100.00',
      currency: 'USD',
      paymentStatus: 'pending',
    });
    const existingPayment = {
      id: 'pay-1',
      orderId: 'order-1',
      status: 'processing',
      amount: '100.00',
    };
    mockRepo.findPaymentByOrderId.mockResolvedValue(existingPayment);
    const result = await paymentService.createPaymentIntent('store-1', 'order-1', 'stripe');
    expect(result).toEqual(existingPayment);
  });
});

describe('paymentService.configureProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows COD without API keys', async () => {
    mockRepo.upsertProvider.mockResolvedValue({
      id: 'prov-1',
      storeId: 'store-1',
      provider: 'cod',
      isEnabled: true,
      config: null,
    });
    const result = await paymentService.configureProvider('store-1', 'cod', true);
    expect(result.provider).toBe('cod');
    expect(result.config).toBeNull();
  });

  it('throws VALIDATION_ERROR when Stripe config is missing secret_key', async () => {
    await expect(
      paymentService.configureProvider('store-1', 'stripe', true, { webhook_secret: 'whsec' }),
    ).rejects.toMatchObject({ code: ErrorCodes.VALIDATION_ERROR });
  });

  it('throws VALIDATION_ERROR when Razorpay config is missing key_secret', async () => {
    await expect(
      paymentService.configureProvider('store-1', 'razorpay', true, { key_id: 'key', webhook_secret: 'whsec' }),
    ).rejects.toMatchObject({ code: ErrorCodes.VALIDATION_ERROR });
  });
});
