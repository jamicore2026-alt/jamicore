// Behavioral test: the pre-tenant API-key auth lookup (findByKeyHash) routes
// through dbAdmin (BYPASSRLS), not the tenant-scoped db. This lookup happens
// BEFORE the storeId is known (the hash resolves to a storeId), so it cannot
// run inside withTenant and must bypass RLS once apiKeys gets RLS.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const dbFindFirst = vi.fn();
  const dbAdminFindFirst = vi.fn();
  const dbAdminUpdate = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) }));
  return {
    db: { query: { apiKeys: { findFirst: dbFindFirst } } },
    dbAdmin: { query: { apiKeys: { findFirst: dbAdminFindFirst } }, update: dbAdminUpdate },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { apiKeyRepo } from './apiKey.repo.js';

const dbFindFirst = db.query.apiKeys.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminFindFirst = dbAdmin.query.apiKeys.findFirst as unknown as ReturnType<typeof vi.fn>;

describe('apiKeyRepo pre-tenant lookup dbAdmin routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbAdminFindFirst.mockResolvedValue(undefined);
  });

  it('findByKeyHash routes through dbAdmin, not db', async () => {
    await apiKeyRepo.findByKeyHash('hash-1');

    expect(dbAdminFindFirst).toHaveBeenCalled();
    expect(dbFindFirst).not.toHaveBeenCalled();
  });
});