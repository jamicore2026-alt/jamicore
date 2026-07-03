// Behavioral test: superAdminRepo routes ALL reads through dbAdmin (BYPASSRLS),
// never the tenant-scoped `db`. This is what keeps cross-tenant super-admin
// views working once hub tables get RLS. Mocks both connections; asserts the
// dbAdmin query chain is used and the `db` chain is NOT.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const dbFindFirst = vi.fn();
  const dbAdminFindFirst = vi.fn();
  return {
    db: { query: { stores: { findFirst: dbFindFirst } } },
    dbAdmin: { query: { stores: { findFirst: dbAdminFindFirst } } },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { superAdminRepo } from './superAdmin.repo.js';

const dbFindFirst = db.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminFindFirst = dbAdmin.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;

describe('superAdminRepo dbAdmin routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbAdminFindFirst.mockResolvedValue(undefined);
  });

  it('routes cross-tenant reads through dbAdmin (BYPASSRLS), not the tenant-scoped db', async () => {
    await superAdminRepo.findStoreById('store-1');

    expect(dbAdminFindFirst).toHaveBeenCalled();
    expect(dbFindFirst).not.toHaveBeenCalled();
  });
});