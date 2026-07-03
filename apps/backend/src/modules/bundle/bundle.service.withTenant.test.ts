/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies bundleService wraps every entry in withTenant(storeId, fn) and
// threads the tx into bundleRepo — including the create/update paths that
// previously used a bare db.transaction with no app.tenant_id (RLS Phase 1,
// Approach A). bundleRepo is already tx-threaded; this test pins the callers.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with a sentinel tx so we can assert bundleRepo received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const { bundleRepo } = vi.hoisted(() => ({
  bundleRepo: {
    findManyByStoreId: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    findById: vi.fn().mockResolvedValue({ id: 'b1', storeId: 's1', isActive: true, items: [] }),
    findBundlesByProductId: vi.fn().mockResolvedValue([]),
    findProductsByIds: vi.fn().mockResolvedValue([
      { id: 'p1', isPublished: true },
      { id: 'p2', isPublished: true },
    ]),
    createBundle: vi.fn().mockResolvedValue({ id: 'b1', storeId: 's1' }),
    createBundleItems: vi.fn().mockResolvedValue([]),
    updateBundle: vi.fn().mockResolvedValue({ id: 'b1', storeId: 's1' }),
    deleteBundleItemsByBundleId: vi.fn().mockResolvedValue(undefined),
    deleteBundle: vi.fn().mockResolvedValue({ id: 'b1', storeId: 's1' }),
  },
}));
vi.mock('./bundle.repo.js', () => ({ bundleRepo }));

import { bundleService } from './bundle.service.js';

const tx = expect.objectContaining({ __sentinel: 'tx' });

describe('bundleService wraps bundle work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByStoreId runs inside withTenant(storeId) and threads tx', async () => {
    await bundleService.findByStoreId('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findManyByStoreId).toHaveBeenCalledWith('s1', expect.any(Object), tx);
  });

  it('findById runs inside withTenant(storeId) and threads tx', async () => {
    await bundleService.findById('b1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findById).toHaveBeenCalledWith('b1', 's1', tx);
  });

  it('findBundlesByProductId runs inside withTenant(storeId) and threads tx', async () => {
    await bundleService.findBundlesByProductId('p1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findBundlesByProductId).toHaveBeenCalledWith('p1', 's1', tx);
  });

  it('create runs inside withTenant(data.storeId) and threads tx into every bundleRepo call', async () => {
    await bundleService.create({
      storeId: 's1', name: 'B', price: '10.00',
      items: [{ productId: 'p1', quantity: 1 }, { productId: 'p2', quantity: 1 }],
    } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findProductsByIds).toHaveBeenCalledWith(['p1', 'p2'], 's1', tx);
    expect(bundleRepo.createBundle).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), tx);
    expect(bundleRepo.createBundleItems).toHaveBeenCalledWith(expect.any(Array), tx);
    expect(bundleRepo.findById).toHaveBeenCalledWith('b1', 's1', tx);
  });

  it('update runs inside withTenant(storeId) and threads tx (no items path)', async () => {
    await bundleService.update('b1', 's1', { name: 'B2' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findById).toHaveBeenCalledWith('b1', 's1', tx);
    expect(bundleRepo.updateBundle).toHaveBeenCalledWith('b1', 's1', expect.any(Object), tx);
  });

  it('delete runs inside withTenant(storeId) and threads tx into both lookup and deletes', async () => {
    await bundleService.delete('b1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(bundleRepo.findById).toHaveBeenCalledWith('b1', 's1', tx);
    expect(bundleRepo.deleteBundleItemsByBundleId).toHaveBeenCalledWith('b1', 's1', tx);
    expect(bundleRepo.deleteBundle).toHaveBeenCalledWith('b1', 's1', tx);
  });
});