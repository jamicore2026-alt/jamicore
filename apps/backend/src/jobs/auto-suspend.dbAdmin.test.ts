// Asserts the auto-suspend job reads + updates stores via dbAdmin (BYPASSRLS),
// not db (app_tenant). This is a cross-tenant background job that scans ALL
// stores regardless of tenant context; under stores-RLS (migration 0031) a
// bare-db read with no app.tenant_id fails closed → 0 rows → expired trials
// never suspend. Locks the dbAdmin routing in so a future refactor cannot
// silently regress to bare db.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  const makeSelectChain = (resolveValue: unknown) => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolveValue));
    return chain;
  };
  const makeUpdateChain = (resolveValue: unknown) => {
    const chain: Record<string, unknown> = {};
    chain.set = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolveValue));
    return chain;
  };
  // Non-empty result so the update branch runs.
  const dbAdminSelect = vi.fn(() => makeSelectChain([{ id: 's1' }, { id: 's2' }]));
  const dbAdminUpdate = vi.fn(() => makeUpdateChain({ rows: 2 }));
  const dbSelect = vi.fn(() => makeSelectChain([]));
  const dbUpdate = vi.fn(() => makeUpdateChain({ rows: 0 }));
  return { dbAdminSelect, dbAdminUpdate, dbSelect, dbUpdate };
});

vi.mock('../db/index.js', () => ({
  db: { select: hoisted.dbSelect, update: hoisted.dbUpdate },
  dbAdmin: { select: hoisted.dbAdminSelect, update: hoisted.dbAdminUpdate },
  dbOwner: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_l: unknown, _r: unknown) => ({})),
  and: vi.fn(() => ({})),
  lt: vi.fn((_l: unknown, _r: unknown) => ({})),
}));

vi.mock('../db/schema.js', () => ({ stores: { __tname: 'stores', id: 'id', status: 'status', trialEndsAt: 'trialEndsAt' } }));

import { db, dbAdmin } from '../db/index.js';
import { runAutoSuspend } from './auto-suspend.js';

describe('runAutoSuspend reads + updates stores via dbAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses dbAdmin.select + dbAdmin.update (not db) for the cross-tenant scan', async () => {
    await runAutoSuspend({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as never);

    expect(hoisted.dbAdminSelect).toHaveBeenCalled();
    expect(hoisted.dbAdminUpdate).toHaveBeenCalled();
    expect(hoisted.dbSelect).not.toHaveBeenCalled();
    expect(hoisted.dbUpdate).not.toHaveBeenCalled();
    expect(dbAdmin).not.toBe(db); // sanity: distinct clients
  });
});