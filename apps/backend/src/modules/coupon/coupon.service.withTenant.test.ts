// Verifies couponService wraps all coupon DB work in withTenant(storeId, fn)
// (RLS Phase 1 prep). The validateCoupon wrap is the regression guard for the
// pricing-path zero-out risk (pricing.service calls validateCoupon pre-checkout).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

const { repo } = vi.hoisted(() => ({
  repo: {
    findManyByStoreId: vi.fn().mockResolvedValue([]),
    countByStoreId: vi.fn().mockResolvedValue([{ count: 0 }]),
    findById: vi.fn().mockResolvedValue({ id: 'cp1', storeId: 's1', code: 'SAVE10', type: 'fixed', value: '5', isActive: true, usageCount: 0, usageLimitPerCustomer: 1 }),
    findByCode: vi.fn().mockResolvedValue({ id: 'cp1', storeId: 's1', code: 'SAVE10', type: 'fixed', value: '5', isActive: true, usageCount: 0, usageLimitPerCustomer: 1 }),
    create: vi.fn().mockResolvedValue([{ id: 'cp1', storeId: 's1', code: 'SAVE10' }]),
    update: vi.fn().mockResolvedValue([{ id: 'cp1', storeId: 's1' }]),
    deleteById: vi.fn().mockResolvedValue(undefined),
    countCustomerUsages: vi.fn().mockResolvedValue(0),
  },
}));
vi.mock('./coupon.repo.js', () => ({ couponRepo: repo }));

import { couponService } from './coupon.service.js';

describe('coupon.service wraps coupon work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByStoreId runs inside withTenant(storeId) and threads tx', async () => {
    await couponService.findByStoreId('s1', { page: 1, limit: 10 });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findManyByStoreId).toHaveBeenCalledWith('s1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('findById runs inside withTenant(storeId)', async () => {
    await couponService.findById('cp1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findById).toHaveBeenCalledWith('cp1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('findByCode runs inside withTenant(storeId)', async () => {
    await couponService.findByCode('SAVE10', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
  });

  it('create runs inside withTenant(storeId) and threads tx to create + dup-check', async () => {
    repo.findByCode.mockResolvedValueOnce(undefined);
    await couponService.create({ storeId: 's1', code: 'NEW', type: 'fixed', value: '5' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('update runs inside withTenant(storeId)', async () => {
    await couponService.update('cp1', 's1', { description: 'd' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.update).toHaveBeenCalledWith('cp1', 's1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('delete runs inside withTenant(storeId)', async () => {
    await couponService.delete('cp1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.deleteById).toHaveBeenCalledWith('cp1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('validateCoupon runs inside withTenant(storeId) — the pricing-path regression guard', async () => {
    await couponService.validateCoupon('SAVE10', 's1', '100.00', 'cust-1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(repo.findByCode).toHaveBeenCalledWith('SAVE10', 's1', expect.objectContaining({ __sentinel: 'tx' }));
    expect(repo.countCustomerUsages).toHaveBeenCalledWith('cp1', 'cust-1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('calculateDiscount does NOT open a withTenant (pure CPU)', async () => {
    await couponService.calculateDiscount({ id: 'cp1', storeId: 's1', code: 'SAVE10', type: 'fixed', value: '5', isActive: true, usageCount: 0, usageLimitPerCustomer: 1 } as never, '100.00');
    expect(withTenantMock).not.toHaveBeenCalled();
  });
});