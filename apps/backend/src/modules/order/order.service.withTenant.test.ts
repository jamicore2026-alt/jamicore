// Verifies orderService wraps all orders/order_items DB work in withTenant(storeId, fn)
// (RLS Phase 1 prep). withTenant + orderRepo + fire-and-forget services are mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted so the mock factory (hoisted above imports) can reference withTenantMock.
const { withTenantMock } = vi.hoisted(() => ({
  withTenantMock: vi.fn(),
}));

vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with a sentinel tx so we can assert repos received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    const sentinelTx = { __sentinel: 'tx' };
    return fn(sentinelTx);
  },
}));

const { repo } = vi.hoisted(() => ({
  repo: {
    findByStoreId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    findByCustomerId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    findById: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1', items: [] }),
    findByIdSimple: vi.fn().mockResolvedValue({
      id: 'o1',
      storeId: 's1',
      status: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
    }),
    updateOrder: vi.fn().mockResolvedValue({ id: 'o1' }),
    insertOrder: vi.fn().mockResolvedValue({ id: 'o1', orderNumber: 'ON-1', storeId: 's1', total: '10.00' }),
    insertOrderItems: vi.fn().mockResolvedValue([]),
    findCartByIdScoped: vi.fn().mockResolvedValue(undefined),
    deleteCartItems: vi.fn().mockResolvedValue(undefined),
    resetCartTotals: vi.fn().mockResolvedValue(undefined),
    incrementCouponUsage: vi.fn().mockResolvedValue([{ id: 'c1' }]),
  },
}));
vi.mock('./order.repo.js', () => ({ orderRepo: repo }));
// create() also touches webhookService/notificationService/superAdminService (fire-and-forget) — mock them.
vi.mock('../webhook/webhook.service.js', () => ({
  webhookService: { dispatchWebhook: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../notifications/notifications.service.js', () => ({
  notificationService: { createNotification: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../superAdmin/superAdmin.service.js', () => ({
  superAdminService: { createNotification: vi.fn().mockResolvedValue(undefined) },
}));

import { orderService } from './order.service.js';

describe('order.service wraps order work in withTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('findByStoreId runs inside withTenant(storeId)', async () => {
    await orderService.findByStoreId('s1', { page: 1, limit: 10 });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findByStoreId).toHaveBeenCalledWith('s1', expect.any(Object), expect.any(Object));
  });

  it('findByCustomerId runs inside withTenant(storeId)', async () => {
    await orderService.findByCustomerId('s1', 'c1', { page: 1, limit: 10 });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
  });

  it('findById runs inside withTenant(storeId)', async () => {
    await orderService.findById('o1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findById).toHaveBeenCalledWith('o1', 's1', expect.any(Object));
  });

  it('updateStatus runs inside withTenant(storeId) and passes tx to repo reads/writes', async () => {
    await orderService.updateStatus('o1', 's1', 'shipped');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findByIdSimple).toHaveBeenCalledWith('o1', 's1', expect.any(Object));
    expect(repo.updateOrder).toHaveBeenCalledWith('o1', 's1', expect.any(Object), expect.any(Object));
  });

  it('create runs inside withTenant(data.storeId) and passes the sentinel tx to insertOrder', async () => {
    await orderService.create({
      storeId: 's1',
      email: 'c@s.com',
      currency: 'USD',
      subtotal: '10.00',
      total: '10.00',
      items: [
        { productId: 'p1', productTitle: 'P1', quantity: 1, price: '10.00', total: '10.00' },
      ],
    });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.insertOrder).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ __sentinel: 'tx' }),
    );
  });
});