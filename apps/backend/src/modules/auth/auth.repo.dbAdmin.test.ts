// Behavioral test: pre-tenant auth reads route through dbAdmin (BYPASSRLS),
// not the tenant-scoped db. verification_tokens gets no grant to app_tenant
// (RLS spec §4.3) and the store-registration trio runs before any storeId
// exists, so both MUST bypass RLS.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const dbFindFirst = vi.fn();
  const dbAdminFindFirst = vi.fn();
  const dbStoresFindFirst = vi.fn().mockResolvedValue(undefined);
  const dbAdminStoresFindFirst = vi.fn().mockResolvedValue(undefined);
  const makeInsertChain = () => ({
    values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 's1' }]) })),
  });
  const dbInsert = vi.fn(() => makeInsertChain());
  const dbAdminInsert = vi.fn(() => makeInsertChain());
  return {
    db: { query: { verificationTokens: { findFirst: dbFindFirst }, stores: { findFirst: dbStoresFindFirst } }, insert: dbInsert },
    dbAdmin: { query: { verificationTokens: { findFirst: dbAdminFindFirst }, stores: { findFirst: dbAdminStoresFindFirst } }, insert: dbAdminInsert },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { authRepo } from './auth.repo.js';

const dbFindFirst = db.query.verificationTokens.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminFindFirst = dbAdmin.query.verificationTokens.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbStoresFindFirst = db.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminStoresFindFirst = dbAdmin.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbInsert = db.insert as unknown as ReturnType<typeof vi.fn>;
const dbAdminInsert = dbAdmin.insert as unknown as ReturnType<typeof vi.fn>;

describe('authRepo pre-tenant dbAdmin routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbAdminFindFirst.mockResolvedValue(undefined);
  });

  it('findVerificationToken routes through dbAdmin, not db', async () => {
    await authRepo.findVerificationToken('tok-1', 'email_verify');
    expect(dbAdminFindFirst).toHaveBeenCalled();
    expect(dbFindFirst).not.toHaveBeenCalled();
  });

  it('findStoreByOwnerEmail routes through dbAdmin, not db', async () => {
    await authRepo.findStoreByOwnerEmail('owner@store.com');
    expect(dbAdminStoresFindFirst).toHaveBeenCalled();
    expect(dbStoresFindFirst).not.toHaveBeenCalled();
  });

  it('findStoreByDomain routes through dbAdmin, not db', async () => {
    await authRepo.findStoreByDomain('shop');
    expect(dbAdminStoresFindFirst).toHaveBeenCalled();
    expect(dbStoresFindFirst).not.toHaveBeenCalled();
  });

  it('createStore routes through dbAdmin.insert, not db.insert', async () => {
    await authRepo.createStore({ name: 'S', domain: 's', ownerEmail: 'e@x.com' } as never);
    expect(dbAdminInsert).toHaveBeenCalled();
    expect(dbInsert).not.toHaveBeenCalled();
  });
});