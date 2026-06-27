// Verifies returnService wraps orders/order_items DB work in withTenant(storeId, fn)
// (RLS Phase 1 prep). withTenant + returnRepo + orderRepo + paymentRepo + refundService
// are mocked; the sentinel tx also exposes a `.select().from().where()` chain so
// createReturn's order_items / returns / returnItems validation reads run.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orderItems, returns, returnItems } from '../../db/schema.js';

// vi.hoisted so the mock factory (hoisted above imports) can reference withTenantMock.
const { withTenantMock, sentinelTx } = vi.hoisted(() => {
  // `.from(table)` returns a `.where()` chain resolving to a canned array keyed
  // by the schema table reference, so createReturn's validation reads see data
  // that lets it reach returnRepo.create / createItem / findByIdWithItems.
  const fromChain = (table: unknown) => ({
    where: () => {
      if (table === orderItems) {
        return Promise.resolve([{ id: 'oi1', quantity: 2 }]);
      }
      if (table === returns) {
        return Promise.resolve([]);
      }
      if (table === returnItems) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    },
  });
  const sentinelTx = {
    __sentinel: 'tx',
    select: () => ({ from: (table: unknown) => fromChain(table) }),
  };
  return {
    withTenantMock: vi.fn(),
    sentinelTx,
  };
});

vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn(sentinelTx);
  },
}));

const { returnRepo, orderRepo, refundService, paymentRepo } = vi.hoisted(() => ({
  returnRepo: {
    create: vi.fn().mockResolvedValue({ id: 'r1', storeId: 's1', status: 'requested' }),
    createItem: vi.fn().mockResolvedValue({ id: 'ri1' }),
    findByIdWithItems: vi.fn().mockResolvedValue({
      id: 'r1',
      storeId: 's1',
      orderId: 'o1',
      status: 'requested',
      items: [{ id: 'ri1', orderItemId: 'oi1', quantity: 1, orderItem: { id: 'oi1', price: '10.00' } }],
    }),
    findByStore: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    findById: vi.fn().mockResolvedValue(null),
    updateStatus: vi.fn().mockResolvedValue({ id: 'r1', status: 'approved' }),
    transitionStatus: vi.fn().mockResolvedValue({ id: 'r1', status: 'refunded' }),
  },
  orderRepo: {
    findById: vi.fn().mockResolvedValue({
      id: 'o1',
      storeId: 's1',
      customerId: 'c1',
      status: 'fulfilled',
    }),
    restoreInventory: vi.fn().mockResolvedValue(undefined),
  },
  refundService: { refundPayment: vi.fn().mockResolvedValue({ refundId: 'ref-1' }) },
  paymentRepo: { findCompletedPaymentByOrderId: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('./return.repo.js', () => ({ returnRepo }));
vi.mock('../order/order.repo.js', () => ({ orderRepo }));
vi.mock('../payment/payment.refund.service.js', () => ({ refundService }));
vi.mock('../payment/payment.repo.js', () => paymentRepo);

import { returnService } from './return.service.js';

describe('return.service wraps return order work in withTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish default resolved values after clearAllMocks.
    returnRepo.create.mockResolvedValue({ id: 'r1', storeId: 's1', status: 'requested' });
    returnRepo.createItem.mockResolvedValue({ id: 'ri1' });
    returnRepo.findByIdWithItems.mockResolvedValue({
      id: 'r1',
      storeId: 's1',
      orderId: 'o1',
      status: 'requested',
      items: [{ id: 'ri1', orderItemId: 'oi1', quantity: 1, orderItem: { id: 'oi1', price: '10.00' } }],
    });
    returnRepo.findByStore.mockResolvedValue({ data: [], total: 0 });
    returnRepo.findById.mockResolvedValue(null);
    orderRepo.findById.mockResolvedValue({
      id: 'o1',
      storeId: 's1',
      customerId: 'c1',
      status: 'fulfilled',
    });
    paymentRepo.findCompletedPaymentByOrderId.mockResolvedValue(undefined);
  });

  it('createReturn runs inside withTenant(data.storeId) and passes the sentinel tx to orderRepo.findById', async () => {
    await returnService.createReturn({
      storeId: 's1',
      orderId: 'o1',
      customerId: 'c1',
      reason: 'Broken',
      items: [{ orderItemId: 'oi1', quantity: 1, reason: 'Defective' }],
    });

    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(orderRepo.findById).toHaveBeenCalledWith(
      'o1',
      's1',
      expect.objectContaining({ __sentinel: 'tx' }),
    );
    expect(returnRepo.create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ __sentinel: 'tx' }),
    );
    expect(returnRepo.findByIdWithItems).toHaveBeenCalledWith(
      'r1',
      's1',
      expect.objectContaining({ __sentinel: 'tx' }),
    );
  });

  it('listReturns runs inside withTenant(storeId) and passes the sentinel tx to returnRepo.findByStore', async () => {
    await returnService.listReturns('s1', { page: 1, limit: 20 });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(returnRepo.findByStore).toHaveBeenCalledWith(
      's1',
      1,
      20,
      undefined,
      undefined,
      expect.objectContaining({ __sentinel: 'tx' }),
    );
  });

  it('getReturn runs inside withTenant(storeId) and passes the sentinel tx to returnRepo.findByIdWithItems', async () => {
    await returnService.getReturn('r1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(returnRepo.findByIdWithItems).toHaveBeenCalledWith(
      'r1',
      's1',
      expect.objectContaining({ __sentinel: 'tx' }),
    );
  });

  it('processRefund wraps the pre-tx findByIdWithItems read in withTenant(storeId) and passes the sentinel tx', async () => {
    // updateStatus first reads the return via returnRepo.findById (NOT wrapped —
    // returns-only, no RLS). Return an 'inspected' return so the inspected→refunded
    // transition is valid and updateStatus dispatches to processRefund.
    returnRepo.findById.mockResolvedValue({ id: 'r1', storeId: 's1', status: 'inspected' });
    // findByIdWithItems returns null so processRefund throws RETURN_NOT_FOUND
    // before reaching the refund tx (now withTenant). The point is to assert
    // the withTenant wrap of the orders/order_items read.
    returnRepo.findByIdWithItems.mockResolvedValue(null);

    await expect(returnService.updateStatus('r1', 's1', 'refunded')).rejects.toMatchObject({
      code: 'RETURN_NOT_FOUND',
    });

    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(returnRepo.findByIdWithItems).toHaveBeenCalledWith(
      'r1',
      's1',
      expect.objectContaining({ __sentinel: 'tx' }),
    );
  });

  it('processRefund runs the refund tx inside withTenant(storeId) and threads tx into restoreInventory + transitionStatus', async () => {
    // updateStatus pre-read: 'inspected' return so the transition is valid.
    returnRepo.findById.mockResolvedValue({ id: 'r1', storeId: 's1', status: 'inspected' });
    // processRefund pre-tx read returns a valid return with one item.
    returnRepo.findByIdWithItems.mockResolvedValue({
      id: 'r1',
      storeId: 's1',
      orderId: 'o1',
      status: 'inspected',
      items: [{ id: 'ri1', orderItemId: 'oi1', quantity: 2, orderItem: { id: 'oi1', productId: 'p1', price: '10.00' } }],
    });
    // No completed card payment → no provider refund call; COD path.
    paymentRepo.findCompletedPaymentByOrderId.mockResolvedValue(undefined);
    // transitionStatus succeeds (returns the refunded row) — the tx body's
    // idempotent fallback (returnRepo.findById) is NOT reached.
    returnRepo.transitionStatus.mockResolvedValue({ id: 'r1', storeId: 's1', status: 'refunded' });

    const result = await returnService.updateStatus('r1', 's1', 'refunded');

    expect(result).toMatchObject({ id: 'r1', status: 'refunded' });
    // withTenant called twice with storeId: pre-tx read + the refund tx.
    expect(withTenantMock).toHaveBeenCalledTimes(2);
    expect(withTenantMock).toHaveBeenNthCalledWith(1, 's1');
    expect(withTenantMock).toHaveBeenNthCalledWith(2, 's1');
    // restoreInventory received the sentinel tx (RLS-scoped inventory write).
    expect(orderRepo.restoreInventory).toHaveBeenCalledWith(
      'p1',
      's1',
      2,
      expect.objectContaining({ __sentinel: 'tx' }),
    );
    // transitionStatus received the sentinel tx.
    expect(returnRepo.transitionStatus).toHaveBeenCalledWith(
      'r1',
      's1',
      'inspected',
      'refunded',
      expect.objectContaining({ refundedAt: expect.any(Date) }),
      expect.objectContaining({ __sentinel: 'tx' }),
    );
  });
});