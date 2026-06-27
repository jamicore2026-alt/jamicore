// Verifies posService wraps all orders/order_items DB work in withTenant(storeId, fn)
// (RLS Phase 1 prep). withTenant + posRepo are mocked; the sentinel tx also exposes
// a `query.products.findMany` mock so createPosOrder's product-validation loop runs.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted so the mock factory (hoisted above imports) can reference withTenantMock.
const { withTenantMock, sentinelTx } = vi.hoisted(() => {
  // Canned product matches input.items[0].productId; enough fields for the
  // non-variant branch of createPosOrder's validation loop.
  const cannedProduct = {
    id: 'p1',
    titleEn: 'Sentinel Product',
    salePrice: '10.00',
    currentQuantity: 100,
    images: ['img.png'],
    variants: [],
  };
  const sentinelTx = {
    __sentinel: 'tx',
    query: {
      products: {
        findMany: vi.fn().mockResolvedValue([cannedProduct]),
      },
    },
  };
  return {
    withTenantMock: vi.fn(),
    sentinelTx,
  };
});

vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with the sentinel tx so we can assert repos received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn(sentinelTx);
  },
}));

const { repo } = vi.hoisted(() => ({
  repo: {
    searchProducts: vi.fn().mockResolvedValue([]),
    decrementInventory: vi.fn().mockResolvedValue(undefined),
    createOrder: vi.fn().mockResolvedValue({
      id: 'o1',
      orderNumber: 'POS-1',
      createdAt: new Date(),
      status: 'completed',
    }),
    listPosOrders: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    findPosOrderById: vi.fn().mockResolvedValue({
      id: 'o1',
      storeId: 's1',
      items: [],
    }),
  },
}));
vi.mock('./pos.repo.js', () => ({ posRepo: repo }));

import { posService } from './pos.service.js';

describe('pos.service wraps POS order work in withTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-seed the products mock after clearAllMocks.
    sentinelTx.query.products.findMany.mockResolvedValue([
      {
        id: 'p1',
        titleEn: 'Sentinel Product',
        salePrice: '10.00',
        currentQuantity: 100,
        images: ['img.png'],
        variants: [],
      },
    ]);
  });

  it('createPosOrder runs inside withTenant(storeId) and passes the sentinel tx to createOrder + decrementInventory', async () => {
    await posService.createPosOrder('s1', 'cashier-1', 'cashier@store.local', 'USD', {
      items: [{ productId: 'p1', quantity: 1, price: 10 }],
      paymentMethod: 'cash',
      amountTendered: 20,
    });

    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.decrementInventory).toHaveBeenCalledWith(
      'p1',
      's1',
      1,
      null,
      expect.objectContaining({ __sentinel: 'tx' }),
    );
    expect(repo.createOrder).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ __sentinel: 'tx' }),
    );
  });

  it('listPosOrders runs inside withTenant(storeId) and passes the sentinel tx to posRepo.listPosOrders', async () => {
    await posService.listPosOrders('s1', { page: 1, limit: 20 });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.listPosOrders).toHaveBeenCalledWith(
      's1',
      { page: 1, limit: 20 },
      expect.objectContaining({ __sentinel: 'tx' }),
    );
  });

  it('getPosOrder runs inside withTenant(storeId) and passes the sentinel tx to posRepo.findPosOrderById', async () => {
    await posService.getPosOrder('o1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findPosOrderById).toHaveBeenCalledWith(
      'o1',
      's1',
      expect.objectContaining({ __sentinel: 'tx' }),
    );
  });
});