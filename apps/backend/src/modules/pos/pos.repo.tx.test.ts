// Behavioral test: the RLS-gated pos.repo read methods accept and use a `tx`
// (so they can ride a withTenant transaction's app.tenant_id). Under RLS a
// bare-`db` query runs on a different pooled connection and would NOT see
// app.tenant_id → zero rows. Asserts each method forwards to `tx`, not `db`,
// when a tx is passed. Also asserts createOrder threads its tx into
// generateOrderNumber (so the uniqueness check rides the same tx).
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures the mock fns exist before vitest hoists the vi.mock()
// call above top-level `const` declarations (canonical Vitest fix).
const { ordersFindFirst, ordersFindMany, productsFindFirst, productsFindMany, dbSelect, selectChain } = vi.hoisted(() => {
  const selectChain = vi.fn(() => {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'orderBy', 'limit', 'offset']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ count: 0 }));
    return chain;
  });
  return {
    ordersFindFirst: vi.fn().mockResolvedValue(undefined),
    ordersFindMany: vi.fn().mockResolvedValue([]),
    productsFindFirst: vi.fn().mockResolvedValue(undefined),
    productsFindMany: vi.fn().mockResolvedValue([]),
    dbSelect: vi.fn(() => selectChain()),
    selectChain,
  };
});

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      orders: { findFirst: ordersFindFirst, findMany: ordersFindMany },
      products: { findFirst: productsFindFirst, findMany: productsFindMany },
    },
    select: dbSelect,
  },
  dbAdmin: { query: { orders: { findFirst: vi.fn(), findMany: vi.fn() } } },
  dbOwner: {},
}));

import { posRepo } from './pos.repo.js';

// A fake tx: same shape as `db.query` / `db.select` so `executor = tx ?? db`
// works. We detect tx-usage by giving the tx distinct mocks and asserting the
// tx mock (not the db mock) was called.
function makeTx() {
  return {
    query: {
      orders: {
        findFirst: vi.fn().mockResolvedValue(undefined),
        findMany: vi.fn().mockResolvedValue([]),
      },
      products: {
        findFirst: vi.fn().mockResolvedValue(undefined),
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
    select: vi.fn(() => selectChain()),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'o1' }]) })),
    })),
  };
}

describe('pos.repo tenant read methods thread tx', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generateOrderNumber uses tx when provided', async () => {
    const tx = makeTx();
    await posRepo.generateOrderNumber(tx as never);
    expect(tx.query.orders.findFirst).toHaveBeenCalled();
    expect(ordersFindFirst).not.toHaveBeenCalled();
  });

  it('listPosOrders uses tx when provided', async () => {
    const tx = makeTx();
    await posRepo.listPosOrders('s1', { page: 1, limit: 10 }, tx as never);
    expect(tx.query.orders.findMany).toHaveBeenCalled();
    expect(ordersFindMany).not.toHaveBeenCalled();
  });

  it('findPosOrderById uses tx when provided', async () => {
    const tx = makeTx();
    await posRepo.findPosOrderById('o1', 's1', tx as never);
    expect(tx.query.orders.findFirst).toHaveBeenCalled();
    expect(ordersFindFirst).not.toHaveBeenCalled();
  });

  it('createOrder passes its tx to generateOrderNumber', async () => {
    const tx = makeTx();
    const spy = vi.spyOn(posRepo, 'generateOrderNumber').mockResolvedValue('POS-X');
    await posRepo.createOrder(
      {
        storeId: 's1',
        cashierId: 'u1',
        email: 'c@x',
        currency: 'USD',
        orderType: 'pos',
        paymentMethod: 'cash',
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        status: 'completed',
      },
      tx as never,
    );
    expect(spy).toHaveBeenCalledWith(tx);
    spy.mockRestore();
  });

  it('searchProducts uses tx when provided (barcode branch)', async () => {
    const tx = makeTx();
    await posRepo.searchProducts('s1', { barcode: 'BC1', limit: 1 }, tx as never);
    expect(tx.query.products.findMany).toHaveBeenCalled();
    expect(productsFindMany).not.toHaveBeenCalled();
  });

  it('searchProducts uses tx when provided (search branch)', async () => {
    const tx = makeTx();
    await posRepo.searchProducts('s1', { search: 'foo', limit: 10 }, tx as never);
    expect(tx.query.products.findMany).toHaveBeenCalled();
    expect(productsFindMany).not.toHaveBeenCalled();
  });

  it('searchProducts uses tx when provided (default branch)', async () => {
    const tx = makeTx();
    await posRepo.searchProducts('s1', { limit: 10 }, tx as never);
    expect(tx.query.products.findMany).toHaveBeenCalled();
    expect(productsFindMany).not.toHaveBeenCalled();
  });

  it('searchProducts falls back to db when no tx', async () => {
    await posRepo.searchProducts('s1', { limit: 10 });
    expect(productsFindMany).toHaveBeenCalled();
  });
});