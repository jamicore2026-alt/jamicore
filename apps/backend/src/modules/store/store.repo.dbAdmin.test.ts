// Behavioral test: every storeRepo method routes through dbAdmin (BYPASSRLS)
// when no tx is passed, because stores is the tenant root and nearly every
// caller is pre-tenant (host-header resolution, registration, auth/session
// hooks) or cross-tenant (superAdmin). A tx, when provided, takes precedence.
// This is the RLS-on-stores fail-closed backstop wiring.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const makeUpdateChain = () => {
    const chain: Record<string, unknown> = {};
    for (const m of ['set', 'where', 'returning']) chain[m] = vi.fn(() => chain);
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([{ id: 's1' }]));
    return chain;
  };
  const dbStoresFindFirst = vi.fn().mockResolvedValue(undefined);
  const dbAdminStoresFindFirst = vi.fn().mockResolvedValue(undefined);
  const makeInsertChain = () => ({
    values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 's1' }]) })),
  });
  const dbInsert = vi.fn(() => makeInsertChain());
  const dbAdminInsert = vi.fn(() => makeInsertChain());
  const dbUpdate = vi.fn(() => makeUpdateChain());
  const dbAdminUpdate = vi.fn(() => makeUpdateChain());
  return {
    db: { query: { stores: { findFirst: dbStoresFindFirst } }, insert: dbInsert, update: dbUpdate },
    dbAdmin: { query: { stores: { findFirst: dbAdminStoresFindFirst } }, insert: dbAdminInsert, update: dbAdminUpdate },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { storeRepo } from './store.repo.js';

const dbStoresFindFirst = db.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminStoresFindFirst = dbAdmin.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbInsert = db.insert as unknown as ReturnType<typeof vi.fn>;
const dbAdminInsert = dbAdmin.insert as unknown as ReturnType<typeof vi.fn>;
const dbUpdate = db.update as unknown as ReturnType<typeof vi.fn>;
const dbAdminUpdate = dbAdmin.update as unknown as ReturnType<typeof vi.fn>;

describe('storeRepo dbAdmin routing (no tx)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findById routes through dbAdmin, not db', async () => {
    await storeRepo.findById('s1');
    expect(dbAdminStoresFindFirst).toHaveBeenCalled();
    expect(dbStoresFindFirst).not.toHaveBeenCalled();
  });

  it('findByDomain routes through dbAdmin, not db', async () => {
    await storeRepo.findByDomain('shop.example.com');
    expect(dbAdminStoresFindFirst).toHaveBeenCalled();
    expect(dbStoresFindFirst).not.toHaveBeenCalled();
  });

  it('findByOwnerId routes through dbAdmin, not db', async () => {
    await storeRepo.findByOwnerId('owner@store.com');
    expect(dbAdminStoresFindFirst).toHaveBeenCalled();
    expect(dbStoresFindFirst).not.toHaveBeenCalled();
  });

  it('create routes through dbAdmin.insert, not db.insert', async () => {
    await storeRepo.create({ id: 's1', name: 'S', domain: 's', ownerEmail: 'e@x.com' } as never);
    expect(dbAdminInsert).toHaveBeenCalled();
    expect(dbInsert).not.toHaveBeenCalled();
  });

  it('update routes through dbAdmin.update, not db.update', async () => {
    await storeRepo.update('s1', { name: 'Updated' });
    expect(dbAdminUpdate).toHaveBeenCalled();
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it('a passed tx takes precedence over dbAdmin (findById)', async () => {
    const txFindFirst = vi.fn().mockResolvedValue({ id: 's1' });
    const tx = { query: { stores: { findFirst: txFindFirst } } } as never;
    await storeRepo.findById('s1', tx);
    expect(txFindFirst).toHaveBeenCalled();
    expect(dbAdminStoresFindFirst).not.toHaveBeenCalled();
  });
});