// Behavioral test: the RLS-gated cart read methods accept and use a `tx` so
// they can ride a withTenant transaction's app.tenant_id. Under RLS a bare-`db`
// query runs on a different pooled connection and would NOT see app.tenant_id
// → zero rows. Asserts each method forwards to `tx`, not `db`, when a tx is
// passed; and falls back to `db` when no tx is passed (preserving existing
// call sites).
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock factories are hoisted above top-level consts, so the mock fns they
// reference must be created via vi.hoisted to be available at hoist-time.
const { cartsFindFirst, dbSelect, selectChain } = vi.hoisted(() => {
  const cartsFindFirst = vi.fn().mockResolvedValue(undefined);
  const selectChain = vi.fn(() => {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'then']) {
      chain[m] = m === 'then'
        ? vi.fn((resolve: (v: unknown) => unknown) => resolve([]))
        : vi.fn(() => chain);
    }
    return chain;
  });
  const dbSelect = vi.fn(() => selectChain());
  return { cartsFindFirst, dbSelect, selectChain };
});

vi.mock('../../db/index.js', () => ({
  db: {
    query: { carts: { findFirst: cartsFindFirst } },
    select: dbSelect,
  },
  dbAdmin: {},
  dbOwner: {},
}));

import { db } from '../../db/index.js';
import { cartRepo } from './cart.repo.js';

// A fake tx: same shape as `db` so `executor.query...` / `executor.select(...)`
// work. We detect tx-usage by giving the tx distinct mocks and asserting the
// tx mock (not the db mock) was called.
function makeTx() {
  return {
    query: { carts: { findFirst: vi.fn().mockResolvedValue(undefined) } },
    select: vi.fn(() => selectChain()),
  };
}

// Reference db so TS noUnusedLocals doesn't flag it; the import exists to pull
// the mocked module into the test graph.
void db;

describe('cart.repo tenant read methods thread tx', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findCartById uses tx when provided, else db', async () => {
    const tx = makeTx();
    await cartRepo.findCartById('c1', 's1', tx as never);
    expect(tx.query.carts.findFirst).toHaveBeenCalled();
    expect(cartsFindFirst).not.toHaveBeenCalled();

    await cartRepo.findCartById('c2', 's2');
    expect(cartsFindFirst).toHaveBeenCalled();
  });

  it('findCartBySessionId uses tx when provided', async () => {
    const tx = makeTx();
    await cartRepo.findCartBySessionId('sess-1', tx as never);
    expect(tx.query.carts.findFirst).toHaveBeenCalled();
    expect(cartsFindFirst).not.toHaveBeenCalled();
  });

  it('findCartByCustomerId uses tx when provided', async () => {
    const tx = makeTx();
    await cartRepo.findCartByCustomerId('cust-1', 's1', tx as never);
    expect(tx.query.carts.findFirst).toHaveBeenCalled();
  });

  it('findCartItemsByCartId uses tx.select when provided, else db.select', async () => {
    const tx = makeTx();
    await cartRepo.findCartItemsByCartId('c1', tx as never);
    expect(tx.select).toHaveBeenCalled();
    expect(dbSelect).not.toHaveBeenCalled();

    await cartRepo.findCartItemsByCartId('c2');
    expect(dbSelect).toHaveBeenCalled();
  });

  it('findCartItemById uses tx.select when provided', async () => {
    const tx = makeTx();
    await cartRepo.findCartItemById('i1', 'c1', tx as never);
    expect(tx.select).toHaveBeenCalled();
  });

  it('findCartItemsByProductId uses tx.select when provided', async () => {
    const tx = makeTx();
    await cartRepo.findCartItemsByProductId('c1', 'p1', tx as never);
    expect(tx.select).toHaveBeenCalled();
  });
});