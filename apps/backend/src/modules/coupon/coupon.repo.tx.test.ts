// Behavioral test: the RLS-gated coupon repo methods accept and use a `tx` so
// they can ride a withTenant transaction's app.tenant_id. Under RLS a bare-`db`
// query runs on a different pooled connection and would NOT see app.tenant_id
// → zero rows. Asserts each method forwards to `tx`, not `db`, when a tx is
// passed; and falls back to `db` when no tx is passed (preserving existing
// call sites).
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock factories are hoisted above top-level consts, so the mock fns they
// reference must be created via vi.hoisted to be available at hoist-time.
const {
  couponsFindMany,
  couponsFindFirst,
  dbSelect,
  selectChain,
  insertChain,
  updateChain,
  deleteChain,
} = vi.hoisted(() => {
  const couponsFindMany = vi.fn().mockResolvedValue([]);
  const couponsFindFirst = vi.fn().mockResolvedValue(undefined);
  const selectChain = vi.fn(() => {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'orderBy', 'limit', 'offset']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([{ count: 0 }]));
    return chain;
  });
  const dbSelect = vi.fn(() => selectChain());
  const insertReturn = vi.fn().mockResolvedValue([{ id: 'cp1' }]);
  const updateReturn = vi.fn().mockResolvedValue([{ id: 'cp1' }]);
  const deleteChain = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
  const insertChain = vi.fn(() => ({ values: vi.fn(() => ({ returning: insertReturn })) }));
  const updateChain = vi.fn(() => ({
    set: vi.fn(() => ({ where: vi.fn(() => ({ returning: updateReturn })) })),
  }));
  return {
    couponsFindMany,
    couponsFindFirst,
    dbSelect,
    selectChain,
    insertReturn,
    updateReturn,
    insertChain,
    updateChain,
    deleteChain,
  };
});

vi.mock('../../db/index.js', () => ({
  db: {
    query: { coupons: { findMany: couponsFindMany, findFirst: couponsFindFirst } },
    select: dbSelect,
    insert: vi.fn(() => insertChain()),
    update: vi.fn(() => updateChain()),
    delete: vi.fn(() => deleteChain()),
  },
  dbAdmin: {},
  dbOwner: {},
}));

import { db } from '../../db/index.js';
import { couponRepo } from './coupon.repo.js';

// Reference db so TS noUnusedLocals doesn't flag it; the import exists to pull
// the mocked module into the test graph.
void db;

// A fake tx: same shape as `db` so `executor.query...` / `executor.select(...)`
// work. We detect tx-usage by giving the tx distinct mocks and asserting the
// tx mock (not the db mock) was called.
function makeTx() {
  return {
    query: {
      coupons: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(undefined),
      },
    },
    select: vi.fn(() => selectChain()),
    insert: vi.fn(() => insertChain()),
    update: vi.fn(() => updateChain()),
    delete: vi.fn(() => deleteChain()),
  };
}

describe('coupon.repo methods thread tx', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findManyByStoreId uses tx when provided, else db', async () => {
    const tx = makeTx();
    await couponRepo.findManyByStoreId('s1', { limit: 10 }, tx as never);
    expect(tx.query.coupons.findMany).toHaveBeenCalled();
    expect(couponsFindMany).not.toHaveBeenCalled();

    await couponRepo.findManyByStoreId('s2');
    expect(couponsFindMany).toHaveBeenCalled();
  });

  it('findById uses tx when provided', async () => {
    const tx = makeTx();
    await couponRepo.findById('cp1', 's1', tx as never);
    expect(tx.query.coupons.findFirst).toHaveBeenCalled();
    expect(couponsFindFirst).not.toHaveBeenCalled();
  });

  it('findByCode uses tx when provided', async () => {
    const tx = makeTx();
    await couponRepo.findByCode('SAVE10', 's1', tx as never);
    expect(tx.query.coupons.findFirst).toHaveBeenCalled();
  });

  it('countByStoreId uses tx.select when provided', async () => {
    const tx = makeTx();
    await couponRepo.countByStoreId('s1', tx as never);
    expect(tx.select).toHaveBeenCalled();
    expect(dbSelect).not.toHaveBeenCalled();
  });

  it('countCustomerUsages uses tx.select when provided', async () => {
    const tx = makeTx();
    await couponRepo.countCustomerUsages('cp1', 'cust-1', tx as never);
    expect(tx.select).toHaveBeenCalled();
  });

  it('create uses tx.insert when provided', async () => {
    const tx = makeTx();
    await couponRepo.create({ storeId: 's1', code: 'X', type: 'fixed', value: '5' } as never, tx as never);
    expect(tx.insert).toHaveBeenCalled();
  });

  it('update uses tx.update when provided', async () => {
    const tx = makeTx();
    await couponRepo.update('cp1', 's1', { description: 'd' } as never, tx as never);
    expect(tx.update).toHaveBeenCalled();
  });

  it('deleteById uses tx.delete when provided', async () => {
    const tx = makeTx();
    await couponRepo.deleteById('cp1', 's1', tx as never);
    expect(tx.delete).toHaveBeenCalled();
  });

  it('insertCouponUsage uses tx.insert when provided', async () => {
    const tx = makeTx();
    await couponRepo.insertCouponUsage({ couponId: 'cp1', customerId: 'c', orderId: 'o', storeId: 's1' } as never, tx as never);
    expect(tx.insert).toHaveBeenCalled();
  });
});