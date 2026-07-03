/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies categoryService wraps every entry in withTenant(storeId, fn) and
// threads the tx into categoryRepo (RLS Phase 1, Approach A).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with a sentinel tx so we can assert categoryRepo received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const { categoryRepo } = vi.hoisted(() => ({
  categoryRepo: {
    findManyByStoreId: vi.fn().mockResolvedValue([]),
    countByStoreId: vi.fn().mockResolvedValue([{ count: 0 }]),
    findById: vi.fn().mockResolvedValue({ id: 'c1', storeId: 's1', subcategories: [] }),
    create: vi.fn().mockResolvedValue([{ id: 'c1', storeId: 's1' }]),
    update: vi.fn().mockResolvedValue([{ id: 'c1', storeId: 's1' }]),
    delete: vi.fn().mockResolvedValue([{ id: 'c1', storeId: 's1' }]),
    createSubcategory: vi.fn().mockResolvedValue([{ id: 'sc1', storeId: 's1' }]),
    updateSubcategory: vi.fn().mockResolvedValue([{ id: 'sc1', storeId: 's1' }]),
    deleteSubcategory: vi.fn().mockResolvedValue([{ id: 'sc1', storeId: 's1' }]),
  },
}));
vi.mock('./category.repo.js', () => ({ categoryRepo }));

import { categoryService } from './category.service.js';

const tx = expect.objectContaining({ __sentinel: 'tx' });

describe('categoryService wraps category work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByStoreId runs inside withTenant(storeId) and threads tx into both repo reads', async () => {
    await categoryService.findByStoreId('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.findManyByStoreId).toHaveBeenCalledWith('s1', undefined, tx);
    expect(categoryRepo.countByStoreId).toHaveBeenCalledWith('s1', tx);
  });

  it('findById runs inside withTenant(storeId) and threads tx', async () => {
    await categoryService.findById('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.findById).toHaveBeenCalledWith('c1', 's1', tx);
  });

  it('create runs inside withTenant(data.storeId) and threads tx', async () => {
    await categoryService.create({ storeId: 's1', nameEn: 'Cat' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.create).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), tx);
  });

  it('update runs inside withTenant(storeId) and threads tx', async () => {
    await categoryService.update('c1', 's1', { nameEn: 'X' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.update).toHaveBeenCalledWith('c1', 's1', { nameEn: 'X' }, tx);
  });

  it('delete runs inside withTenant(storeId) and threads tx', async () => {
    await categoryService.delete('c1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.delete).toHaveBeenCalledWith('c1', 's1', tx);
  });

  it('createSubcategory runs inside withTenant(data.storeId) and threads tx', async () => {
    await categoryService.createSubcategory({ storeId: 's1', categoryId: 'c1', nameEn: 'Sub' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.createSubcategory).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), tx);
  });

  it('updateSubcategory runs inside withTenant(storeId) and threads tx', async () => {
    await categoryService.updateSubcategory('sc1', 's1', { nameEn: 'X' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.updateSubcategory).toHaveBeenCalledWith('sc1', 's1', { nameEn: 'X' }, tx);
  });

  it('deleteSubcategory runs inside withTenant(storeId) and threads tx', async () => {
    await categoryService.deleteSubcategory('sc1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(categoryRepo.deleteSubcategory).toHaveBeenCalledWith('sc1', 's1', tx);
  });
});