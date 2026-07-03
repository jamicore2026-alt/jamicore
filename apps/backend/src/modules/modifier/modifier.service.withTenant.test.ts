/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies modifierService wraps every entry in withTenant(storeId, fn) and
// threads the tx into the modifier repo (RLS Phase 1, Approach A).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  // Run fn with a sentinel tx so we can assert the repo received it.
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const repoMock = vi.hoisted(() => ({
  findGroupsByStoreId: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  findGroupById: vi.fn().mockResolvedValue({ id: 'g1', storeId: 's1' }),
  findGroupsByProductId: vi.fn().mockResolvedValue([]),
  insertGroup: vi.fn().mockResolvedValue({ id: 'g1', storeId: 's1' }),
  updateGroup: vi.fn().mockResolvedValue({ id: 'g1', storeId: 's1' }),
  deleteGroup: vi.fn().mockResolvedValue({ id: 'g1', storeId: 's1' }),
  findOptionById: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1' }),
  insertOption: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1' }),
  updateOption: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1' }),
  deleteOption: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1' }),
}));
vi.mock('./modifier.repo.js', () => repoMock);

import { modifierService } from './modifier.service.js';

const tx = expect.objectContaining({ __sentinel: 'tx' });

describe('modifierService wraps modifier work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByStoreId runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.findByStoreId('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.findGroupsByStoreId).toHaveBeenCalledWith('s1', undefined, tx);
  });

  it('findById runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.findById('g1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.findGroupById).toHaveBeenCalledWith('g1', 's1', tx);
  });

  it('findByProductId runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.findByProductId('p1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.findGroupsByProductId).toHaveBeenCalledWith('p1', 's1', 50, tx);
  });

  it('create runs inside withTenant(data.storeId) and threads tx', async () => {
    await modifierService.create({ storeId: 's1', name: 'G' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.insertGroup).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), tx);
  });

  it('update runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.update('g1', 's1', { name: 'X' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.updateGroup).toHaveBeenCalledWith('g1', 's1', { name: 'X' }, tx);
  });

  it('delete runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.delete('g1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.deleteGroup).toHaveBeenCalledWith('g1', 's1', tx);
  });

  it('findOptionById runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.findOptionById('o1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.findOptionById).toHaveBeenCalledWith('o1', 's1', tx);
  });

  it('createOption runs inside withTenant(data.storeId) and threads tx', async () => {
    await modifierService.createOption({ storeId: 's1', modifierGroupId: 'g1', nameEn: 'O' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.insertOption).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), tx);
  });

  it('updateOption runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.updateOption('o1', 's1', { nameEn: 'X' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.updateOption).toHaveBeenCalledWith('o1', 's1', { nameEn: 'X' }, tx);
  });

  it('deleteOption runs inside withTenant(storeId) and threads tx', async () => {
    await modifierService.deleteOption('o1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repoMock.deleteOption).toHaveBeenCalledWith('o1', 's1', tx);
  });
});