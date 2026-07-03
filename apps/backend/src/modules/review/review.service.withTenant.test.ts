/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies reviewService wraps every entry in withTenant(storeId, fn) and
// threads the tx into reviewRepo (RLS Phase 1, Approach A).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock, reviewRepo } = vi.hoisted(() => ({
  withTenantMock: vi.fn(),
  reviewRepo: {
    findManyByProductId: vi.fn().mockResolvedValue([]),
    countByProductId: vi.fn().mockResolvedValue([{ count: 0 }]),
    findManyByStoreId: vi.fn().mockResolvedValue([]),
    countByStoreId: vi.fn().mockResolvedValue([{ count: 0 }]),
    findById: vi.fn().mockResolvedValue(undefined),
    findByIdBasic: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue([{ id: 'r1', storeId: 's1' }]),
    update: vi.fn().mockResolvedValue([{ id: 'r1', storeId: 's1' }]),
    deleteById: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

vi.mock('./review.repo.js', () => ({ reviewRepo }));

import { reviewService } from './review.service.js';

const tx = expect.objectContaining({ __sentinel: 'tx' });

describe('reviewService wraps review work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByProductId runs inside withTenant(storeId) and threads tx into both repo reads', async () => {
    await reviewService.findByProductId('p1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(reviewRepo.findManyByProductId).toHaveBeenCalledWith('p1', 's1', { limit: 20, offset: 0 }, tx);
    expect(reviewRepo.countByProductId).toHaveBeenCalledWith('p1', 's1', tx);
  });

  it('findByStoreId runs inside withTenant(storeId) and threads tx into both repo reads', async () => {
    await reviewService.findByStoreId('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(reviewRepo.findManyByStoreId).toHaveBeenCalledWith('s1', { limit: 20, offset: 0 }, tx);
    expect(reviewRepo.countByStoreId).toHaveBeenCalledWith('s1', tx);
  });

  it('findById runs inside withTenant(storeId) and threads tx', async () => {
    reviewRepo.findById.mockResolvedValueOnce({ id: 'r1', storeId: 's1', customerId: 'c1' });
    await reviewService.findById('r1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(reviewRepo.findById).toHaveBeenCalledWith('r1', 's1', tx);
  });

  it('create runs inside withTenant(data.storeId) and threads tx into repo.create', async () => {
    await reviewService.create({ storeId: 's1', productId: 'p1', rating: 5, content: 'good' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(reviewRepo.create).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1', productId: 'p1' }), tx);
  });

  it('update runs inside withTenant(storeId) and threads tx into findByIdBasic + update', async () => {
    reviewRepo.findByIdBasic.mockResolvedValueOnce({ id: 'r1', storeId: 's1' });
    await reviewService.update('r1', 's1', { content: 'x' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(reviewRepo.findByIdBasic).toHaveBeenCalledWith('r1', 's1', tx);
    expect(reviewRepo.update).toHaveBeenCalledWith('r1', 's1', expect.objectContaining({ content: 'x' }), tx);
  });

  it('delete runs inside withTenant(storeId) and threads tx into findByIdBasic + deleteById', async () => {
    reviewRepo.findByIdBasic.mockResolvedValueOnce({ id: 'r1', storeId: 's1' });
    await reviewService.delete('r1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(reviewRepo.findByIdBasic).toHaveBeenCalledWith('r1', 's1', tx);
    expect(reviewRepo.deleteById).toHaveBeenCalledWith('r1', 's1', tx);
  });
});