// RLS Phase 1 prep: return.repo.findByStore must route both its findMany AND its
// count select through a caller-provided tx when present (the orders relation is
// eagerly loaded; under orders-RLS a bare-db read would zero out the joined order).
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted avoids Vitest's hoist ReferenceError for top-level consts referenced
// by vi.mock factory closures.
const { returnsFindMany, dbSelect } = vi.hoisted(() => {
  const returnsFindMany = vi.fn().mockResolvedValue([]);
  const selectChain = vi.fn(() => {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'limit', 'offset', 'orderBy']) chain[m] = vi.fn(() => chain);
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ count: 0 }));
    return chain;
  });
  const dbSelect = vi.fn(() => selectChain());
  return { returnsFindMany, dbSelect, selectChain };
});

vi.mock('../../db/index.js', () => ({
  db: { query: { returns: { findMany: returnsFindMany } }, select: dbSelect },
  dbAdmin: {},
  dbOwner: {},
}));

import { returnRepo } from './return.repo.js';

// Distinct select chain for tx so we can independently assert that the count
// select routes through tx (not db) when a tx is passed — closes the count-
// coverage gap noted in Tasks 1-2.
function makeTx() {
  const txSelectChain = vi.fn(() => {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'limit', 'offset', 'orderBy']) chain[m] = vi.fn(() => chain);
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ count: 0 }));
    return chain;
  });
  return {
    query: { returns: { findMany: vi.fn().mockResolvedValue([]) } },
    select: vi.fn(() => txSelectChain()),
  };
}

describe('return.repo.findByStore threads tx', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses tx when provided, else db — for both findMany and count select', async () => {
    const tx = makeTx() as never;
    await returnRepo.findByStore('s1', 1, 10, undefined, undefined, tx);

    // findMany routes through tx
    expect(tx.query.returns.findMany).toHaveBeenCalled();
    expect(returnsFindMany).not.toHaveBeenCalled();

    // count select routes through tx (not db)
    expect(tx.select).toHaveBeenCalled();
    expect(dbSelect).not.toHaveBeenCalled();

    // Now exercise the db fallback path
    await returnRepo.findByStore('s1', 1, 10);
    expect(returnsFindMany).toHaveBeenCalled();
    expect(dbSelect).toHaveBeenCalled();
  });
});