// Behavioral test: the cross-tenant / pre-tenant domain reads route through
// dbAdmin (BYPASSRLS), not the tenant-scoped db. These reads are inherently
// cross-tenant — a domain-uniqueness check, a worker poll of all pending
// verifications, and a super-admin list of custom-domain stores — so they
// cannot be scoped by storeId and must bypass RLS once stores /
// domain_verifications get RLS. (stores/domain_verifications have NO RLS yet,
// so this is pure pre-wiring: dbAdmin falls back to the owner URL in dev/test =
// same rows as today.)
//
// NOTE: the dual-use findById / updateStatus and the tenant-scoped writes
// (create, delete, updateStore*, clearStoreCustomDomain) deliberately stay on
// `db` here — their correct withTenant/dbAdmin split belongs in the stores-RLS
// Phase 1 plan, where the RLS policies are designed.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  // A thenable select() chain mock: .from().innerJoin().where().orderBy()
  // .limit().offset() all return the same chain, which resolves to [] when
  // awaited (findStoresWithCustomDomains uses a manual join via select).
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    const self = (method: string) => {
      chain[method] = vi.fn(() => chain);
    };
    for (const m of ['from', 'innerJoin', 'where', 'orderBy', 'limit', 'offset']) self(m);
    chain.then = vi.fn((resolve: (v: unknown[]) => unknown) => resolve([]));
    return chain;
  };
  const dbDvFindMany = vi.fn().mockResolvedValue([]);
  const dbDvFindFirst = vi.fn().mockResolvedValue(undefined);
  const dbStoresFindFirst = vi.fn().mockResolvedValue(undefined);
  const dbAdminDvFindMany = vi.fn().mockResolvedValue([]);
  const dbAdminDvFindFirst = vi.fn().mockResolvedValue(undefined);
  const dbAdminStoresFindFirst = vi.fn().mockResolvedValue(undefined);
  const dbSelect = vi.fn(() => makeChain());
  const dbAdminSelect = vi.fn(() => makeChain());
  return {
    db: {
      query: {
        domainVerifications: { findMany: dbDvFindMany, findFirst: dbDvFindFirst },
        stores: { findFirst: dbStoresFindFirst },
      },
      select: dbSelect,
    },
    dbAdmin: {
      query: {
        domainVerifications: { findMany: dbAdminDvFindMany, findFirst: dbAdminDvFindFirst },
        stores: { findFirst: dbAdminStoresFindFirst },
      },
      select: dbAdminSelect,
    },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { domainRepo } from './domain.repo.js';

const dbDvFindMany = db.query.domainVerifications.findMany as unknown as ReturnType<typeof vi.fn>;
const dbAdminDvFindMany = dbAdmin.query.domainVerifications.findMany as unknown as ReturnType<typeof vi.fn>;
const dbStoresFindFirst = db.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminStoresFindFirst = dbAdmin.query.stores.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbSelect = db.select as unknown as ReturnType<typeof vi.fn>;
const dbAdminSelect = dbAdmin.select as unknown as ReturnType<typeof vi.fn>;

describe('domainRepo cross-tenant reads dbAdmin routing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findPendingVerifications routes through dbAdmin, not db', async () => {
    await domainRepo.findPendingVerifications();

    expect(dbAdminDvFindMany).toHaveBeenCalled();
    expect(dbDvFindMany).not.toHaveBeenCalled();
  });

  it('checkDomainExists routes the store + verification lookups through dbAdmin, not db', async () => {
    await domainRepo.checkDomainExists('shop.example.com');

    // Stores looked up by domain and customDomain, plus the verification lookup.
    expect(dbAdminStoresFindFirst).toHaveBeenCalled();
    expect(dbStoresFindFirst).not.toHaveBeenCalled();
  });

  it('findStoresWithCustomDomains routes the join through dbAdmin.select, not db.select', async () => {
    const result = await domainRepo.findStoresWithCustomDomains({ page: 1, limit: 10 });

    expect(dbAdminSelect).toHaveBeenCalled();
    expect(dbSelect).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], total: 0 });
  });
});