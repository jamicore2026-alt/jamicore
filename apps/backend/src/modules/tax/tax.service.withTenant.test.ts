/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies taxService wraps every entry in withTenant(storeId, fn) and
// threads the tx into taxRepo (RLS Phase 1, Approach A).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock, taxRepo } = vi.hoisted(() => ({
  withTenantMock: vi.fn(),
  taxRepo: {
    insertRate: vi.fn().mockResolvedValue({ id: 't1', storeId: 's1' }),
    findRatesByStoreId: vi.fn().mockResolvedValue([]),
    findRateById: vi.fn().mockResolvedValue(undefined),
    updateRate: vi.fn().mockResolvedValue(undefined),
    deleteRateById: vi.fn().mockResolvedValue([{ id: 't1' }]),
    findActiveRatesByStoreId: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn({ __sentinel: 'tx' });
  },
}));

vi.mock('../../services/cache.service.js', () => ({
  getCacheService: () => ({
    wrap: (_key: string, fn: () => unknown) => fn(),
    delete: () => {},
  }),
}));

vi.mock('./tax.repo.js', () => taxRepo);

import { taxService } from './tax.service.js';

const tx = expect.objectContaining({ __sentinel: 'tx' });

describe('taxService wraps tax work in withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createRate runs inside withTenant(storeId) and threads tx into insertRate', async () => {
    await taxService.createRate('s1', { name: 'VAT', rate: '0.20' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(taxRepo.insertRate).toHaveBeenCalledWith('s1', expect.objectContaining({ name: 'VAT', rate: '0.20' }), tx);
  });

  it('listRates runs inside withTenant(storeId) and threads tx into findRatesByStoreId', async () => {
    await taxService.listRates('s1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(taxRepo.findRatesByStoreId).toHaveBeenCalledWith('s1', tx);
  });

  it('getRate runs inside withTenant(storeId) and threads tx into findRateById', async () => {
    taxRepo.findRateById.mockResolvedValueOnce({ id: 't1', storeId: 's1' });
    await taxService.getRate('t1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(taxRepo.findRateById).toHaveBeenCalledWith('t1', 's1', tx);
  });

  it('updateRate runs inside withTenant(storeId) and threads tx into repo.updateRate', async () => {
    taxRepo.updateRate.mockResolvedValueOnce({ id: 't1', storeId: 's1' });
    await taxService.updateRate('t1', 's1', { name: 'X' });
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(taxRepo.updateRate).toHaveBeenCalledWith('t1', 's1', { name: 'X' }, tx);
  });

  it('deleteRate runs inside withTenant(storeId) and threads tx into deleteRateById', async () => {
    await taxService.deleteRate('t1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(taxRepo.deleteRateById).toHaveBeenCalledWith('t1', 's1', tx);
  });

  it('calculateTax runs inside withTenant(storeId) and threads tx into findActiveRatesByStoreId', async () => {
    taxRepo.findActiveRatesByStoreId.mockResolvedValueOnce([
      { name: 'G', rate: '0.05', country: null, state: null, postalCode: null, isCompound: false, priority: 1 },
    ]);
    await taxService.calculateTax('s1', { country: 'US' }, '100.00', '0.00');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(taxRepo.findActiveRatesByStoreId).toHaveBeenCalledWith('s1', tx);
  });
});