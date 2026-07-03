// Verifies cartService wraps all carts/cart_items DB work in withTenant(storeId, fn)
// (RLS Phase 1 prep). withTenant + cartRepo + pricingService + productRepo are mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
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
    findCartById: vi.fn().mockResolvedValue(undefined),
    findCartByCustomerId: vi.fn().mockResolvedValue(undefined),
    findCartItemsByCartId: vi.fn().mockResolvedValue([]),
    findCartItemsByProductId: vi.fn().mockResolvedValue([]),
    findCartItemById: vi.fn().mockResolvedValue(null),
    insertCart: vi.fn().mockResolvedValue({ id: 'c1', storeId: 's1', items: [] }),
    insertCartItem: vi.fn().mockResolvedValue({ id: 'i1', cartId: 'c1', quantity: 1, price: '10.00', total: '10.00' }),
    insertCartItemsBatch: vi.fn().mockResolvedValue([]),
    incrementCartItemQuantities: vi.fn().mockResolvedValue([]),
    updateCartItem: vi.fn().mockResolvedValue({ id: 'i1', quantity: 1, price: '10.00', total: '10.00' }),
    deleteCartItem: vi.fn().mockResolvedValue(undefined),
    deleteCart: vi.fn().mockResolvedValue(undefined),
    updateCartCustomerId: vi.fn().mockResolvedValue({ id: 'c1' }),
    updateCartTotals: vi.fn().mockResolvedValue({ id: 'c1' }),
    recalculateCartTotalsInDb: vi.fn().mockResolvedValue({ id: 'c1', subtotal: '10.00', total: '10.00', itemCount: 1 }),
  },
}));
vi.mock('./cart.repo.js', () => ({ cartRepo: repo }));

// addItem/updateItemQuantity call pricingService.computeItemPrice + productRepo.findById.
const { productRepo } = vi.hoisted(() => ({
  productRepo: {
    findById: vi.fn().mockResolvedValue({ id: 'p1', storeId: 's1', currentQuantity: 100 }),
    findManyByIds: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../product/product.repo.js', () => ({ productRepo }));

const { pricingService } = vi.hoisted(() => ({
  pricingService: {
    computeItemPrice: vi.fn().mockResolvedValue({ effectivePrice: '10.00', lineTotal: '10.00' }),
  },
}));
vi.mock('../pricing/pricing.service.js', () => ({ pricingService }));

import { cartService } from './cart.service.js';

describe('cart.service wraps cart work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getOrCreateCart runs inside withTenant(storeId) and threads tx to findCartById/insertCart', async () => {
    await cartService.getOrCreateCart('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    // When a cartId is provided and found, findCartById is called with the tx;
    // when not found, insertCart is called with the tx.
    expect(repo.findCartById).toHaveBeenCalledWith('c1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('getOrCreateCart (new cart) runs inside withTenant and inserts on tx', async () => {
    repo.findCartById.mockResolvedValueOnce(undefined);
    await cartService.getOrCreateCart(undefined, 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.insertCart).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('recalculateTotals(storeId, cartId) runs inside withTenant(storeId)', async () => {
    await cartService.recalculateTotals('s1', 'c1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.recalculateCartTotalsInDb).toHaveBeenCalledWith('c1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('addItem runs inside withTenant(storeId) and threads tx to inserts/recalc', async () => {
    repo.findCartItemsByProductId.mockResolvedValueOnce([]);
    await cartService.addItem('c1', 's1', { productId: 'p1', quantity: 1 }, 'cust-1', undefined);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.insertCartItem).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
    expect(repo.recalculateCartTotalsInDb).toHaveBeenCalledWith('c1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('addItem threads the withTenant tx into productRepo.findById', async () => {
    repo.findCartItemsByProductId.mockResolvedValueOnce([]);
    await cartService.addItem('c1', 's1', {
      productId: 'p1',
      quantity: 1,
    }, undefined, undefined);
    expect(productRepo.findById).toHaveBeenCalledWith('p1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('mergeCartOnLogin threads the withTenant tx into productRepo.findManyByIds', async () => {
    // Guest cart with one item + an existing customer cart triggers the
    // product-batch load path (Step 1 of the merge flow).
    repo.findCartById.mockResolvedValueOnce({
      id: 'guest', storeId: 's1', customerId: undefined,
      items: [{ id: 'gi1', productId: 'p1', quantity: 1, modifiers: null }],
    });
    repo.findCartByCustomerId.mockResolvedValueOnce({
      id: 'cust-cart', storeId: 's1', customerId: 'cust-1', items: [],
    });
    repo.findCartItemsByCartId.mockResolvedValueOnce([]);
    productRepo.findManyByIds.mockResolvedValueOnce([
      { id: 'p1', storeId: 's1', salePrice: '10.00', purchasePrice: '10.00', titleEn: 'Item', currentQuantity: 100 },
    ]);
    await cartService.mergeCartOnLogin('guest', 'cust-1', 's1', undefined);
    expect(productRepo.findManyByIds).toHaveBeenCalledWith(expect.any(Array), 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('updateItemQuantity runs inside withTenant(storeId)', async () => {
    // findCartItemById must return an item so the service reaches updateCartItem
    // (the brief's default mock returns null, which would throw CART_ITEM_NOT_FOUND).
    repo.findCartItemById.mockResolvedValueOnce({ id: 'i1', cartId: 'c1', quantity: 1, price: '10.00' });
    await cartService.updateItemQuantity('c1', 'i1', 2, 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.updateCartItem).toHaveBeenCalledWith('i1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('removeItem runs inside withTenant(storeId)', async () => {
    await cartService.removeItem('c1', 'i1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.deleteCartItem).toHaveBeenCalledWith('i1', 'c1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('mergeCartOnLogin runs inside withTenant(storeId)', async () => {
    repo.findCartById.mockResolvedValueOnce({ id: 'guest', storeId: 's1', customerId: undefined, items: [] });
    repo.findCartByCustomerId.mockResolvedValueOnce(undefined);
    await cartService.mergeCartOnLogin('guest', 'cust-1', 's1', undefined);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.updateCartCustomerId).toHaveBeenCalledWith('guest', 'cust-1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  // Guard for the Phase 1 final-review regression: the else-if branch
  // (guestCart && !customerCart — adopt guest cart as customer's first cart)
  // must NOT schedule abandoned-cart recovery. The original code only called
  // updateCartCustomerId here; the merge branch (guestCart && customerCart) is
  // the one that schedules once after the merge. See spec §4.2.
  it('mergeCartOnLogin else-if branch (adopt guest cart) does NOT schedule abandoned-cart recovery', async () => {
    const abandonedCartQueueAdd = vi.fn();
    const queueService = { abandonedCartQueue: { add: abandonedCartQueueAdd } } as unknown as import('../../services/queue.service.js').QueueService;
    repo.findCartById.mockResolvedValueOnce({ id: 'guest', storeId: 's1', customerId: undefined, items: [] });
    repo.findCartByCustomerId.mockResolvedValueOnce(undefined);
    await cartService.mergeCartOnLogin('guest', 'cust-1', 's1', queueService);
    expect(repo.updateCartCustomerId).toHaveBeenCalledWith('guest', 'cust-1', expect.objectContaining({ __sentinel: 'tx' }));
    expect(abandonedCartQueueAdd).not.toHaveBeenCalled();
  });
});