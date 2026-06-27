// Behavioral test: the RLS-gated order read methods accept and use a `tx`
// (so they can ride a withTenant transaction's app.tenant_id). Under RLS a
// bare-`db` query runs on a different pooled connection and would NOT see
// app.tenant_id → zero rows. Asserts each method forwards to `tx`, not `db`,
// when a tx is passed; and falls back to `db` when no tx is passed (preserving
// existing call sites).
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db so we can observe which client a method uses. Both `db` and a passed
// `tx` are thenable-ish Drizzle stand-ins: we only assert call routing, so a
// minimal chain mock suffices. vi.hoisted ensures the mock fns exist before
// vitest hoists the vi.mock() call.
const {
  ordersFindFirst,
  ordersFindMany,
  orderItemsFindMany,
  productsFindMany,
  dbSelect,
  selectChain,
} = vi.hoisted(() => {
  const selectChain = vi.fn(() => {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'orderBy', 'limit', 'offset', 'innerJoin', 'leftJoin', 'groupBy']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ rows: [], length: 0 }));
    return chain;
  });
  return {
    ordersFindFirst: vi.fn().mockResolvedValue(undefined),
    ordersFindMany: vi.fn().mockResolvedValue([]),
    orderItemsFindMany: vi.fn().mockResolvedValue([]),
    productsFindMany: vi.fn().mockResolvedValue([]),
    dbSelect: vi.fn(() => selectChain()),
    selectChain,
  };
});

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      orders: { findFirst: ordersFindFirst, findMany: ordersFindMany },
      orderItems: { findMany: orderItemsFindMany },
      products: { findMany: productsFindMany },
    },
    select: dbSelect,
  },
  dbAdmin: { query: { orders: { findFirst: vi.fn(), findMany: vi.fn() } } },
  dbOwner: {},
}));

import { orderRepo } from './order.repo.js';

// A fake tx: same shape as `db.query` so `executor.query...` works. We detect
// tx-usage by giving the tx distinct mocks and asserting the tx mock (not the
// db mock) was called.
function makeTx() {
  return {
    query: {
      orders: { findFirst: vi.fn().mockResolvedValue(undefined), findMany: vi.fn().mockResolvedValue([]) },
      orderItems: { findMany: vi.fn().mockResolvedValue([]) },
      products: { findMany: vi.fn().mockResolvedValue([]) },
    },
    select: vi.fn(() => selectChain()),
  };
}

describe('order.repo tenant read methods thread tx', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByIdSimple uses tx when provided, else db', async () => {
    const tx = makeTx();
    await orderRepo.findByIdSimple('o1', 's1', tx as never);
    expect(tx.query.orders.findFirst).toHaveBeenCalledWith(expect.objectContaining({}));
    expect(ordersFindFirst).not.toHaveBeenCalled();

    await orderRepo.findByIdSimple('o2', 's2');
    expect(ordersFindFirst).toHaveBeenCalled();
  });

  it('findOrderItemsByOrderId uses tx when provided, else db', async () => {
    const tx = makeTx();
    await orderRepo.findOrderItemsByOrderId('o1', 's1', tx as never);
    expect(tx.query.orderItems.findMany).toHaveBeenCalled();
    expect(orderItemsFindMany).not.toHaveBeenCalled();
  });

  it('findById uses tx for the orders lookup when provided', async () => {
    const tx = makeTx();
    await orderRepo.findById('o1', 's1', tx as never);
    expect(tx.query.orders.findFirst).toHaveBeenCalled();
    expect(ordersFindFirst).not.toHaveBeenCalled();
  });

  it('findByOrderNumber uses tx when provided', async () => {
    const tx = makeTx();
    await orderRepo.findByOrderNumber('ON-1', 's1', tx as never);
    expect(tx.query.orders.findFirst).toHaveBeenCalled();
  });

  it('findByCustomerId uses tx when provided', async () => {
    const tx = makeTx();
    await orderRepo.findByCustomerId('s1', 'c1', { page: 1, limit: 10 }, tx as never);
    expect(tx.query.orders.findMany).toHaveBeenCalled();
    expect(ordersFindMany).not.toHaveBeenCalled();
  });

  it('findByStoreId uses tx when provided', async () => {
    const tx = makeTx();
    await orderRepo.findByStoreId('s1', { page: 1, limit: 10 }, tx as never);
    expect(tx.query.orders.findMany).toHaveBeenCalled();
  });
});