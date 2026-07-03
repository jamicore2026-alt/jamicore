/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies planLimitsService.getPlanLimits wraps the products count in
// withTenant(storeId, fn) (RLS Phase 1 catalog). withTenant is mocked to
// invoke fn with a sentinel tx; dbAdmin is mocked so we can assert the
// products count ran on the sentinel tx (RLS gates `products` — a bare db
// count would zero-out under catalog-RLS). `stores` now has RLS (migration
// 0031) so the store lookup + users count run on dbAdmin (BYPASSRLS); users
// has no RLS yet (follow-up for the users-RLS phase). Real schema + real
// drizzle-orm are used so `eq(products.storeId, …)` builds an authentic
// filter clause (the mocked query chains ignore it).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock, sentinelTx, productsFrom, productsWhere } = vi.hoisted(() => {
  const productsChain: Record<string, unknown> = {};
  const productsFrom = vi.fn(() => productsChain);
  const productsWhere = vi.fn(() => productsChain);
  productsChain.where = productsWhere;
  productsChain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([{ value: 7 }]));
  const sentinelTx = {
    __sentinel: 'tx',
    select: vi.fn(() => ({ from: productsFrom })),
  };
  return { withTenantMock: vi.fn(), sentinelTx, productsFrom, productsWhere };
});

vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn(sentinelTx);
  },
}));

const { usersFrom, usersWhere, storesFindFirst } = vi.hoisted(() => {
  const usersChain: Record<string, unknown> = {};
  const usersFrom = vi.fn(() => usersChain);
  const usersWhere = vi.fn(() => usersChain);
  usersChain.where = usersWhere;
  usersChain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([{ value: 3 }]));
  const storesFindFirst = vi.fn().mockResolvedValue({
    id: 's1',
    planId: 'plan-1',
    usedStorage: 100,
    plan: { maxProducts: 10, maxStorage: 2048, maxStaff: 5 },
  });
  return { usersFrom, usersWhere, storesFindFirst };
});

vi.mock('../../db/index.js', () => ({
  dbAdmin: {
    query: { stores: { findFirst: storesFindFirst } },
    select: vi.fn(() => ({ from: usersFrom })),
  },
}));

import { planLimitsService } from './planLimits.service.js';

describe('planLimitsService.getPlanLimits wraps products count in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs the products count inside withTenant(storeId) on the sentinel tx; users stays on bare db', async () => {
    const result = await planLimitsService.getPlanLimits('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    // products count ran on the sentinel tx
    expect(sentinelTx.select).toHaveBeenCalled();
    expect(productsFrom).toHaveBeenCalled();
    expect(productsWhere).toHaveBeenCalled();
    // users count ran on dbAdmin (BYPASSRLS; users has no RLS yet — follow-up)
    expect(usersFrom).toHaveBeenCalled();
    expect(result).toEqual({
      maxProducts: 10,
      maxStorage: 2048,
      maxStaff: 5,
      usedProducts: 7,
      usedStorage: 100,
      usedStaff: 3,
    });
  });

  it('throws STORE_NOT_FOUND when store is missing (before any withTenant call)', async () => {
    storesFindFirst.mockResolvedValueOnce(undefined);
    await expect(planLimitsService.getPlanLimits('missing')).rejects.toMatchObject({
      code: 'STORE_NOT_FOUND',
    });
    expect(withTenantMock).not.toHaveBeenCalled();
  });
});